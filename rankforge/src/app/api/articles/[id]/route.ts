import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().optional(),
  status: z.enum(["DRAFT", "OPTIMIZING", "PUBLISHED"]).optional(),
});

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

interface RouteContext {
  params: { id: string };
}

// ---------------------------------------------------------------------------
// GET /api/articles/[id] - Fetch a single article
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const article = await prisma.article.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (article.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("[GET /api/articles/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/articles/[id] - Update an article
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.article.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.content !== undefined) {
      updateData.content = parsed.data.content;
      updateData.wordCount = parsed.data.content
        .split(/\s+/)
        .filter(Boolean).length;
    }
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

    const article = await prisma.article.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error("[PATCH /api/articles/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/articles/[id] - Delete an article
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.article.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    await prisma.article.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/articles/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
