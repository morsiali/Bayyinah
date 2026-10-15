import type { CaseDetail } from '@/lib/services/cases';

// Serialized (JSON) form of CaseDetail as received by client components.
type Jsonify<T> = T extends Date ? string : T extends (infer U)[] ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;
export type CaseData = Jsonify<Omit<CaseDetail, 'ctx'>> & { ctx: CaseDetail['ctx'] };
export type Me = { id: string; roles: string[] };
export type ProviderInfo = { label: string; model: string; external: boolean; kind: string };
