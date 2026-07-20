import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  // ─── 1. EXTRACT PROXY HEADERS ───
  const isHttps = request.headers.get('x-forwarded-proto') === 'https' || request.nextUrl.protocol === 'https:';
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host;

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // ─── 2. INITIALIZE PROXY-AWARE SUPABASE CLIENT ───
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          // Force cookie domain and secure flag based on proxy headers
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: isHttps,
              domain: host.split(':')[0], // Strip port if present
              sameSite: 'lax',
            });
          });
        },
      },
    }
  );

  // ─── 3. FETCH USER & SECURITY CONTEXT ───
  const { data: { user } } = await supabase.auth.getUser();

  // Create a proxy-aware URL for redirects
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = isHttps ? 'https:' : 'http:';
  redirectUrl.host = host;
  redirectUrl.port = ''; // Clear port as proxy handles it

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');

  // Group all protected routes here
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/attendance');

  // If no user exists and they try to access a protected route, boot them
  if (!user) {
    if (isProtectedRoute) {
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // ─── 4. ROLE & MFA ENFORCEMENT ───
  // Fetch the user's specific profile flags and their current MFA assurance level
  const [profileResponse, aalResponse] = await Promise.all([
    supabase.from('profiles').select('role, requires_pin_change').eq('id', user.id).single(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);

  const profile = profileResponse.data;
  const aal = aalResponse.data;

  const isPinPending = profile?.requires_pin_change === true;
  const isSuperAdmin = profile?.role === 'super_admin';

  // A super admin's MFA is pending if they are only at Assurance Level 1 (Password/PIN only)
  // They MUST reach Assurance Level 2 (TOTP Verified) to proceed
  const isMfaPending = isSuperAdmin && aal?.currentLevel === 'aal1';

  // If they need to change their PIN *or* verify MFA, they require action on the login page
  const needsAuthAction = isPinPending || isMfaPending;

  if (isProtectedRoute && needsAuthAction) {
    // Prevent access to the dashboard or attendance until requirements are met
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthRoute && !needsAuthAction) {
    // If they are fully authenticated (MFA done if required, PIN changed) and try to view the login page
    redirectUrl.pathname = '/admin'; // Fallback redirect upon successful login sequence
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

// Ensure the middleware only runs on page routes, skipping static assets and images
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};