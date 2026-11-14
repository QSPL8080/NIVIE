import { NextResponse } from "next/server";
import { verifyCredentials, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();

    const user = verifyCredentials(identifier, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email/username or password." },
        { status: 401 }
      );
    }

    // Session lasts 10 minutes and is extended while the admin is active in the panel.
    const response = NextResponse.json({ success: true, user });
    return setSessionCookie(response, user, req);
  } catch (err) {
    console.error("Login error:", err.message);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
