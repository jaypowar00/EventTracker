import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/login', '/api/register'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Allow public paths
    if (PUBLIC_PATHS.some(path => pathname.startsWith(path)) || pathname === '/') {
        return NextResponse.next();
    }

    // 2. Allow static assets and internal next paths
    if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // 3. Check for token
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // 4. Verify token
    const payload = await verifyToken(token) as any;

    if (!payload) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // 5. Role-based Access Control (RBAC)
    if (pathname === '/admin' && payload.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // 5. Add user info to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
