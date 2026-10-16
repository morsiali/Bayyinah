// Fictional seed data for local development and demonstrations of Live Mode.
// Every company, person, phone number and account below is invented.
import '../scripts/load-env';
process.env.AI_PROVIDER = 'local'; // seed never calls an external model

import { prisma } from '../lib/db';
import { hashPassword } from '../lib/auth/password';
import { makeIban } from '../lib/iban-gen';
import { createOrganization } from '../lib/services/orgs';
import { createSupplier, markSupplierReviewed } from '../lib/services/suppliers';
import { addPastedSource, createCase, submitForReview } from '../lib/services/cases';
import { runAnalysis } from '../lib/services/analysis';
import { runAgent } from '../lib/services/agent';
import { recordVerification } from '../lib/services/verification';
import { recordDecision } from '../lib/services/review';
import { DEMO_SCENARIOS } from '../lib/demo-data';
import { createSmsAddress, receiveSms } from '../lib/services/sms';

export const SEED_PASSWORD = 'Bayyinah!2026';

async function user(name: string, email: string) {
  const u = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(SEED_PASSWORD) } });
  return { id: u.id, email: u.email, name: u.name };
}

async function main() {
  if (await prisma.user.findUnique({ where: { email: 'layla@alwaha.example' } })) {
    console.log('Seed data already present — skipping. Use `npm run db:reset` to start fresh.');
    return;
  }
  const layla = await user('Layla Haddad', 'layla@alwaha.example');
  const omar = await user('Omar Siddiqui', 'omar@alwaha.example');
  const sara = await user('Sara Al Mansoori', 'sara@alwaha.example');
  const hana = await user('Hana Kareem', 'hana@desertrose.example');
  const ops = await user('Platform Operations', 'ops@bayyinah.example');

  // Platform admin is provisioned the privileged way (never via registration).
  await prisma.platformAdminMembership.create({ data: { userId: ops.id, grantedBy: 'seed-script' } });

  const org = await createOrganization(layla, 'Al Waha Trading LLC');
  await prisma.membership.updateMany({ where: { orgId: org.id, userId: layla.id }, data: { roles: 'ORG_ADMIN,REVIEWER' } });
  await prisma.membership.create({ data: { orgId: org.id, userId: omar.id, roles: 'PREPARER', invitedBy: layla.id } });
  await prisma.membership.create({ data: { orgId: org.id, userId: sara.id, roles: 'REVIEWER', invitedBy: layla.id } });

  const sup: Record<string, string> = {};
  for (const s of DEMO_SCENARIOS) {
    const created = await createSupplier(layla, org.id, {
      name: s.supplier.name,
      expectedBeneficiaryName: s.supplier.expectedBeneficiaryName,
      referenceIban: s.supplier.referenceIban,
      recordedEmail: s.supplier.recordedEmail,
      recordedPhone: s.supplier.recordedPhone,
      usualCurrency: s.supplier.usualCurrency,
      referenceSource: s.supplier.referenceSource,
    });
    sup[s.id] = created.id;
    if (s.id !== 'missing-evidence') await markSupplierReviewed(layla, org.id, created.id);
  }
  const src = (id: string) => DEMO_SCENARIOS.find((s) => s.id === id)!.source;

  // 1) Matching invoice — prepared by Omar, approved by Sara, closed with a report.
  const c1 = await createCase(omar, org.id, { supplierId: sup['matching-invoice'], requestType: 'INVOICE_PAYMENT', expectedAmount: '45,000.00', expectedCurrency: 'AED', note: 'October packaging delivery' });
  await addPastedSource(omar, org.id, c1.id, { text: src('matching-invoice') });
  await runAnalysis(omar, org.id, c1.id);
  await runAgent(omar, org.id, c1.id);
  let k = await prisma.case.findUniqueOrThrow({ where: { id: c1.id } });
  await submitForReview(omar, org.id, c1.id, k.revision, 'Matches PO-7781.');
  k = await prisma.case.findUniqueOrThrow({ where: { id: c1.id } });
  await recordDecision(sara, org.id, c1.id, { decision: 'APPROVED', rationale: 'Account, beneficiary and sender domain match the reference; amount matches PO-7781.', expectedRevision: k.revision, caseInputVersionId: k.currentInputVersionId! });

  // 2) Urgent account change — analyzed, agent created the call task; waiting for a person to verify.
  const c2 = await createCase(omar, org.id, { supplierId: sup['urgent-account-change'], requestType: 'BANK_ACCOUNT_CHANGE' });
  await addPastedSource(omar, org.id, c2.id, { text: src('urgent-account-change') });
  await runAnalysis(omar, org.id, c2.id);
  await runAgent(omar, org.id, c2.id);

  // 3) Beneficiary mismatch — verified (confirmed) and submitted; waiting for Sara's decision.
  const c3 = await createCase(omar, org.id, { supplierId: sup['beneficiary-mismatch'], requestType: 'NEW_BENEFICIARY', expectedAmount: '120,000.00', expectedCurrency: 'AED' });
  await addPastedSource(omar, org.id, c3.id, { text: src('beneficiary-mismatch') });
  await runAnalysis(omar, org.id, c3.id);
  await runAgent(omar, org.id, c3.id);
  const t3 = await prisma.verificationTask.findFirstOrThrow({ where: { caseId: c3.id, status: 'OPEN' } });
  k = await prisma.case.findUniqueOrThrow({ where: { id: c3.id } });
  await recordVerification(omar, org.id, c3.id, t3.id, {
    channel: 'REFERENCE_PHONE',
    channelSource: t3.channelSource ?? 'Supplier reference',
    outcome: 'CONFIRMED',
    requirementChecked: t3.requirement,
    notes: 'Spoke with Leena in accounts on the reference number. The project is billed via their sister entity; a signed letter will follow.',
    attestIndependent: true,
    expectedRevision: k.revision,
  });
  await runAgent(omar, org.id, c3.id);
  k = await prisma.case.findUniqueOrThrow({ where: { id: c3.id } });
  await submitForReview(omar, org.id, c3.id, k.revision, 'Beneficiary is a sister entity; confirmed by phone.');

  // 4) Missing evidence — a draft with only a vague message.
  const c4 = await createCase(omar, org.id, { supplierId: sup['missing-evidence'], requestType: 'INVOICE_PAYMENT' });
  await addPastedSource(omar, org.id, c4.id, { text: src('missing-evidence') });

  // 5) SMS intake — two texts waiting in the inbox (as if forwarded by the business phone).
  await createSmsAddress(layla, org.id);
  await receiveSms(org.id, { provider: 'FORWARDER', from: '+97145550202', to: null, providerMessageId: 'seed-sms-1', sentAt: null, truncated: false, body: `Gulf Supplies: our bank account has changed. Please pay INV-2026-0431 (AED 22,400.00) to our new IBAN ${makeIban('AE', '0337777777777777777')} today. Do not call, our lines are down.` });
  await receiveSms(org.id, { provider: 'FORWARDER', from: '+971551234567', to: null, providerMessageId: 'seed-sms-2', sentAt: null, truncated: false, body: 'مرحباً، نرجو تحويل قيمة الفاتورة 2219 بمبلغ 6,300 درهم إلى حساب بنكي جديد بسرية تامة. عاجل.' });

  // Second organization, to demonstrate isolation.
  const org2 = await createOrganization(hana, 'Desert Rose Interiors');
  const s2 = await createSupplier(hana, org2.id, { name: 'Marina Stoneworks', expectedBeneficiaryName: 'Marina Stoneworks LLC', referenceIban: makeIban('AE', '0331000000000000777'), recordedEmail: 'accounts@marinastone.example', recordedPhone: '+971 6 555 0707', usualCurrency: 'AED', referenceSource: 'Supply contract 2026' });
  await markSupplierReviewed(hana, org2.id, s2.id);
  const d1 = await createCase(hana, org2.id, { supplierId: s2.id, requestType: 'INVOICE_PAYMENT' });
  await addPastedSource(hana, org2.id, d1.id, { text: 'From: accounts@marinastone.example\nInvoice MS-2026-55 for AED 9,800.00. Beneficiary name: Marina Stoneworks LLC. IBAN: ' + makeIban('AE', '0331000000000000777') });

  console.log('\nSeed complete. Sign in with any of these (password: ' + SEED_PASSWORD + '):');
  console.table([
    { email: layla.email, organization: 'Al Waha Trading LLC', roles: 'Org admin + Reviewer' },
    { email: omar.email, organization: 'Al Waha Trading LLC', roles: 'Preparer' },
    { email: sara.email, organization: 'Al Waha Trading LLC', roles: 'Reviewer' },
    { email: hana.email, organization: 'Desert Rose Interiors', roles: 'All roles' },
    { email: ops.email, organization: '—', roles: 'Platform operations' },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
