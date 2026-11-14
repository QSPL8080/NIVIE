import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getLeads, deleteLead } from "@/lib/db";

async function checkAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifyToken(token);
}

export async function GET() {
  const session = await checkAuth();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access. Please log in." },
      { status: 401 }
    );
  }

  try {
    const leads = await getLeads();
    return NextResponse.json({ success: true, leads });
  } catch (err) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Could not fetch leads from MySQL database.",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const session = await checkAuth();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access. Please log in." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Lead ID is required for deletion." },
        { status: 400 }
      );
    }

    const deleted = await deleteLead(id);
    return NextResponse.json({ success: deleted });
  } catch (err) {
    console.error("Error deleting lead:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete lead.", details: err.message },
      { status: 500 }
    );
  }
}
