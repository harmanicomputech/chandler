import { NextResponse, type NextRequest } from 'next/server';

/**
 * Multi-site routing. One deployment serves both platforms:
 *   - Visit Chandler on its own host (default), at the root (legacy URLs preserved),
 *   - Economic Development on EDO_HOSTS (e.g. business.chandleraz.gov) — requests are rewritten into /edo/*.
 * In local development the EDO site is also reachable at /edo/ on the same host.
 * Admin routes get a fast cookie presence check here; real authorisation happens server-side.
 */
const EDO_HOSTS = (process.env.EDO_HOSTS ?? 'edo.localhost,business.localhost').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
const PASSTHROUGH = /^\/(_next|api|images|brand|admin|favicon|robots\.txt|sitemap)/;

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(':')[0].toLowerCase();

  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login') && !req.cookies.has('cc_session')) {
    return NextResponse.redirect(new URL('/admin/login/', req.url));
  }
  if (EDO_HOSTS.includes(host) && !url.pathname.startsWith('/edo') && !PASSTHROUGH.test(url.pathname)) {
    const r = url.clone(); r.pathname = '/edo' + url.pathname;
    return NextResponse.rewrite(r, { headers: { 'x-site': 'edo' } });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|images/|brand/|favicon).*)'] };
