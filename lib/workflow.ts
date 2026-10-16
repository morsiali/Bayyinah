// The Bayyinah workflow as data: who acts at each step, on which screen, what it produces,
// which case status it leaves, and where it can lead. Drives the /workflow page and its tests.
import { msg } from '@/lib/i18n/core';
import type { CaseStatus } from '@/lib/constants';

export type LaneId = 'preparer' | 'system' | 'reviewer' | 'admin';
export type ZoneId = 'setup' | 'case' | 'after';

export const LANES: { id: LaneId; name: string; role: string; color: string; dot: string }[] = [
  { id: 'preparer', name: msg('Preparer'), role: msg('Preparer: builds and verifies the case'), color: 'border-s-signal-blue', dot: 'bg-signal-blue' },
  { id: 'system', name: msg('Bayyinah'), role: msg('Bayyinah: reads, compares and prepares'), color: 'border-s-ink', dot: 'bg-ink' },
  { id: 'reviewer', name: msg('Reviewer'), role: msg('Reviewer: decides, never on own cases'), color: 'border-s-signal-green', dot: 'bg-signal-green' },
  { id: 'admin', name: msg('Organization admin'), role: msg('Admin: sets up and keeps references honest'), color: 'border-s-signal-amber', dot: 'bg-signal-amber' },
];

export const ZONES: { id: ZoneId; label: string }[] = [
  { id: 'setup', label: msg('Before any case') },
  { id: 'case', label: msg('Each request') },
  { id: 'after', label: msg('After the decision') },
];

export type Step = {
  id: string;
  lane: LaneId;
  zone: ZoneId;
  title: string;
  sub: string;
  description: string;
  screen: string;
  result: string;
  /** Case status once this step is done; steps without one leave the status as it was. */
  status?: CaseStatus;
  /** Where to try it: a Demo Mode persona, and the live route (static site sends it to /live). */
  demoPersona: 'preparer' | 'reviewer' | 'admin';
  liveRoute: string;
};

