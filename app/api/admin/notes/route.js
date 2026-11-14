import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/adminAuth";
import { getNotes, addNote, updateNote } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_NOTE = 2000;

// Notes for one lead:  GET ?leadId=
export async function GET(req) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const leadId = new URL(req.url).searchParams.get("leadId");
    return NextResponse.json({ success: true, notes: await getNotes(leadId) });
  } catch (err) {
    console.error("Error fetching notes:", err);
    return NextResponse.json({ success: false, error: "Could not load notes." }, { status: 500 });
  }
}

// Add a note:  POST { leadId, note }
export async function POST(req) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const { leadId, note } = await req.json();
    const text = String(note ?? "").trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "Write a note first." }, { status: 400 });
    }
    if (text.length > MAX_NOTE) {
      return NextResponse.json(
        { success: false, error: `Notes can be up to ${MAX_NOTE} characters.` },
        { status: 400 }
      );
    }
    const saved = await addNote(leadId, text);
    if (!saved) {
      return NextResponse.json({ success: false, notFound: true, error: "This lead was deleted." }, { status: 404 });
    }
    return NextResponse.json({ success: true, note: saved });
  } catch (err) {
    console.error("Error adding note:", err);
    return NextResponse.json({ success: false, error: "Could not save the note." }, { status: 500 });
  }
}

// Edit a note:  PATCH { id, note }   (notes can be edited, never deleted)
export async function PATCH(req) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const { id, note } = await req.json();
    const text = String(note ?? "").trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "A note can't be empty." }, { status: 400 });
    }
    if (text.length > MAX_NOTE) {
      return NextResponse.json(
        { success: false, error: `Notes can be up to ${MAX_NOTE} characters.` },
        { status: 400 }
      );
    }
    const saved = await updateNote(id, text);
    if (!saved) {
      return NextResponse.json({ success: false, notFound: true, error: "This note no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ success: true, note: saved });
  } catch (err) {
    console.error("Error editing note:", err);
    return NextResponse.json({ success: false, error: "Could not save the change." }, { status: 500 });
  }
}
