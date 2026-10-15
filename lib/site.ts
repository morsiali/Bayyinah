export const site = {
  name: 'Bayyinah',
  arabicName: 'بيّنة',
  tagline: 'Turn a payment request into an evidence-backed decision.',
  // Placeholder contact address on a reserved domain — set NEXT_PUBLIC_CONTACT_EMAIL before launch.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'hello@bayyinah.example',
};

/** True when building the static GitHub Pages showcase (no server, no database). */
export const IS_STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === '1';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const REPO_URL = 'https://github.com/morsiali/Bayyinah';
export const CODESPACES_URL = 'https://codespaces.new/morsiali/Bayyinah?quickstart=1';

/** Links into the signed-in product. On the static showcase they lead to a page explaining how to open it. */
export const liveHref = (path: string) => (IS_STATIC_SITE ? '/live' : path);
