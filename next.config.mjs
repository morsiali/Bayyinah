/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  // Lets `npm run dev` serve its assets to GitHub Codespaces and tunnel addresses.
  allowedDevOrigins: ['*.app.github.dev', '*.trycloudflare.com'],
  poweredByHeader: false,
  serverExternalPackages: ['@prisma/client', 'bcryptjs', 'unpdf'],
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
