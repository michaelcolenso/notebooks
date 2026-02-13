import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsageType } from "@prisma/client";

import { getServerSession } from "@/lib/auth";
import { canUse, trackUsage } from "@/lib/usage";
import { analyzeSeo } from "@/lib/ai/seo-analyzer";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const seoAnalyzeSchema = z.object({
  content: z.string().min(1, "Content is required").max(50000),
  keyword: z.string().min(1, "Keyword is required").max(200),
});

// ---------------------------------------------------------------------------
// POST /api/seo/analyze
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = seoAnalyzeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { content, keyword } = parsed.data;

    // Check usage limits
    const allowed = await canUse(session.user.id, UsageType.SEO_ANALYSIS);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Monthly SEO analysis limit reached. Upgrade your plan for more.",
        },
        { status: 403 }
      );
    }

    // Perform analysis
    const result = await analyzeSeo(content, keyword);

    // Track usage
    await trackUsage(session.user.id, UsageType.SEO_ANALYSIS);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/seo/analyze]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
