import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: any;
};

async function resolveTenantSlug(supabase: any) {
  const { data, error } = await supabase.rpc("ensure_user_tenant", { p_tenant_slug: null });
  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return String(data[0].tenant_slug ?? "").trim() || null;
}

export async function updateSession(request: NextRequest) {
  const isServerAction = request.method === "POST" && request.headers.get("next-action") !== null;
  if (isServerAction) {
    return NextResponse.next({ request });
  }

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
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const requiresAuth = pathname.startsWith("/o/") || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthPath = ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);

  if (requiresAuth && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isAuthPath || pathname === "/dashboard" || pathname.startsWith("/dashboard/"))) {
    const slug = await resolveTenantSlug(supabase);
    if (slug) {
      const redirectUrl = request.nextUrl.clone();
      if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
        redirectUrl.pathname = pathname.replace(/^\/dashboard/, `/o/${slug}/dashboard`);
      } else {
        redirectUrl.pathname = `/o/${slug}/dashboard`;
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
