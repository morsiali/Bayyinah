import { route } from '@/lib/api';
import { AppError, notFound } from '@/lib/errors';
import { requireUser } from '@/lib/auth/session';
import { getOrgContext } from '@/lib/services/access';
import { prisma } from '@/lib/db';
import { getFile } from '@/lib/storage';

// Private document access: members of the owning organization only. Platform admins are not members.
export const GET = route<{ orgId: string; docId: string }>(async (_req, { orgId, docId }) => {
  const actor = await requireUser();
  await getOrgContext(actor, orgId);
  const doc = await prisma.sourceDocument.findFirst({ where: { id: docId, orgId } });
  if (!doc || !doc.storageKey) throw notFound('Document file');
  const bytes = await getFile(doc.storageKey).catch(() => {
    throw new AppError('NOT_FOUND', 'The stored file is no longer available.');
  });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${(doc.fileName ?? 'document.pdf').replace(/"/g, '')}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
