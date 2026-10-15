import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { guardPage } from '@/lib/page-guard';
import { getCaseDetail } from '@/lib/services/cases';
import { decisionBlockers } from '@/lib/services/review';
import { getProviderConfig } from '@/lib/ai/provider';
import { CaseWorkspace } from '@/components/case/case-workspace';
import { AppError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Case' };
export const dynamic = 'force-dynamic';

export default async function CasePage({ params, searchParams }: { params: Promise<{ orgId: string; caseId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { orgId, caseId } = await params;
  const { from } = await searchParams;
  const { user, ctx } = await guardPage(orgId, `/app/${orgId}/cases/${caseId}`);
  let detail;
  try {
    detail = await getCaseDetail(user, orgId, caseId);
  } catch (e) {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }
  const reviewBlockers = ctx.roles.includes('REVIEWER') ? await decisionBlockers(user, orgId, caseId) : ['You do not hold the Reviewer role in this organization.'];
  const provider = getProviderConfig();
  const data = JSON.parse(JSON.stringify(detail));
  return (
    <CaseWorkspace
      data={data}
      orgId={orgId}
      me={{ id: user.id, roles: ctx.roles }}
      reviewBlockers={reviewBlockers}
      provider={{ label: provider.label, model: provider.model, external: provider.external, kind: provider.kind }}
      backHref={from === 'review' ? `/app/${orgId}/review` : ctx.roles.includes('PREPARER') ? `/app/${orgId}/prepare` : ctx.roles.includes('REVIEWER') ? `/app/${orgId}/review` : `/app/${orgId}/admin`}
      backLabel={from === 'review' || !ctx.roles.includes('PREPARER') ? 'Review cases' : 'Prepare cases'}
    />
  );
}
