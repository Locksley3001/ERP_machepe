import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultEmployeeModules, firstAllowedPath, isModuleKey, moduleFromPath } from "@/lib/permission-utils";

const protectedPrefixes = [
  "/pos",
  "/inventory",
  "/suppliers",
  "/purchases",
  "/production",
  "/recipes",
  "/menu",
  "/movements",
  "/alerts",
  "/costs",
  "/reports",
  "/reconstruction",
  "/audit"
];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestedModule = moduleFromPath(request.nextUrl.pathname);
  if (user && requestedModule) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.active) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }

    if (profile.role !== "admin") {
      const { data: permissions } = await supabase
        .from("profile_permissions")
        .select("module")
        .eq("profile_id", user.id)
        .eq("can_access", true);
      const allowedModules = (permissions ?? [])
        .map((permission) => String(permission.module))
        .filter(isModuleKey);
      const effectiveModules = allowedModules.length ? allowedModules : defaultEmployeeModules;

      if (!effectiveModules.includes(requestedModule)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = firstAllowedPath(effectiveModules);
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"]
};
