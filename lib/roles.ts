import { ROLES, type Role } from './constants';

export function parseRoles(csv: string | null | undefined): Role[] {
  if (!csv) return [];
  const set = new Set(csv.split(',').map((r) => r.trim()).filter((r): r is Role => (ROLES as readonly string[]).includes(r)));
  return ROLES.filter((r) => set.has(r));
}

export function serializeRoles(roles: readonly string[]): string {
  return parseRoles(roles.join(',')).join(',');
}

export function hasRole(csvOrList: string | readonly string[], role: Role): boolean {
  const list = typeof csvOrList === 'string' ? parseRoles(csvOrList) : csvOrList;
  return list.includes(role);
}
