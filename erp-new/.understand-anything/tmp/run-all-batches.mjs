import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const projectRoot = 'C:/Users/admin/Desktop/cursor/erp-new';
const pluginRoot =
  'C:/Users/admin/.cursor/plugins/cache/understand-anything/understand-anything/26edf61856fa476e466bda1814819a266a293c47';
const skillDir = path.join(pluginRoot, 'skills/understand');
const extractScript = path.join(skillDir, 'extract-structure.mjs');
const batches = JSON.parse(
  fs.readFileSync(path.join(projectRoot, '.understand-anything/intermediate/batches.json'), 'utf8')
).batches;

const categoryToType = {
  code: 'file',
  config: 'config',
  docs: 'document',
  infra: 'service',
  data: 'schema',
  script: 'file',
  markup: 'file',
};

function basename(p) {
  return p.split('/').pop() || p;
}

function complexityFromMetrics(m = {}) {
  const score =
    (m.functionCount || 0) + (m.classCount || 0) * 2 + (m.importCount || 0);
  if (score > 15) return 'complex';
  if (score > 6) return 'moderate';
  return 'simple';
}

function tagsForFile(file, result) {
  const tags = new Set();
  const name = basename(file.path).toLowerCase();
  if (file.fileCategory === 'docs') tags.add('documentation');
  if (file.fileCategory === 'config') tags.add('configuration');
  if (file.fileCategory === 'infra') tags.add('infrastructure');
  if (name.includes('test') || name.includes('spec')) tags.add('test');
  if (name === 'index.ts' || name === 'index.js' || name === 'main.ts' || name === 'main.tsx')
    tags.add('entry-point');
  if ((result?.exports?.length || 0) > 3 && (result?.functions?.length || 0) <= 2)
    tags.add('barrel');
  if (file.path.includes('/views/')) tags.add('component');
  if (file.path.includes('/components/')) tags.add('component');
  if (file.path.includes('server/') && name.endsWith('routes.js')) tags.add('api-handler');
  if (file.path.includes('server/')) tags.add('service');
  if (tags.size === 0) tags.add('module');
  return [...tags].slice(0, 5);
}

function summaryForFile(file, result) {
  const name = basename(file.path);
  const fn = result?.functions?.length || 0;
  const cls = result?.classes?.length || 0;
  const exp = result?.exports?.length || 0;
  if (file.fileCategory === 'docs')
    return `Documentation file ${name} for the ERP prototype project.`;
  if (file.fileCategory === 'config')
    return `Configuration file ${name} defining build/runtime settings.`;
  if (fn || cls)
    return `${name} with ${fn} function(s) and ${cls} class(es); exports ${exp} symbol(s).`;
  return `Source file ${name} in the ${file.path.split('/')[0]} area of erp-new.`;
}

function buildGraphFromBatch(batch, extract) {
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();

  const addNode = (node) => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };

  for (const file of batch.files) {
    const result = extract.results?.find((r) => r.path === file.path);
    const prefix = categoryToType[file.fileCategory] || 'file';
    const fileId = `${prefix}:${file.path}`;

    addNode({
      id: fileId,
      type: prefix,
      name: basename(file.path),
      filePath: file.path,
      summary: summaryForFile(file, result),
      tags: tagsForFile(file, result),
      complexity: complexityFromMetrics(result?.metrics),
    });

    const imports = batch.batchImportData[file.path] || [];
    for (const imp of imports) {
      const targetPrefix = imp.endsWith('.json') || imp.includes('package.json') ? 'config' : 'file';
      edges.push({
        source: fileId,
        target: `${targetPrefix}:${imp}`,
        type: 'imports',
        direction: 'forward',
        weight: 0.7,
      });
    }

    if (!result) continue;

    for (const fn of result.functions || []) {
      const lines = (fn.endLine || 0) - (fn.startLine || 0) + 1;
      const exported = (result.exports || []).some((e) => e.name === fn.name);
      if (!exported && lines < 10) continue;
      const fnId = `function:${file.path}:${fn.name}`;
      addNode({
        id: fnId,
        type: 'function',
        name: fn.name,
        filePath: file.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: `Function ${fn.name} defined in ${basename(file.path)}.`,
        tags: ['utility'],
        complexity: lines > 40 ? 'complex' : lines > 15 ? 'moderate' : 'simple',
      });
      edges.push({ source: fileId, target: fnId, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exported)
        edges.push({ source: fileId, target: fnId, type: 'exports', direction: 'forward', weight: 0.8 });
    }

    for (const cls of result.classes || []) {
      const lines = (cls.endLine || 0) - (cls.startLine || 0) + 1;
      const methods = cls.methods?.length || 0;
      const exported = (result.exports || []).some((e) => e.name === cls.name);
      if (!exported && methods < 2 && lines < 20) continue;
      const clsId = `class:${file.path}:${cls.name}`;
      addNode({
        id: clsId,
        type: 'class',
        name: cls.name,
        filePath: file.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: `Class ${cls.name} with ${methods} method(s) in ${basename(file.path)}.`,
        tags: ['data-model'],
        complexity: lines > 80 ? 'complex' : lines > 30 ? 'moderate' : 'simple',
      });
      edges.push({ source: fileId, target: clsId, type: 'contains', direction: 'forward', weight: 1.0 });
      if (exported)
        edges.push({ source: fileId, target: clsId, type: 'exports', direction: 'forward', weight: 0.8 });
    }
  }

  return { nodes, edges };
}

for (const batch of batches) {
  const idx = batch.batchIndex;
  const inputPath = path.join(projectRoot, `.understand-anything/tmp/ua-file-analyzer-input-${idx}.json`);
  const extractPath = path.join(projectRoot, `.understand-anything/tmp/ua-file-extract-results-${idx}.json`);
  const outputPath = path.join(projectRoot, `.understand-anything/intermediate/batch-${idx}.json`);

  fs.writeFileSync(
    inputPath,
    JSON.stringify(
      { projectRoot, batchFiles: batch.files, batchImportData: batch.batchImportData },
      null,
      2
    )
  );

  const run = spawnSync('node', [extractScript, inputPath, extractPath], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (run.status !== 0) {
    console.error(`Batch ${idx} extract failed:`, run.stderr || run.stdout);
    process.exit(1);
  }

  const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'));
  const graph = buildGraphFromBatch(batch, extract);
  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`Batch ${idx}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
}

console.log('All batches processed.');
