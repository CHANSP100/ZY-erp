import fs from 'fs';
import path from 'path';

const projectRoot = 'C:/Users/admin/Desktop/cursor/erp-new';
const scan = JSON.parse(fs.readFileSync(path.join(projectRoot, '.understand-anything/tmp/ua-scan-files.json'), 'utf8'));
fs.writeFileSync(
  path.join(projectRoot, '.understand-anything/tmp/ua-import-map-input.json'),
  JSON.stringify({ projectRoot, files: scan.files }, null, 2)
);
