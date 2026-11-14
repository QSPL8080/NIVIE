import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/adminAuth";
import { getNotes, addNote, deleteNote } from "@/lib/db";

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

// Delete a note:  DELETE ?id=
export async function DELETE(req) {
  if (!(await getAdminSession())) return unauthorized();
  try {
    const id = new URL(req.url).searchParams.get("id");
    const deleted = await deleteNote(id);
    return NextResponse.json({ success: true, alreadyDeleted: !deleted });
  } catch (err) {
    console.error("Error deleting note:", err);
    return NextResponse.json({ success: false, error: "Could not delete the note." }, { status: 500 });
  }
}
