import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from '@/lib/db/auth/tokens';
import { getDb } from '@/lib/db/mongo';
import {
  createRequestContext,
  extractCorrelationId,
  generateCausationId,
  generateCorrelationId,
} from '@/lib/utils/correlation';
import { createLogger } from '@/lib/utils/logger';
import { checkRateLimit, getClientIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/utils/rate-limit';

/** Database and file routes back every client-side query, so the per-minute API limit does not apply. */
const UNLIMITED_API = ['/api/db', '/api/storage'];

const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard/admin',
  coach: '/dashboard/coach',
  athlete: '/dashboard/athlete',
};

function rateLimited(request: NextRequest, config: (typeof RATE_LIMIT_CONFIGS)['API']) {
  const { allowed, retryAfter } = checkRateLimit(getClientIdentifier(request), config);
  if (allowed) return null;
  return NextResponse.json(
    { error: 'Too many requests', message: 'Too many requests. Please wait and try again', retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter?.toString() || '60',
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + (retryAfter || 60) * 1000).toISOString(),
      },
    }
  );
}

/** Where a signed-in user must go instead of `pathname`, or null to let the request through. */
async function dashboardRedirect(userId: string, pathname: string, log: ReturnType<typeof createLogger>) {
  const db = await getDb();
  const roleRow = await db.collection('user_roles').findOne({ user_id: userId });
  const role = (roleRow?.role as string) || 'athlete';
  log.info('User authentication', { role, path: pathname });

  // Athletes need an active membership (profiles.membership_status) for everything
  // except their applications page; admins and coaches skip this check.
  if (role === 'athlete') {
    const profile = await db.collection('profiles').findOne({ id: userId }, { projection: { membership_status: 1 } });
    const status = profile?.membership_status ?? null;
    if (status === null) return '/register-membership';
    if (status !== 'active' && !pathname.startsWith('/dashboard/athlete/applications')) {
      log.info('Redirecting to pending-approval', { status, path: pathname });
      return '/pending-approval';
    }
  }

  const home = ROLE_HOME[role] ?? ROLE_HOME.athlete;
  if (pathname === '/dashboard') return home;
  const otherDashboard = Object.values(ROLE_HOME).some((p) => p !== home && pathname.startsWith(p));
  if (otherDashboard) {
    log.warn('User trying to access another role dashboard', { role, attemptedPath: pathname });
    return home;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth')) {
    const limited = rateLimited(request, RATE_LIMIT_CONFIGS.AUTH);
    if (limited) return limited;
  }
  if (pathname.startsWith('/api/') && !UNLIMITED_API.some((p) => pathname.startsWith(p))) {
    const limited = rateLimited(request, RATE_LIMIT_CONFIGS.API);
    if (limited) return limited;
  }

  const correlationId = extractCorrelationId(request.headers) || generateCorrelationId();
  const causationId = generateCausationId();
  const context = createRequestContext(correlationId, undefined, request.url, request.method);
  const withIds = (response: NextResponse) => {
    response.headers.set('X-Correlation-ID', correlationId);
    response.headers.set('X-Causation-ID', causationId);
    return response;
  };
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return withIds(NextResponse.redirect(url));
  };

  try {
    const claims = verifySession(request.cookies.get(SESSION_COOKIE)?.value);

    if (pathname.startsWith('/dashboard')) {
      if (!claims) return redirectTo('/login');
      context.userId = claims.sub;
      const target = await dashboardRedirect(claims.sub, pathname, createLogger(context));
      if (target) return redirectTo(target);
    }

    const response = withIds(NextResponse.next({ request }));
    // Sliding session: renew the cookie once less than a day is left.
    if (claims && claims.exp * 1000 - Date.now() < 24 * 60 * 60 * 1000) {
      response.cookies.set(SESSION_COOKIE, signSession(claims.sub, claims.email).token, sessionCookieOptions());
    }
    return response;
  } catch (error) {
    createLogger(context).error('Proxy error', error as Error, { url: request.url, method: request.method });
    return withIds(NextResponse.next({ request }));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
