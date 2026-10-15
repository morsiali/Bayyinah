// Collects every English string the interface can show, so tests can prove each one has an Arabic translation.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const unescape = (s: string) => s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

/** Keys passed to t('…') or marked with msg('…') anywhere in the UI or libraries. */
export function uiKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  const files = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'components')), ...walk(join(ROOT, 'lib'))].filter((f) => !f.includes(join('lib', 'i18n')));
  const re = /\b(?:t|msg)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`)/g;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      const k = unescape(m[1] ?? m[2] ?? m[3] ?? '');
      if (k.trim()) keys.set(k, relative(ROOT, f));
    }
  }
  return keys;
}

/** Sentence-like string literals in server modules whose text reaches users (errors, rules, requirements, agent). */
export function serverLiterals(): Map<string, string> {
  const files = [
    'lib/errors.ts', 'lib/api.ts', 'lib/settings.ts', 'lib/iban.ts', 'lib/money.ts', 'lib/files.ts', 'lib/client.ts',
    ...walk(join(ROOT, 'lib', 'services')).map((f) => relative(ROOT, f)),
    ...walk(join(ROOT, 'lib', 'analysis')).map((f) => relative(ROOT, f)),
    ...walk(join(ROOT, 'lib', 'auth')).map((f) => relative(ROOT, f)),
    ...walk(join(ROOT, 'app', 'api')).map((f) => relative(ROOT, f)),
  ];
  const out = new Map<string, string>();
  const re = /'((?:[^'\\\n]|\\.){4,})'/g;
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(import|export \* from)|console\.|\.source\b|new RegExp|^\s*\/\//.test(l))
      .join('\n')
      // Template literals hold parameterised messages (covered by patterns); remove them so quotes inside don't pair up.
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
    for (const m of src.matchAll(re)) {
      const s = unescape(m[1]);
      // User-facing prose: starts with a capital letter, contains a space, not a code identifier or path.
      if (/^[A-Z][^/]*\s/.test(s) && /[a-z]/.test(s) && !/^[A-Z_]+$/.test(s) && !/[{}<>]|\\[sdbw]|\(\?:|^\w+\.\w+$/.test(s)) out.set(s, f);
    }
  }
  return out;
}

/** Labels held in data structures and shown through t(value). */
export async function runtimeKeys(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const add = (v: unknown, where: string) => {
    if (typeof v === 'string' && v.trim()) out.set(v, where);
  };
  const c = await import('@/lib/constants');
  for (const name of ['ROLE_LABELS', 'REQUEST_TYPE_LABELS', 'STATUS_LABELS', 'SEVERITY_LABELS', 'OUTCOME_LABELS', 'CHANNEL_LABELS', 'TASK_TYPE_LABELS', 'DECISION_LABELS', 'FIELD_LABELS'] as const) {
    for (const v of Object.values(c[name] as Record<string, string>)) add(v, `constants.${name}`);
  }
  add(c.DISCLAIMER, 'constants.DISCLAIMER');
  add(c.REPORT_NOTICE, 'constants.REPORT_NOTICE');
  for (const cat of c.AI_FINDING_CATEGORIES) add(cat.replace(/_/g, ' '), 'constants.AI_FINDING_CATEGORIES');
  const rules = await import('@/lib/analysis/rules');
  for (const v of Object.values(rules.RULE_DESCRIPTIONS)) add(v, 'rules.RULE_DESCRIPTIONS');
  const settings = await import('@/lib/settings');
  for (const k of settings.SETTING_KEYS) add(settings.SETTING_DEFS[k].label, 'settings');
  const demo = await import('@/lib/demo-data');
  for (const s of demo.DEMO_SCENARIOS) {
    for (const v of [s.title, s.tagline, s.summary, s.outcomeNote, s.decisionNote, s.supplier.referenceSource, s.verification?.task, s.verification?.channelSource, ...s.missing]) add(v, 'demo-data');
    for (const f of s.findings) {
      add(f.explanation, 'demo-data');
      if (f.source === 'AI') add(f.label, 'demo-data');
    }
  }
  return out;
}

/** Rule categories as shown (underscores to spaces), for the agent summary and finding labels. */
export const RULE_CATEGORIES = [
  'iban format invalid', 'iban format valid', 'iban mismatch', 'no reference account', 'account mismatch', 'beneficiary name mismatch', 'email domain mismatch',
  'missing required field', 'independent check required', 'no reference channel', 'currency mismatch', 'amount unparseable', 'amount mismatch', 'request type mismatch',
  'reference not reviewed', 'reference match',
];
