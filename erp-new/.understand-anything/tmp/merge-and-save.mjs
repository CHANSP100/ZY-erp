import fs from 'fs';
import path from 'path';

const projectRoot = 'C:/Users/admin/Desktop/cursor/erp-new';
const interDir = path.join(projectRoot, '.understand-anything/intermediate');
const scan = JSON.parse(fs.readFileSync(path.join(interDir, 'scan-result.json'), 'utf8'));

const batchFiles = fs
  .readdirSync(interDir)
  .filter((f) => /^batch-\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

const nodes = new Map();
const edges = new Map();

for (const file of batchFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(interDir, file), 'utf8'));
  for (const n of data.nodes || []) nodes.set(n.id, n);
  for (const e of data.edges || []) {
    const key = `${e.source}|${e.target}|${e.type}`;
    edges.set(key, e);
  }
}

const nodeIds = new Set(nodes.keys());
const cleanEdges = [...edges.values()].filter(
  (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
);

// Recover missing import edges from scan importMap
for (const [from, targets] of Object.entries(scan.importMap || {})) {
  const sourcePrefix = from.endsWith('.json') ? 'config' : 'file';
  const sourceId = `${sourcePrefix}:${from}`;
  if (!nodes.has(sourceId)) continue;
  for (const to of targets) {
    const targetPrefix = to.endsWith('.json') ? 'config' : 'file';
    const targetId = `${targetPrefix}:${to}`;
    const key = `${sourceId}|${targetId}|imports`;
    if (!edges.has(key)) {
      cleanEdges.push({
        source: sourceId,
        target: targetId,
        type: 'imports',
        direction: 'forward',
        weight: 0.7,
      });
    }
  }
}

const fileLevelTypes = new Set([
  'file',
  'config',
  'document',
  'service',
  'pipeline',
  'table',
  'schema',
  'resource',
  'endpoint',
]);

const fileNodes = [...nodes.values()].filter((n) => fileLevelTypes.has(n.type));

function layerForPath(p) {
  if (p.startsWith('client-vue/src/views/')) return 'views';
  if (p.startsWith('client-vue/src/components/')) return 'components';
  if (p.startsWith('client-vue/src/config/')) return 'config-fields';
  if (p.startsWith('client-vue/src/api/')) return 'api-client';
  if (p.startsWith('client-vue/')) return 'frontend-vue';
  if (p.startsWith('client/src/')) return 'frontend-react';
  if (p.startsWith('server/routes/') || p.includes('Routes.js')) return 'api-server';
  if (p.startsWith('server/')) return 'backend';
  if (p.startsWith('docs/')) return 'docs';
  return 'misc';
}

const layerDefs = {
  'frontend-vue': {
    id: 'layer:frontend-vue',
    name: 'Vue Frontend (client-vue)',
    description: 'Vue 3 + Element Plus formal UI pages, components, and config.',
  },
  components: {
    id: 'layer:erp-components',
    name: 'ERP UI Components',
    description: 'Reusable Erp* layout and form components.',
  },
  views: {
    id: 'layer:views',
    name: 'Menu Views',
    description: 'Per-menu list/form pages mapped to SUNLIKE menus.',
  },
  'config-fields': {
    id: 'layer:config-fields',
    name: 'Field Configuration',
    description: 'Field definitions and lookup configs under client-vue/src/config.',
  },
  'api-client': {
    id: 'layer:api-client',
    name: 'API Client',
    description: 'HTTP client and shared API types.',
  },
  'frontend-react': {
    id: 'layer:frontend-react',
    name: 'React Prototype (legacy)',
    description: 'Exploration React client kept for reference.',
  },
  'api-server': {
    id: 'layer:api-server',
    name: 'Express Routes',
    description: 'REST route handlers for ERP menus.',
  },
  backend: {
    id: 'layer:backend',
    name: 'Backend Core',
    description: 'Server entry, SQLite data, utilities, and business logic.',
  },
  docs: {
    id: 'layer:docs',
    name: 'Documentation',
    description: 'Project docs and feature specifications.',
  },
  misc: {
    id: 'layer:misc',
    name: 'Miscellaneous',
    description: 'Root configs, scripts, and other supporting files.',
  },
};

const layerBuckets = Object.fromEntries(Object.keys(layerDefs).map((k) => [k, []]));
for (const n of fileNodes) {
  const key = layerForPath(n.filePath || n.id.replace(/^[^:]+:/, ''));
  layerBuckets[key].push(n.id);
}

const layers = Object.entries(layerBuckets)
  .filter(([, ids]) => ids.length > 0)
  .map(([key, nodeIds]) => ({
    ...layerDefs[key],
    nodeIds,
  }));

const tour = [
  {
    order: 1,
    title: 'Project Overview',
    description: 'Start with README to understand erp-new structure: server, client-vue, and legacy client.',
    nodeIds: ['document:README.md'].filter((id) => nodeIds.has(id)),
  },
  {
    order: 2,
    title: 'Backend Entry',
    description: 'Express server bootstraps SQLite and mounts route modules.',
    nodeIds: ['file:server/index.js'].filter((id) => nodeIds.has(id)),
  },
  {
    order: 3,
    title: 'Vue App Entry',
    description: 'Vue 3 app mounts routes and ERP shell layout.',
    nodeIds: ['file:client-vue/src/main.ts', 'file:client-vue/src/App.vue'].filter((id) =>
      nodeIds.has(id)
    ),
  },
  {
    order: 4,
    title: 'ERP Component Library',
    description: 'Shared ErpBillPage, ErpListPage, and lookup components.',
    nodeIds: ['file:client-vue/src/components/erp/index.ts'].filter((id) => nodeIds.has(id)),
  },
  {
    order: 5,
    title: 'Field Configuration',
    description: 'Per-menu field configs drive forms and grids.',
    nodeIds: ['file:client-vue/src/config/fields/index.ts'].filter((id) => nodeIds.has(id)),
  },
].filter((s) => s.nodeIds.length > 0);

const graph = {
  version: '1.0.0',
  project: {
    name: scan.name,
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: scan.description,
    analyzedAt: new Date().toISOString(),
    gitCommitHash: 'no-commit',
  },
  nodes: [...nodes.values()],
  edges: cleanEdges,
  layers,
  tour,
};

fs.writeFileSync(path.join(interDir, 'assembled-graph.json'), JSON.stringify(graph, null, 2));
fs.writeFileSync(path.join(projectRoot, '.understand-anything/knowledge-graph.json'), JSON.stringify(graph, null, 2));

const meta = {
  lastAnalyzedAt: graph.project.analyzedAt,
  gitCommitHash: 'no-commit',
  version: '1.0.0',
  analyzedFiles: scan.totalFiles,
};
fs.writeFileSync(path.join(projectRoot, '.understand-anything/meta.json'), JSON.stringify(meta, null, 2));

console.log(
  JSON.stringify({
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    layers: graph.layers.length,
    tourSteps: graph.tour.length,
    output: path.join(projectRoot, '.understand-anything/knowledge-graph.json'),
  })
);
