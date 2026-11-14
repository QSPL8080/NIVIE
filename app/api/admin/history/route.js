import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/adminAuth";
import { getStatusHistory } from "@/lib/db";

export const dynamic = "force-dynamic";

// Every status change for one lead, newest first:  GET ?leadId=
export async function GET(req) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const leadId = new URL(req.url).searchParams.get("leadId");
    return NextResponse.json({ success: true, history: await getStatusHistory(leadId) });
  } catch (err) {
    console.error("Error fetching status history:", err);
    return NextResponse.json({ success: false, error: "Could not load status history." }, { status: 500 });
  }
}
