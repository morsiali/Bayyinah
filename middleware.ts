import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';

// First gate only. Every page and API handler re-checks identity, membership and role on the server.
export async function middleware(req: NextRequest) {
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!claims) {
    // Build the sign-in URL on the address the visitor actually used. Behind a proxy (GitHub Codespaces,
    // tunnels, reverse proxies) that is the forwarded host, not the internal one.
    const url = req.nextUrl.clone();
    const fwdHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const fwdProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    if (fwdHost) {
      const [hostname, port] = fwdHost.split(':');
      url.hostname = hostname;
      url.port = port ?? ''; // the internal port never leaks into the public address
    }
    if (fwdProto === 'https' || fwdProto === 'http') url.protocol = `${fwdProto}:`;
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/platform/:path*'] };
