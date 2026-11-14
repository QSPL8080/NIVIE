import { NextResponse } from "next/server";
import { saveLead } from "@/lib/db";

// Always run on the server at request time (never pre-rendered).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  }

  const name = clean(body.name, 120);
  // Accepts "+91 9876543210", "9876543210", "+919876543210"
  const digits = String(body.mobile ?? body.phone ?? "")
    .replace(/\D/g, "")
    .replace(/^91(?=\d{10}$)/, "");
  const budget = clean(body.interiorBudget ?? body.budget, 100);
  const location = clean(body.propertyLocation ?? body.location, 120);
  const type = clean(body.propertyType ?? body.type, 100);
  const timeline = clean(body.projectTimeline ?? body.timeline, 100);
  const source = clean(body.source || "Website", 60);

  if (name.length < 2) {
    return NextResponse.json({ success: false, error: "Please enter your full name." }, { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid 10-digit mobile number starting with 6, 7, 8 or 9." },
      { status: 400 }
    );
  }

  try {
    const id = await saveLead({ name, phone: "+91 " + digits, budget, location, type, timeline, source });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    // Full error stays in the server terminal; visitors only see a generic message.
    console.error("[leads] MySQL save failed:", err.code || "", err.message);
    return NextResponse.json(
      { success: false, error: "We couldn't save your enquiry right now." },
      { status: 500 }
    );
  }
}
