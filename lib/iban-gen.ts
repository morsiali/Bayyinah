// Builds checksum-valid IBANs from a country code and BBAN (used for fictional seed/demo data only).
export function makeIban(country: string, bban: string): string {
  const rearranged = bban + country + '00';
  let rem = 0;
  for (const ch of rearranged.toUpperCase()) {
    const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  const check = String(98 - rem).padStart(2, '0');
  return `${country}${check}${bban}`;
}