export const STEPS: Step[] = [
  {
    id: 'A1', lane: 'admin', zone: 'setup',
    title: msg('Create the organization'), sub: msg('you become its first admin'),
    description: msg('Register with your own account and name the business. The creator becomes the first organization admin; nobody shares a login.'),
    screen: msg('Sign up › Create organization'), result: msg('An organization with one admin.'), demoPersona: 'admin', liveRoute: '/signup',
  },
  {
    id: 'A2', lane: 'admin', zone: 'setup',
    title: msg('Invite the team'), sub: msg('single-use links, roles'),
    description: msg('Create an invitation for each person with the roles they need — Preparer, Reviewer or Organization admin. Links expire, work once and only for the invited email.'),
    screen: msg('Manage organization › Members & invitations'), result: msg('Preparers and reviewers with their own accounts.'), demoPersona: 'admin', liveRoute: '/app',
  },
  {
    id: 'A3', lane: 'admin', zone: 'setup',
    title: msg('Add supplier references'), sub: msg('IBAN, beneficiary, phone, email'),
    description: msg('Record the details you already trust for each supplier, from an approved source such as the signed agreement. The IBAN is checked for format and checksum, and every change becomes a new version.'),
    screen: msg('Manage organization › Suppliers'), result: msg('Supplier reference, version 1.'), demoPersona: 'admin', liveRoute: '/app',
  },
  {
    id: 'A4', lane: 'admin', zone: 'setup',
    title: msg('Review each reference'), sub: msg('mark as reviewed'),
    description: msg('Check the details against the approved record and mark the reference as reviewed. Cases that use an unreviewed reference show it as a finding.'),
    screen: msg('Suppliers › Supplier reference'), result: msg('A reviewed reference, ready for cases.'), demoPersona: 'admin', liveRoute: '/app',
  },
  {
    id: 'C1', lane: 'preparer', zone: 'case',
    title: msg('Create the case'), sub: msg('supplier, type, expected amount'),
    description: msg('When a payment request arrives, pick the supplier it claims to come from and what it asks for: invoice payment, bank account change or new beneficiary. The case keeps a snapshot of the supplier reference.'),
    screen: msg('Prepare cases › New case'), result: msg('A case number and evidence version 1.'), status: 'DRAFT', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C2', lane: 'preparer', zone: 'case',
    title: msg('Add the source'), sub: msg('pasted text or text PDF'),
    description: msg('Paste the email exactly as received or upload a text-based PDF. A scanned PDF is kept as evidence but marked unreadable and never analyzed — paste its text instead.'),
    screen: msg('Case › Source evidence'), result: msg('Readable source evidence.'), status: 'DRAFT', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C3', lane: 'system', zone: 'case',
    title: msg('Analyze the request'), sub: msg('fields and language indicators'),
    description: msg('The AI provider — or the local analyzer when none is configured — extracts amount, beneficiary, IBAN and sender, and flags urgency, secrecy, requests to skip verification, new contact details and embedded instructions. Every quote is checked against the source; unsupported quotes are discarded.'),
    screen: msg('Case › Next action › Run analysis'), result: msg('Extracted fields and quoted indicators.'), status: 'ANALYZED', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C4', lane: 'system', zone: 'case',
    title: msg('Compare with the reference'), sub: msg('deterministic business rules'),
    description: msg('Fixed rules compare the request with the supplier snapshot: IBAN checksum, account, beneficiary name, sender domain, currency, amount and request type. Each finding names its rule.'),
    screen: msg('Case › Decision Passport › Differences'), result: msg('Rule findings and a differences table.'), demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C5', lane: 'preparer', zone: 'case',
    title: msg('Check the extraction'), sub: msg('correct any field'),
    description: msg('Correct a wrong value and give the reason; the original stays on record. Correcting amount, currency, beneficiary, IBAN, account or sender re-runs the rules and means the agent must run again.'),
    screen: msg('Case › Decision Passport › Request'), result: msg('Effective fields with a correction history.'), demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C6', lane: 'system', zone: 'case',
    title: msg('Run the preparation agent'), sub: msg('7 allow-listed tools'),
    description: msg('The agent reads the case, compares details, checks requirements and creates the verification task the case needs, then stops when a person must act. It cannot approve, contact anyone or edit supplier details.'),
    screen: msg('Case › Next action › Run preparation agent'), result: msg('Agent trace, readiness checklist and any verification task.'), status: 'INDEPENDENT_CHECK_REQUIRED', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C7', lane: 'preparer', zone: 'case',
    title: msg('Verify independently'), sub: msg('call the reference number'),
    description: msg('Contact the supplier through the channel in the reference — never a number, email or link from the request. Then record what happened: outcome, channel, where it came from, notes and an optional attachment.'),
    screen: msg('Case › Record verification outcome'), result: msg('A verification record: confirmed, not confirmed, inconclusive or unable to complete.'), status: 'INDEPENDENT_CHECK_REQUIRED', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C8', lane: 'system', zone: 'case',
    title: msg('Check readiness'), sub: msg('computed from records'),
    description: msg('Requirements are recomputed from saved records, never from the screen: readable source, current analysis, agent run, verification recorded, supplier confirmed and required details present. Submitting needs the first four; approving needs all of them.'),
    screen: msg('Case › Readiness'), result: msg('The actions that are unlocked.'), demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C9', lane: 'preparer', zone: 'case',
    title: msg('Submit for review'), sub: msg('evidence locks'),
    description: msg('Submit with an optional note for the reviewer. Evidence is locked while the case waits; to change anything, the preparer withdraws it first.'),
    screen: msg('Case › Next action › Submit for review'), result: msg('The case is in the review queue.'), status: 'READY_FOR_REVIEW', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'C10', lane: 'reviewer', zone: 'case',
    title: msg('Review the Decision Passport'), sub: msg('a different person'),
    description: msg('A reviewer who did not create the case opens it from the review queue: request, quoted evidence, differences, verification and history on one page. If the case changes meanwhile, the reviewer is asked to reload.'),
    screen: msg('Review cases › Case'), result: msg('A reviewer looking at the current evidence version.'), demoPersona: 'reviewer', liveRoute: '/app',
  },
  {
    id: 'C11', lane: 'reviewer', zone: 'case',
    title: msg('Record the decision'), sub: msg('with a written rationale'),
    description: msg('Approve, reject, return for information or close as inconclusive, with a rationale. Approval stays blocked until every requirement is met — for account changes and new beneficiaries that includes a confirmed verification.'),
    screen: msg('Case › Your decision'), result: msg('A decision tied to the evidence version it was based on.'), status: 'CLOSED_APPROVED', demoPersona: 'reviewer', liveRoute: '/app',
  },
  {
    id: 'F1', lane: 'system', zone: 'after',
    title: msg('Report and audit trail'), sub: msg('printable, append-only'),
    description: msg('The decision report shows the case, evidence references, findings, differences, verification and decision, with the evidence version used. Every step is in the organization’s audit trail.'),
    screen: msg('Case › Report · Manage organization › Audit trail'), result: msg('A report you can save as PDF.'), demoPersona: 'admin', liveRoute: '/app',
  },
  {
    id: 'F2', lane: 'preparer', zone: 'after',
    title: msg('Reopen if needed'), sub: msg('a new evidence version'),
    description: msg('A closed case changes only by reopening it with a reason. That starts a new evidence version in draft; the earlier decision stays in the history.'),
    screen: msg('Case › Case record › Reopen'), result: msg('A new evidence version in draft.'), status: 'DRAFT', demoPersona: 'preparer', liveRoute: '/app',
  },
  {
    id: 'F3', lane: 'admin', zone: 'after',
    title: msg('Update a supplier reference'), sub: msg('open cases are offered it'),
    description: msg('When a supplier’s details change — or a case has no channel to call — the admin saves a new reference version from an approved source. Open cases can apply it, which starts a new evidence version and voids earlier analysis, verification and review. Closed cases keep their historical reference.'),
    screen: msg('Suppliers › Edit reference'), result: msg('A new reference version.'), demoPersona: 'admin', liveRoute: '/app',
  },
  {
    id: 'F4', lane: 'system', zone: 'after',
    title: msg('Apply retention'), sub: msg('decisions are kept'),
    description: msg('After the organization’s retention period, the retention job removes files and document text of closed cases. Decisions and the audit trail stay.'),
    screen: msg('Manage organization › Settings & limits'), result: msg('Less stored data, the same decision record.'), demoPersona: 'admin', liveRoute: '/app',
  },
];

