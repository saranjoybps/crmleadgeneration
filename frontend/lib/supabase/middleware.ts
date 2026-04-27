import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: any;
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const requiresAuth = pathname.startsWith("/o/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthPath = ["/login", "/signup"].includes(request.nextUrl.pathname);

  if (requiresAuth && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPath && user) {
    try {
      const { data: primaryOrg } = await supabase.rpc("get_my_primary_org");
      const org = Array.isArray(primaryOrg) ? primaryOrg[0] : null;
      if (org?.organization_slug) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = `/o/${org.organization_slug}/dashboard`;
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // no-op fallback below
    }
  }

  if (user && (pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    try {
      const { data: primaryOrg } = await supabase.rpc("get_my_primary_org");
      const org = Array.isArray(primaryOrg) ? primaryOrg[0] : null;
      if (org?.organization_slug) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = pathname.replace(/^\/dashboard/, `/o/${org.organization_slug}/dashboard`);
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // keep response and let page-level redirect handle fallback.
    }
  }

  return response;
}
