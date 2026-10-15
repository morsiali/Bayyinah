import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

export default function setup() {
  rmSync('prisma/test.db', { force: true });
  rmSync('prisma/test.db-journal', { force: true });
  rmSync('storage-test', { recursive: true, force: true });
  execSync('npx prisma db push --skip-generate', { stdio: 'ignore', env: { ...process.env, DATABASE_URL: 'file:./test.db' } });
  return () => {
    rmSync('storage-test', { recursive: true, force: true });
  };
}
