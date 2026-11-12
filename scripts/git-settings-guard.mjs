import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const evidenceRoot = path.resolve(root, '.runs');
const protectedFiles = [
  ['user', path.join(os.homedir(), '.gitconfig')],
  ['xdg', path.join(os.homedir(), '.config/git/config')],
  ['system', path.join(process.env.ProgramFiles || 'C:/Program Files', 'Git/etc/gitconfig')],
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function snapshot() {
  return protectedFiles.map(([id, file]) => {
    try {
      const stat = fs.lstatSync(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw Error('Unsafe Git config path');
      const bytes = fs.readFileSync(file);
      return { id, exists: true, bytes: bytes.length, sha256: hash(bytes) };
    } catch (error) { if (error.code === 'ENOENT') return { id, exists: false }; throw error; }
  });
}
const [mode, input, ...extra] = process.argv.slice(2);
if (!['capture', 'verify'].includes(mode) || !input || extra.length) throw Error('Usage: node scripts/git-settings-guard.mjs capture|verify .runs/<task>.json');
const target = path.resolve(input);
if (!target.startsWith(evidenceRoot + path.sep) || path.extname(target) !== '.json') throw Error('Evidence must be JSON inside this repo .runs');
function checkEvidencePath() {
for (let current = target; ; current = path.dirname(current)) {
  try {
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (current === target && (!stat.isFile() || stat.nlink !== 1)) || (current !== target && !stat.isDirectory())) throw Error('Unsafe evidence path');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (current === path.dirname(current)) break;
}
}
checkEvidencePath();
const files = snapshot();
if (mode === 'capture') {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  checkEvidencePath();
  fs.writeFileSync(target, JSON.stringify({ schemaVersion: 1, scope: 'Known Git config file fingerprints only; no credential-store access', files }, null, 2), { flag: 'wx' });
  console.log('PASS captured Git config fingerprints; values not printed');
} else {
  const baseline = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (baseline.schemaVersion !== 1 || JSON.stringify(baseline.files) !== JSON.stringify(files)) throw Error('Git settings drift: STOP; preserve evidence; do not guess restoration');
  console.log('PASS unchanged Git config fingerprints');
}
