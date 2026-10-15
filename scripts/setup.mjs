// One-command local setup (Windows, macOS, Linux): node scripts/setup.mjs
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

const run = (cmd) => {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
};

if (!existsSync('.env')) {
  const template = readFileSync('.env.example', 'utf8');
  writeFileSync('.env', template.replace('AUTH_SECRET="replace-with-a-long-random-string"', `AUTH_SECRET="${randomBytes(32).toString('hex')}"`));
  console.log('Created .env with a fresh AUTH_SECRET.');
} else {
  console.log('.env already exists — keeping it.');
}
mkdirSync('storage', { recursive: true });
run('npx prisma generate');
run('npx prisma db push');
if (!process.argv.includes('--no-seed')) run('npx tsx prisma/seed.ts');
console.log('\nDone. Start the app with:  npm run dev   then open http://localhost:3000');
