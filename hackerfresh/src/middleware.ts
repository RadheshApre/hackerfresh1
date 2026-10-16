import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie. Authorisation is still enforced in each route/page.
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const sb = createServerClient(url, key, { cookies: {
    getAll: () => req.cookies.getAll(),
    setAll: (l: { name: string; value: string; options: CookieOptions }[]) => { l.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); l.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
  } });
  await sb.auth.getUser();
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"] };
