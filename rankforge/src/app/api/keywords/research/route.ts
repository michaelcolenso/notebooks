import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsageType } from "@prisma/client";

import { getServerSession } from "@/lib/auth";
import { canUse, trackUsage } from "@/lib/usage";
import { createKeywordResearcher } from "@/lib/ai/keyword-research";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const keywordResearchSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(200),
});

// ---------------------------------------------------------------------------
// POST /api/keywords/research
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = keywordResearchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { keyword } = parsed.data;

    // Check usage limits
    const allowed = await canUse(session.user.id, UsageType.KEYWORD_RESEARCH);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Monthly keyword research limit reached. Upgrade your plan for more.",
        },
        { status: 403 }
      );
    }

    // Perform research
    const researcher = createKeywordResearcher();
    const result = await researcher.analyzeKeyword(keyword);

    // Track usage
    await trackUsage(session.user.id, UsageType.KEYWORD_RESEARCH);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/keywords/research]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
