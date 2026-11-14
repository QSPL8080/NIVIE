import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Runs on the server before /panel is sent to the browser.
// No valid (unexpired) admin session → straight to the login page.
export function proxy(request) {
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
  matcher: ["/panel", "/panel/:path*"],
};