export type EdgeKind = 'next' | 'branch' | 'loop';
export type Edge = { from: string; to: string; kind: EdgeKind; label?: string; status?: CaseStatus };

export const EDGES: Edge[] = [
  { from: 'A1', to: 'A2', kind: 'next' },
  { from: 'A2', to: 'A3', kind: 'next' },
  { from: 'A3', to: 'A4', kind: 'next' },
  { from: 'A4', to: 'C1', kind: 'next', label: msg('then, for every request') },
  { from: 'C1', to: 'C2', kind: 'next' },
  { from: 'C2', to: 'C3', kind: 'next' },
  { from: 'C3', to: 'C4', kind: 'next' },
  { from: 'C4', to: 'C5', kind: 'next', label: msg('a field looks wrong') },
  { from: 'C4', to: 'C6', kind: 'next' },
  { from: 'C5', to: 'C4', kind: 'loop', label: msg('material correction: rules re-run') },
  { from: 'C5', to: 'C6', kind: 'next' },
  { from: 'C6', to: 'C7', kind: 'branch', label: msg('verification required'), status: 'INDEPENDENT_CHECK_REQUIRED' },
  { from: 'C6', to: 'C8', kind: 'branch', label: msg('invoice without discrepancies'), status: 'ANALYZED' },
  { from: 'C6', to: 'F3', kind: 'branch', label: msg('no channel to call'), status: 'INDEPENDENT_CHECK_REQUIRED' },
  { from: 'C7', to: 'C8', kind: 'next' },
  { from: 'C8', to: 'C9', kind: 'next' },
  { from: 'C9', to: 'C10', kind: 'next' },
  { from: 'C9', to: 'C5', kind: 'loop', label: msg('withdrawn to make changes'), status: 'ANALYZED' },
  { from: 'C10', to: 'C11', kind: 'next' },
  { from: 'C11', to: 'F1', kind: 'branch', label: msg('approved, rejected or inconclusive') },
  { from: 'C11', to: 'C2', kind: 'loop', label: msg('returned for information'), status: 'NEEDS_INFORMATION' },
  { from: 'F1', to: 'F2', kind: 'next', label: msg('new facts emerge') },
  { from: 'F1', to: 'F4', kind: 'next', label: msg('retention period ends') },
  { from: 'F2', to: 'C2', kind: 'loop', label: msg('work the new version') },
  { from: 'F3', to: 'C2', kind: 'loop', label: msg('applied to an open case'), status: 'DRAFT' },
];

