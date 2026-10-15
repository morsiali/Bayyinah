// Platform operations. Platform admins see organization metadata and aggregate counts only —
// never documents, extracted bank details, findings or case narratives.
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AppError, forbidden, notFound } from '@/lib/errors';
import { platformAudit } from '@/lib/audit';
import { SETTING_DEFS, SETTING_KEYS, getSettings, type SettingKey } from '@/lib/settings';
import type { Actor } from './access';

export async function requirePlatformAdmin(actor: Actor) {
  const m = await prisma.platformAdminMembership.findUnique({ where: { userId: actor.id } });
  if (!m?.isActive) throw forbidden('Platform operations are restricted to provisioned platform administrators.');
}

export async function listOrganizations(actor: Actor) {
  await requirePlatformAdmin(actor);
  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, status: true, createdAt: true, retentionDays: true } });
  const [members, cases, open] = await Promise.all([
    prisma.membership.groupBy({ by: ['orgId'], where: { isActive: true }, _count: true }),
    prisma.case.groupBy({ by: ['orgId'], _count: true }),
    prisma.case.groupBy({ by: ['orgId'], where: { status: { notIn: ['CLOSED_APPROVED', 'CLOSED_REJECTED', 'CLOSED_INCONCLUSIVE'] } }, _count: true }),
  ]);
  const count = (rows: { orgId: string; _count: number }[], id: string) => rows.find((r) => r.orgId === id)?._count ?? 0;
  return orgs.map((o) => ({ ...o, members: count(members, o.id), cases: count(cases, o.id), openCases: count(open, o.id) }));
}

export async function setOrganizationStatus(actor: Actor, orgId: string, status: 'ACTIVE' | 'SUSPENDED', reason: string) {
  await requirePlatformAdmin(actor);
  if (!reason || reason.trim().length < 10) throw new AppError('VALIDATION', 'Give a reason of at least 10 characters.');
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw notFound('Organization');
  if (org.status === status) throw new AppError('VALIDATION', `The organization is already ${status.toLowerCase()}.`);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: orgId }, data: { status } });
    await platformAudit(actor, status === 'SUSPENDED' ? 'organization.suspended' : 'organization.reactivated', { type: 'organization', id: orgId }, { reason: reason.trim() }, tx);
  });
}

export async function getOperationalMetrics(actor: Actor) {
  await requirePlatformAdmin(actor);
  const since = new Date(Date.now() - 30 * 86400_000);
  const [caseStatus, analyses, agentRuns, modelCalls, failures, users, orgs] = await Promise.all([
    prisma.case.groupBy({ by: ['status'], _count: true }),
    prisma.analysis.groupBy({ by: ['status', 'provider'], where: { createdAt: { gte: since } }, _count: true }),
    prisma.agentRun.groupBy({ by: ['status'], where: { startedAt: { gte: since } }, _count: true }),
    prisma.modelCallLog.groupBy({ by: ['provider', 'model', 'status'], where: { createdAt: { gte: since } }, _count: true, _sum: { inputTokens: true, outputTokens: true }, _avg: { durationMs: true } }),
    prisma.modelCallLog.findMany({ where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, createdAt: true, orgId: true, provider: true, model: true, purpose: true, errorCode: true, errorRef: true, durationMs: true } }),
    prisma.user.count(),
    prisma.organization.findMany({ select: { id: true, name: true } }),
  ]);
  const failedAnalyses = await prisma.analysis.findMany({ where: { status: 'FAILED' }, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, createdAt: true, orgId: true, provider: true, model: true, errorRef: true } });
  const failedAgent = await prisma.agentRun.findMany({ where: { status: { in: ['FAILED', 'STOPPED'] } }, orderBy: { startedAt: 'desc' }, take: 25, select: { id: true, startedAt: true, orgId: true, status: true, stopReason: true, toolCallCount: true } });
  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
  return { caseStatus, analyses, agentRuns, modelCalls, failures, failedAnalyses, failedAgent, users, orgName };
}

export async function getPlatformSettings(actor: Actor) {
  await requirePlatformAdmin(actor);
  return getSettings();
}

export const settingsUpdateSchema = z.record(z.string(), z.coerce.number().int());

export async function updatePlatformSettings(actor: Actor, values: Record<string, number>) {
  await requirePlatformAdmin(actor);
  const d = settingsUpdateSchema.parse(values);
  const before = await getSettings();
  const changes: Record<string, { from: number; to: number }> = {};
  for (const [k, v] of Object.entries(d)) {
    if (!(SETTING_KEYS as string[]).includes(k)) throw new AppError('VALIDATION', `Unknown setting ${k}.`);
    const def = SETTING_DEFS[k as SettingKey];
    if (v < def.min || v > def.max) throw new AppError('VALIDATION', `${def.label} must be between ${def.min} and ${def.max}.`);
    if (before[k as SettingKey] !== v) changes[k] = { from: before[k as SettingKey], to: v };
  }
  if (!Object.keys(changes).length) throw new AppError('VALIDATION', 'Nothing changed.');
  await prisma.$transaction(async (tx) => {
    for (const [k, c] of Object.entries(changes)) {
      await tx.platformSetting.upsert({ where: { key: k }, create: { key: k, value: String(c.to), updatedBy: actor.id }, update: { value: String(c.to), updatedBy: actor.id } });
    }
    await platformAudit(actor, 'settings.updated', { type: 'settings', id: 'limits' }, changes, tx);
  });
}

export async function listPlatformEvents(actor: Actor, take = 100) {
  await requirePlatformAdmin(actor);
  return prisma.platformAdminEvent.findMany({ orderBy: { createdAt: 'desc' }, take });
}

/** Privileged provisioning — only callable from the server-side CLI script, never from a web route. */
export async function provisionPlatformAdmin(email: string, grantedBy: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new Error(`No user with email ${email}. Register the account first.`);
  await prisma.platformAdminMembership.upsert({ where: { userId: user.id }, create: { userId: user.id, grantedBy }, update: { isActive: true, grantedBy } });
  await platformAudit({ id: user.id, email: user.email }, 'platform_admin.provisioned', { type: 'user', id: user.id }, { grantedBy });
  return user;
}

export async function revokePlatformAdmin(email: string, revokedBy: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw new Error(`No user with email ${email}.`);
  await prisma.platformAdminMembership.updateMany({ where: { userId: user.id }, data: { isActive: false } });
  await platformAudit({ id: user.id, email: user.email }, 'platform_admin.revoked', { type: 'user', id: user.id }, { revokedBy });
}
