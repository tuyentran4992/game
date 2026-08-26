import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

const distDir = path.resolve(import.meta.dirname, '../dist');
const buildDir = path.resolve(import.meta.dirname, '../../build');
const outZip = path.resolve(buildDir, 'juicy-merge-playgama.zip');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ does not exist. Run npm run build:web first.');
  process.exit(1);
}

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

const output = fs.createWriteStream(outZip);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✅ Playgama bundle created: ${outZip} (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add index.html, playgama-bridge-config.json, assets/, raw/
archive.file(path.join(distDir, 'index.html'), { name: 'index.html' });
if (fs.existsSync(path.join(distDir, 'playgama-bridge-config.json'))) {
  archive.file(path.join(distDir, 'playgama-bridge-config.json'), { name: 'playgama-bridge-config.json' });
}
if (fs.existsSync(path.join(distDir, 'assets'))) {
  archive.directory(path.join(distDir, 'assets'), 'assets');
}
if (fs.existsSync(path.join(distDir, 'raw'))) {
  archive.directory(path.join(distDir, 'raw'), 'raw');
}

await archive.finalize();
