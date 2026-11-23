import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const LEGAL_PAGES = ["/privacy-policy", "/terms-and-conditions", "/cookie-policy"];

// Runs on the server before /panel (and the legal pages) are sent to the browser.
// No valid (unexpired) admin session → straight to the login page.
export function proxy(request) {
  // /PRIVACY-POLICY, /Privacy-Policy … → /privacy-policy
  const { pathname } = request.nextUrl;
  const lower = pathname.toLowerCase().replace(/\/+$/, "");
  if (LEGAL_PAGES.includes(lower)) {
    if (pathname === lower) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = lower;
    return NextResponse.redirect(url, 308);
  }
  if (!pathname.startsWith("/panel")) return NextResponse.next();

  const session = verifyToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    const url = new URL("/login", request.url);
    if (request.cookies.get(SESSION_COOKIE_NAME)?.value) url.searchParams.set("reason", "expired");
    const res = NextResponse.redirect(url);
    res.cookies.set({ name: SESSION_COOKIE_NAME, value: "", maxAge: 0, path: "/" });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  // Legal pages are matched in any letter case, so the pattern below can't list them literally.
  matcher: ["/panel", "/panel/:path*", "/((?!_next|api|images|videos|fonts)[^/.]+)"],
};
