import { prisma } from '@/lib/db';

/** Platform-configurable service limits. Values live in PlatformSetting; these are defaults. */
export const SETTING_DEFS = {
  max_file_size_mb: { label: 'Maximum upload size (MB)', default: 10, min: 1, max: 25 },
  max_cases_per_org: { label: 'Maximum cases per organization', default: 1000, min: 1, max: 100000 },
  max_analyses_per_org_per_day: { label: 'Analyses per organization per day', default: 200, min: 1, max: 10000 },
  max_source_chars: { label: 'Maximum characters analyzed per case', default: 30000, min: 1000, max: 120000 },
  agent_max_tool_calls: { label: 'Agent: maximum tool calls per run', default: 12, min: 7, max: 30 },
  agent_timeout_seconds: { label: 'Agent: maximum run time (seconds)', default: 90, min: 10, max: 300 },
  ai_timeout_seconds: { label: 'Model call timeout (seconds)', default: 60, min: 5, max: 180 },
  invitation_ttl_days: { label: 'Invitation validity (days)', default: 7, min: 1, max: 30 },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;
export const SETTING_KEYS = Object.keys(SETTING_DEFS) as SettingKey[];

export async function getSettings(): Promise<Record<SettingKey, number>> {
  const rows = await prisma.platformSetting.findMany();
  const out = {} as Record<SettingKey, number>;
  for (const k of SETTING_KEYS) {
    const raw = rows.find((r) => r.key === k)?.value;
    const n = raw === undefined ? NaN : Number(raw);
    const def = SETTING_DEFS[k];
    out[k] = Number.isFinite(n) ? Math.min(def.max, Math.max(def.min, Math.round(n))) : def.default;
  }
  return out;
}

export async function getSetting(k: SettingKey) {
  return (await getSettings())[k];
}
