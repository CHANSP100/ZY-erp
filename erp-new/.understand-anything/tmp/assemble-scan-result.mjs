import fs from 'fs';
import path from 'path';

const projectRoot = 'C:/Users/admin/Desktop/cursor/erp-new';
const scan = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-scan-files.json'), 'utf8'));
const imports = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-import-map-output.json'), 'utf8'));

const result = {
  name: 'erp-new',
  description:
    'SUNLIKE 9.0 ERP web prototype: Express + SQLite backend (server/), Vue 3 + Element Plus frontend (client-vue/), and legacy React exploration code (client/). Note: this project has over 100 source files; consider scoping analysis to a subdirectory for faster results.',
  languages: Object.keys(scan.stats.byLanguage).sort(),
  frameworks: ['Express', 'Vue', 'Element Plus', 'Vite', 'React', 'Ant Design', 'SQLite'],
  files: scan.files,
  totalFiles: scan.totalFiles,
  filteredByIgnore: scan.filteredByIgnore,
  estimatedComplexity: scan.estimatedComplexity,
  importMap: imports.importMap,
};

const outDir = path.join(projectRoot, '.understand-anything/intermediate');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'scan-result.json'), JSON.stringify(result, null, 2));
console.log('scan-result:', result.totalFiles, 'files, complexity:', result.estimatedComplexity);
