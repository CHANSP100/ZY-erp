import fs from 'fs';
import path from 'path';

const projectRoot = 'C:/Users/admin/Desktop/cursor';
const scan = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-scan-files.json'), 'utf8'));
const imports = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-import-map-output.json'), 'utf8'));

const langs = Object.keys(scan.stats.byLanguage).sort();
const result = {
  name: 'sunlike-erp-refactor',
  description: 'SUNLIKE 9.0 legacy ERP (Delphi + SQL Server) incremental web refactor project. Includes analysis docs, field mapping specs, and erp-new prototype (Express + SQLite backend, Vue/React frontend). Note: this project has over 100 source files; consider scoping analysis to a subdirectory for faster results.',
  languages: langs,
  frameworks: ['Express', 'Vue', 'React', 'Vite', 'Element Plus', 'Ant Design', 'SQLite'],
  files: scan.files,
  totalFiles: scan.totalFiles,
  filteredByIgnore: scan.filteredByIgnore,
  estimatedComplexity: scan.estimatedComplexity,
  importMap: imports.importMap,
};

const outDir = path.join(projectRoot, '.understand-anything/intermediate');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'scan-result.json'), JSON.stringify(result, null, 2));
console.log('scan-result.json written:', result.totalFiles, 'files');
