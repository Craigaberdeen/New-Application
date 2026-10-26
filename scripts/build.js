const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public');
for (const file of ['index.html', 'app.js', 'style.css']) {
  if (!fs.statSync(path.join(source, file)).isFile()) throw new Error(`Missing ${file}`);
}
execFileSync(process.execPath, ['--check', path.join(source, 'app.js')], { stdio: 'inherit' });
fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true });
fs.cpSync(source, path.join(root, 'dist'), { recursive: true });
console.log('Built browser application in dist/');
