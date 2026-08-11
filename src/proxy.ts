import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zhs'];
const defaultLocale = 'en';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Ignore Next.js internals, API routes, and public files
  if (
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/api/') ||
    pathname.includes('.') // like /favicon.ico, /robots.txt, etc.
  ) {
    return;
  }

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // If no locale, we redirect to default or detected locale
  // For simplicity, we can default to en, or parse accept-language (omitted for brevity here)
  const locale = defaultLocale;
  
  // Redirect if there is no locale
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next).*)',
  ],
};
