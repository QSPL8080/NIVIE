import { NextResponse } from "next/server";
import { getAdminSession, unauthorized } from "@/lib/adminAuth";
import { getLeads, deleteLead, updateLeadStatus } from "@/lib/db";
import { isValidStatus } from "@/lib/leadStatus";

export const dynamic = "force-dynamic";

// List all leads (with status, notes count and latest note)
export async function GET() {
  if (!(await getAdminSession())) return unauthorized();

  try {
    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
  } catch (err) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      { success: false, error: "Could not fetch leads from MySQL database.", details: err.message },
      { status: 500 }
    );
  }
}

// Change a lead's status:  PATCH { id, status }
export async function PATCH(req) {
  const session = await getAdminSession();
  if (!session) return unauthorized();

  try {
    const { id, status } = await req.json();
    if (!isValidStatus(status)) {
      return NextResponse.json({ success: false, error: "Unknown status." }, { status: 400 });
    }
    const by = session.username || session.email || "Admin";
    const result = await updateLeadStatus(id, status, by);
    if (!result.found) {
      return NextResponse.json(
        { success: false, notFound: true, error: "This lead was deleted." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, status, changed: result.changed, changedAt: result.changedAt });
  } catch (err) {
    console.error("Error updating lead status:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update status.", details: err.message },
      { status: 500 }
    );
  }
}

// Delete a lead (its notes are removed with it):  DELETE ?id=
export async function DELETE(req) {
  if (!(await getAdminSession())) return unauthorized();

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Lead ID is required for deletion." }, { status: 400 });
    }

    // Permanently removes the row from the MySQL `leads` table.
    const deleted = await deleteLead(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, notFound: true, error: "This lead was already deleted." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete lead.", details: err.message },
      { status: 500 }
    );
  }
}
