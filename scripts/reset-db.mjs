// Deletes the local SQLite database and stored files, then recreates and seeds them.
import { rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
const url = (env.match(/DATABASE_URL="?file:([^"\n]+)"?/) ?? [])[1] ?? './dev.db';
const dbPath = url.startsWith('./') ? `prisma/${url.slice(2)}` : url;
for (const p of [dbPath, `${dbPath}-journal`]) rmSync(p, { force: true });
rmSync('storage', { recursive: true, force: true });
mkdirSync('storage', { recursive: true });
console.log(`Removed ${dbPath} and storage/.`);
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', shell: true });
execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', shell: true });
