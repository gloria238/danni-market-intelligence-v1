import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected pages — redirect to login if unauthenticated
  const protectedPaths = ["/research", "/divergences", "/patterns", "/timeline"];
  const isProtectedPage = protectedPaths.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );

  if (isProtectedPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Protected API — return 401 JSON, never redirect (API consumers need JSON errors)
  const apiProtected =
    request.nextUrl.pathname.startsWith("/api/research") ||
    request.nextUrl.pathname.startsWith("/api/patterns") ||
    request.nextUrl.pathname.startsWith("/api/timeline") ||
    request.nextUrl.pathname.startsWith("/api/divergences");

  if (apiProtected && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Redirect authenticated users away from auth pages → scanner is the new home
  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") && user) {
    return NextResponse.redirect(new URL("/divergences", request.url));
  }

  return supabaseResponse;
}
