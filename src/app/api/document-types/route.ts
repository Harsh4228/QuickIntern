import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentTypeSchema } from "@/lib/validations";

// GET /api/document-types
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const types = await prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: [{ isRequired: "desc" }, { name: "asc" }],
    include: { _count: { select: { documents: true } } },
  });

  return NextResponse.json({ data: types });
}

// POST /api/document-types (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = documentTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.documentType.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Document type already exists" }, { status: 409 });

  const dt = await prisma.documentType.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: dt }, { status: 201 });
}
