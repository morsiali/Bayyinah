// Server-only configuration. Nothing here is sent to the browser.
export const env = {
  authSecret: () => {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 32) {
      if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be set (32+ characters).');
      return 'insecure-development-secret-change-me-please';
    }
    return s;
  },
  appUrl: () => {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    // GitHub Codespaces: build the forwarded address automatically.
    if (process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
      return `https://${process.env.CODESPACE_NAME}-${process.env.PORT || 3000}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    }
    return 'http://localhost:3000';
  },
  storageDir: () => process.env.STORAGE_DIR || './storage',
  showDemoAccounts: () => process.env.SHOW_DEMO_ACCOUNTS === 'true',
  secureCookies: () => (process.env.APP_URL || '').startsWith('https://') || !!process.env.CODESPACE_NAME,
};
