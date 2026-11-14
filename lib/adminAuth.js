import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Returns the logged-in admin session, or null.
export async function getAdminSession() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Unauthorized access. Please log in." },
    { status: 401 }
  );
}
