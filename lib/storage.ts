import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '@/lib/env';

// Private file storage on the server's disk, outside the public web root.
// Files are only served through authorized route handlers.

function root() {
  return path.resolve(process.cwd(), env.storageDir());
}

function resolveKey(key: string) {
  if (!/^[a-z0-9]+\/[a-z0-9]+\/[a-f0-9-]+\.(pdf|png|jpg|jpeg)$/i.test(key)) throw new Error('Invalid storage key');
  const full = path.resolve(root(), key);
  if (!full.startsWith(root() + path.sep)) throw new Error('Invalid storage key');
  return full;
}

export async function putFile(orgId: string, caseId: string, ext: 'pdf' | 'png' | 'jpg', data: Buffer): Promise<string> {
  const key = `${orgId}/${caseId}/${randomUUID()}.${ext}`;
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return key;
}

export const getFile = (key: string) => readFile(resolveKey(key));

export async function deleteFile(key: string) {
  await unlink(resolveKey(key)).catch(() => undefined);
}
