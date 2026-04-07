import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "intern-documents";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().optional(),
});

// PATCH /api/documents/[id] – review (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const doc = await prisma.document.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason ?? null,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
    },
    include: { documentType: true, user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ success: true, data: doc });
}

// DELETE /api/documents/[id] – delete document
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admin or the owning user can delete
  if (session.user.role !== "ADMIN" && doc.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdmin();
  await supabase.storage.from(BUCKET).remove([doc.filePath]);
  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
