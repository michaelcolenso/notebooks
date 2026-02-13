import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth";
import { getUsageInfo } from "@/lib/usage";

// ---------------------------------------------------------------------------
// GET /api/usage - Get current month's usage breakdown and limits
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usageInfo = await getUsageInfo(session.user.id);

    return NextResponse.json(usageInfo);
  } catch (error) {
    console.error("[GET /api/usage]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
