import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Pages that require a signed-in user. Everything else (including the public
// share page /alerte/*) is open. In demo mode (no Supabase configured) no
// check is performed.
const PROTECTED = ['/accueil', '/alertes', '/budget', '/question', '/aide', '/admin'];

export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !anon) return NextResponse.next();

  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && needsAuth) {
    const login = request.nextUrl.clone();
    login.pathname = '/connexion';
    return NextResponse.redirect(login);
  }

  if (user && pathname === '/connexion') {
    const home = request.nextUrl.clone();
    home.pathname = '/accueil';
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|icons|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|svg|ico|webmanifest|json|txt)$).*)',
  ],
};
