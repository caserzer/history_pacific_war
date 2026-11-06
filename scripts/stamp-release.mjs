import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: root, encoding: 'utf8', windowsHide: true,
}).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Release requires an exact Git commit');
if (!fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('Build the site before stamping a release');
const stamp = { commit, builtAt: new Date().toISOString(), repository: 'caserzer/history_pacific_war' };
fs.writeFileSync(path.join(root, 'dist/build-info.json'), JSON.stringify(stamp, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'dist/.nojekyll'), '');
console.log(`Release artifact stamped: ${commit}`);
