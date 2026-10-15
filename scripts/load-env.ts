// Minimal .env loader for CLI scripts (Next.js loads .env itself at runtime).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.cwd(), '.env');
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const v = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
