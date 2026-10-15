// Builds the static showcase (website + request check + Demo Mode) for GitHub Pages.
//   node scripts/build-static.mjs [outDir]     (default outDir: ./site-out, basePath from BASE_PATH or /Bayyinah)
// Server-only routes (sign-in, workspaces, API) are left out; links to them lead to /live.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const outDir = path.resolve(root, process.argv[2] || 'site-out');
const basePath = process.env.BASE_PATH ?? '/Bayyinah';
const work = path.join(root, '.static-build');

const SKIP = new Set(['node_modules', '.next', '.git', '.static-build', 'site-out', 'storage', 'test-results', 'playwright-report']);
rmSync(work, { recursive: true, force: true });
mkdirSync(work);
for (const entry of readdirSync(root)) {
  if (SKIP.has(entry) || entry.startsWith('storage-') || entry.endsWith('.db')) continue;
  cpSync(path.join(root, entry), path.join(work, entry), { recursive: true, filter: (src) => !src.endsWith('.db') });
}
symlinkSync(path.join(root, 'node_modules'), path.join(work, 'node_modules'), 'junction');

for (const p of ['app/api', 'app/app', 'app/platform', 'app/login', 'app/signup', 'app/forgot-password', 'app/reset-password', 'app/invite', 'middleware.ts']) {
  rmSync(path.join(work, p), { recursive: true, force: true });
}
writeFileSync(
  path.join(work, 'next.config.mjs'),
  `export default { output: 'export', basePath: ${JSON.stringify(basePath)}, trailingSlash: true, images: { unoptimized: true }, reactStrictMode: true, poweredByHeader: false };\n`,
);

execSync('npx next build', {
  cwd: work,
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_STATIC_SITE: '1', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: process.env.DATABASE_URL || 'file:./unused.db' },
});

rmSync(outDir, { recursive: true, force: true });
cpSync(path.join(work, 'out'), outDir, { recursive: true });
writeFileSync(path.join(outDir, '.nojekyll'), ''); // GitHub Pages must serve the _next/ folder
rmSync(work, { recursive: true, force: true });
console.log(`\nStatic showcase written to ${outDir} (basePath "${basePath}")`);
if (!existsSync(path.join(outDir, 'index.html'))) process.exit(1);
