import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, setSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

// The panel calls this while the admin is active, so the 10-minute session keeps
// sliding forward. If nobody is active, no ping arrives and the session expires.
export async function POST(req) {
  const cookieStore = await cookies();
  const session = verifyToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return setSessionCookie(NextResponse.json({ authenticated: true }), session, req);
}
