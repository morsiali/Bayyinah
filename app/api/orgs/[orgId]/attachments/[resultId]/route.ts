import { route } from '@/lib/api';
import { AppError, notFound } from '@/lib/errors';
import { requireUser } from '@/lib/auth/session';
import { getOrgContext } from '@/lib/services/access';
import { prisma } from '@/lib/db';
import { getFile } from '@/lib/storage';

export const GET = route<{ orgId: string; resultId: string }>(async (_req, { orgId, resultId }) => {
  const actor = await requireUser();
  await getOrgContext(actor, orgId);
  const r = await prisma.verificationResult.findFirst({ where: { id: resultId, orgId } });
  if (!r || !r.attachmentKey) throw notFound('Attachment');
  const bytes = await getFile(r.attachmentKey).catch(() => {
    throw new AppError('NOT_FOUND', 'The stored file is no longer available.');
  });
  const ext = r.attachmentKey.split('.').pop();
  const type = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return new Response(new Uint8Array(bytes), {
    headers: { 'content-type': type, 'content-disposition': `attachment; filename="${(r.attachmentName ?? 'evidence').replace(/"/g, '')}"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' },
  });
});