/** A walk through the map. Each stop may carry what happens there in this scenario and the status it leaves. */
export type Stop = { id: string; note?: string; status?: CaseStatus };
export type Scenario = { id: string; name: string; summary: string; demo?: string; stops: Stop[] };

const START: Stop[] = [{ id: 'C1' }, { id: 'C2' }, { id: 'C3' }, { id: 'C4' }];

export const SCENARIOS: Scenario[] = [
  {
    id: 'all', name: msg('Every step'), summary: msg('The whole map in order, from setting up the organization to retention.'),
    stops: STEPS.map((s) => ({ id: s.id })),
  },
  {
    id: 'setup', name: msg('Set up an organization'), summary: msg('Done once: an admin registers, invites the team and records supplier references.'),
    stops: [{ id: 'A1' }, { id: 'A2' }, { id: 'A3' }, { id: 'A4' }],
  },
  {
    id: 'matching-invoice', name: msg('Matching invoice'), summary: msg('Every detail matches the reference, so no call is required and the reviewer approves.'), demo: 'matching-invoice',
    stops: [
      ...START,
      { id: 'C6', note: msg('No discrepancies: no verification task is created.'), status: 'ANALYZED' },
      { id: 'C8', note: msg('Everything needed for submission and approval is met.') },
      { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved within the workflow.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
  {
    id: 'account-change-denied', name: msg('Account change — supplier denies'), summary: msg('A new account, urgency and a request to skip the call. The supplier denies it on the reference number and the reviewer rejects.'), demo: 'urgent-account-change',
    stops: [
      ...START,
      { id: 'C6', note: msg('Bank account change: a verification task is always created.') },
      { id: 'C7', note: msg('Outcome recorded: not confirmed — the supplier never asked for the change.') },
      { id: 'C8', note: msg('Submission is allowed; approval stays blocked without a confirmed outcome.'), status: 'INDEPENDENT_CHECK_REQUIRED' },
      { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: rejected.'), status: 'CLOSED_REJECTED' },
      { id: 'F1', status: 'CLOSED_REJECTED' },
    ],
  },
  {
    id: 'account-change-confirmed', name: msg('Account change — supplier confirms'), summary: msg('The supplier confirms the new account on the reference number, so approval unlocks.'),
    stops: [
      ...START,
      { id: 'C6', note: msg('Bank account change: a verification task is always created.') },
      { id: 'C7', note: msg('Outcome recorded: confirmed by supplier.') },
      { id: 'C8', note: msg('Every requirement is met, including the confirmed verification.'), status: 'INDEPENDENT_CHECK_REQUIRED' },
      { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved within the workflow — no money moves in Bayyinah.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
  {
    id: 'returned', name: msg('Returned for information'), summary: msg('The reviewer needs more evidence, the preparer adds it, and the case comes back.'), demo: 'beneficiary-mismatch',
    stops: [
      ...START,
      { id: 'C6' }, { id: 'C7', note: msg('Confirmed by phone, but the beneficiary is a different legal entity.') },
      { id: 'C8' }, { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: returned until the signed letter is attached.'), status: 'NEEDS_INFORMATION' },
      { id: 'C2', note: msg('The preparer adds the signed letter as a new source.'), status: 'NEEDS_INFORMATION' },
      { id: 'C3', note: msg('A new source means the analysis runs again.') },
      { id: 'C4' }, { id: 'C6', note: msg('The recorded verification still applies to this evidence version.'), status: 'ANALYZED' },
      { id: 'C8' }, { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
  {
    id: 'corrected', name: msg('Extraction corrected'), summary: msg('The preparer fixes a misread amount; the rules re-run before the case goes on.'), demo: 'missing-evidence',
    stops: [
      ...START,
      { id: 'C5', note: msg('The amount was read wrongly; the preparer corrects it with a reason.') },
      { id: 'C4', note: msg('A material correction re-runs the rules on the corrected value.') },
      { id: 'C6', status: 'ANALYZED' }, { id: 'C8' }, { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
  {
    id: 'reference-changed', name: msg('Supplier details change'), summary: msg('The reference has no phone to call. An admin adds one, and the case restarts on a new evidence version.'),
    stops: [
      ...START,
      { id: 'C6', note: msg('No phone or email on the reference: the task asks for an independent channel.') },
      { id: 'F3', note: msg('The admin adds the phone number from the signed agreement — version 2.') },
      { id: 'C2', note: msg('The preparer applies version 2: a new evidence version starts.'), status: 'DRAFT' },
      { id: 'C3' }, { id: 'C4' },
      { id: 'C6', note: msg('Now a call to the reference number is the task.') },
      { id: 'C7', note: msg('Outcome recorded: confirmed by supplier.') },
      { id: 'C8' }, { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
  {
    id: 'reopened', name: msg('Reopened after closing'), summary: msg('New facts arrive after a decision. The case is reopened into a new version and decided again.'),
    stops: [
      { id: 'F1', note: msg('The case was rejected last week.'), status: 'CLOSED_REJECTED' },
      { id: 'F2', note: msg('Reopened with a reason: the supplier sent a signed change letter.') },
      { id: 'C2', note: msg('The letter is added as a new source.') },
      { id: 'C3' }, { id: 'C4' }, { id: 'C6' }, { id: 'C7' }, { id: 'C8' }, { id: 'C9' }, { id: 'C10' },
      { id: 'C11', note: msg('Decision: approved. The earlier rejection stays in the history.'), status: 'CLOSED_APPROVED' },
      { id: 'F1', status: 'CLOSED_APPROVED' },
    ],
  },
];

/** Every way the case status can change, with who causes it. Mirrors TRANSITIONS in lib/services/workflow.ts. */
export const STATUS_FLOW: { from: CaseStatus[]; to: CaseStatus; by: LaneId; trigger: string }[] = [
  { from: ['DRAFT', 'NEEDS_INFORMATION'], to: 'ANALYZED', by: 'system', trigger: msg('Analysis completes') },
  { from: ['ANALYZED', 'NEEDS_INFORMATION'], to: 'INDEPENDENT_CHECK_REQUIRED', by: 'system', trigger: msg('The agent creates a verification task') },
  { from: ['INDEPENDENT_CHECK_REQUIRED'], to: 'ANALYZED', by: 'system', trigger: msg('The agent finds nothing left to verify') },
  { from: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'NEEDS_INFORMATION'], to: 'READY_FOR_REVIEW', by: 'preparer', trigger: msg('Submitted for review') },
  { from: ['READY_FOR_REVIEW'], to: 'ANALYZED', by: 'preparer', trigger: msg('Withdrawn to make changes') },
  { from: ['READY_FOR_REVIEW'], to: 'CLOSED_APPROVED', by: 'reviewer', trigger: msg('Approved — only when every requirement is met') },
  { from: ['READY_FOR_REVIEW'], to: 'CLOSED_REJECTED', by: 'reviewer', trigger: msg('Rejected') },
  { from: ['READY_FOR_REVIEW'], to: 'CLOSED_INCONCLUSIVE', by: 'reviewer', trigger: msg('Closed as inconclusive') },
  { from: ['READY_FOR_REVIEW'], to: 'NEEDS_INFORMATION', by: 'reviewer', trigger: msg('Returned for information') },
  { from: ['ANALYZED', 'INDEPENDENT_CHECK_REQUIRED', 'NEEDS_INFORMATION', 'READY_FOR_REVIEW'], to: 'DRAFT', by: 'preparer', trigger: msg('An updated supplier reference is applied (new evidence version)') },
  { from: ['CLOSED_APPROVED', 'CLOSED_REJECTED', 'CLOSED_INCONCLUSIVE'], to: 'DRAFT', by: 'preparer', trigger: msg('Reopened into a new evidence version') },
];

/** Effective case status at each stop of a scenario (a stop's own status, else the step's, else unchanged). */
export function statusesAlong(stops: Stop[]): (CaseStatus | undefined)[] {
  let cur: CaseStatus | undefined;
  return stops.map((st) => (cur = st.status ?? stepById(st.id).status ?? cur));
}

export const stepById = (id: string) => STEPS.find((s) => s.id === id)!;
export const laneIndex = (lane: LaneId) => LANES.findIndex((l) => l.id === lane);
