import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsageType } from "@prisma/client";

import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUse, trackUsage } from "@/lib/usage";
import { generateArticle } from "@/lib/ai/content-generator";
import { analyzeSeo } from "@/lib/ai/seo-analyzer";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createArticleSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(200),
  title: z.string().max(300).optional(),
  projectId: z.string().min(1, "Project ID is required"),
  tone: z
    .enum(["professional", "casual", "academic", "conversational", "persuasive"])
    .optional()
    .default("professional"),
  wordCount: z.number().int().min(300).max(5000).optional().default(1500),
});

// ---------------------------------------------------------------------------
// GET /api/articles - List user's articles with pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10))
    );
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (projectId) {
      where.projectId = projectId;
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/articles]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/articles - Generate a new article
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { keyword, title, projectId, tone, wordCount } = parsed.data;

    // Verify the project belongs to the user
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check usage limits
    const allowed = await canUse(session.user.id, UsageType.ARTICLE_GENERATED);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Monthly article generation limit reached. Upgrade your plan for more.",
        },
        { status: 403 }
      );
    }

    // Generate the article content
    const generated = await generateArticle({
      keyword,
      title,
      tone,
      wordCount,
    });

    // Run SEO analysis on the generated content
    const seoResult = await analyzeSeo(generated.content, keyword);

    // Save to database
    const article = await prisma.article.create({
      data: {
        title: generated.title,
        slug: generated.slug,
        content: generated.content,
        metaDescription: generated.metaDescription,
        targetKeyword: keyword,
        wordCount: generated.wordCount,
        seoScore: seoResult.score,
        status: "DRAFT",
        projectId,
        userId: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    // Track usage
    await trackUsage(session.user.id, UsageType.ARTICLE_GENERATED);

    return NextResponse.json({ article, seo: seoResult }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/articles]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
