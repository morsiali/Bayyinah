import { afterEach, describe, expect, it } from 'vitest';
import { route } from '@/lib/api';
import { env } from '@/lib/env';

const handler = route(async () => ({ ok: true }));
const call = (headers: Record<string, string>, method = 'POST') => handler(new Request('http://localhost:3000/api/x', { method, headers }), { params: Promise.resolve({}) });

const saved = { ...process.env };
afterEach(() => {
  for (const k of ['APP_URL', 'CODESPACE_NAME', 'GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN', 'PORT']) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('Cross-site request protection', () => {
  it('accepts same-host and requests without an Origin header', async () => {
    expect((await call({ host: 'localhost:3000', origin: 'http://localhost:3000' })).status).toBe(200);
    expect((await call({ host: 'localhost:3000' })).status).toBe(200);
  });
  it('rejects a foreign origin', async () => {
    const r = await call({ host: 'localhost:3000', origin: 'https://evil.example' });
    expect(r.status).toBe(403);
  });
  it('accepts the proxy-forwarded host (reverse proxies, tunnels)', async () => {
    expect((await call({ host: 'localhost:3000', 'x-forwarded-host': 'abc.trycloudflare.com', origin: 'https://abc.trycloudflare.com' })).status).toBe(200);
  });
  it('accepts the GitHub Codespaces forwarded address even without forwarding headers', async () => {
    process.env.CODESPACE_NAME = 'fluffy-space-x1';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';
    expect((await call({ host: 'localhost:3000', origin: 'https://fluffy-space-x1-3000.app.github.dev' })).status).toBe(200);
    expect((await call({ host: 'localhost:3000', origin: 'https://other-space-3000.app.github.dev' })).status).toBe(403);
  });
  it('accepts the configured APP_URL host', async () => {
    process.env.APP_URL = 'https://bayyinah.example.ae';
    expect((await call({ host: 'internal:3000', origin: 'https://bayyinah.example.ae' })).status).toBe(200);
  });
  it('does not check GET requests', async () => {
    expect((await call({ host: 'localhost:3000', origin: 'https://evil.example' }, 'GET')).status).toBe(200);
  });
});

describe('Public URL detection', () => {
  it('prefers APP_URL, then Codespaces, then localhost', () => {
    delete process.env.APP_URL;
    delete process.env.CODESPACE_NAME;
    expect(env.appUrl()).toBe('http://localhost:3000');
    process.env.CODESPACE_NAME = 'fluffy-space-x1';
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN = 'app.github.dev';
    expect(env.appUrl()).toBe('https://fluffy-space-x1-3000.app.github.dev');
    process.env.APP_URL = 'https://bayyinah.example.ae/';
    expect(env.appUrl()).toBe('https://bayyinah.example.ae');
  });
});
