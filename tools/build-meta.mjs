// Keeps the generated parts of the app in sync with its files:
//   - the list of files the service worker stores for offline use (sw.js FILES)
//   - the modulepreload links in index.html, so all modules load in parallel at start
//   - the cache name in sw.js, derived from the content of all app files (a new name makes installed apps update)
//   - the version shown in the settings (assets/js/version.js, only with --bump)
//
//   node tools/build-meta.mjs --write [--bump]   used by the pre-commit hook, stages what it changes
//   node tools/build-meta.mjs --check            used by CI, fails if anything is out of date
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = ['index.html', 'manifest.webmanifest', 'assets'];
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const read = f => readFileSync(join(ROOT, f), 'utf8');

const args = new Set(process.argv.slice(2));
const write = args.has('--write'), check = args.has('--check');
if (write === check) {
  console.error('usage: build-meta.mjs --write [--bump] | --check');
  process.exit(2);
}

const files = git('ls-files', '--', ...APP).split('\n').filter(Boolean).sort();
const modules = files.filter(f => f.startsWith('assets/js/') && f.endsWith('.js'));

function withBlock(text, start, end, body, file) {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`${file}: markers ${start} … ${end} missing`);
  return text.slice(0, a + start.length) + body + text.slice(b);
}

const indent = '  ';
const expectedIndex = withBlock(read('index.html'), '<!-- modules:start -->', '<!-- modules:end -->',
  '\n' + modules.map(m => `${indent}<link rel="modulepreload" href="${m}">`).join('\n') + `\n${indent}`, 'index.html');

const fileList = sw => withBlock(sw, '// files:start', '// files:end',
  '\n' + ['./', ...files].map(f => `  '${f}',`).join('\n') + '\n  ', 'sw.js');

// The cache name hashes the staged content of all app files (sw.js itself is not part of it).
const cacheName = () => 'clockwise-' + execFileSync('git', ['hash-object', '--stdin'], { cwd: ROOT, input: git('ls-files', '-s', '--', ...APP), encoding: 'utf8' }).trim().slice(0, 10);
const withCache = sw => sw.replace(/^const CACHE = '.*';$/m, `const CACHE = '${cacheName()}';`);

if (check) {
  const problems = [];
  if (read('index.html') !== expectedIndex) problems.push('index.html: modulepreload list is out of date');
  const sw = read('sw.js');
  if (fileList(sw) !== sw) problems.push('sw.js: FILES list is out of date');
  if (withCache(sw) !== sw) problems.push(`sw.js: CACHE should be '${cacheName()}' – installed apps would not update`);
  if (problems.length) {
    console.error(problems.join('\n') + '\nRun: node tools/build-meta.mjs --write  (or install the hook: npm install)');
    process.exit(1);
  }
  console.log('app metadata up to date');
} else {
  const changed = [];
  if (args.has('--bump')) {
    const count = Number(git('rev-list', '--count', 'HEAD').trim() || 0) + 1;
    writeFileSync(join(ROOT, 'assets/js/version.js'), `export const VERSION = '1.${count}';\n`);
    changed.push('assets/js/version.js');
  }
  if (read('index.html') !== expectedIndex) { writeFileSync(join(ROOT, 'index.html'), expectedIndex); changed.push('index.html'); }
  if (changed.length) git('add', '--', ...changed);
  let sw = read('sw.js');
  sw = withCache(fileList(sw));
  if (sw !== read('sw.js')) writeFileSync(join(ROOT, 'sw.js'), sw);
  git('add', '--', 'sw.js');
}
