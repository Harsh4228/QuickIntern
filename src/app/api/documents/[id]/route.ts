import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { createSupabaseAdmin } from "@/lib/supabase";
import { REVIEW_DOCUMENT, GET_DOC_FOR_DELETE, DELETE_DOC } from "@/lib/graphql/queries";
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

  const result = await hasuraRequest<{
    update_documents_by_pk: {
      id: string;
      status: string;
      rejectionReason: string | null;
      reviewedAt: string | null;
      reviewedBy: string | null;
      document_type: { id: string; name: string };
      user: { name: string; email: string };
    } | null;
  }>(
    REVIEW_DOCUMENT,
    {
      id,
      set: {
        status: parsed.data.status,
        rejectionReason: parsed.data.rejectionReason ?? null,
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.user.id,
      },
    }
  );

  if (!result.update_documents_by_pk) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = result.update_documents_by_pk;
  return NextResponse.json({
    success: true,
    data: {
      ...doc,
      documentType: doc.document_type,
    },
  });
}

// DELETE /api/documents/[id] – delete document
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Fetch the document
  const docData = await hasuraRequest<{
    documents_by_pk: { id: string; userId: string; filePath: string } | null;
  }>(GET_DOC_FOR_DELETE, { id });
  const doc = docData.documents_by_pk;
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admin or document owner can delete
  if (session.user.role !== "ADMIN" && doc.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createSupabaseAdmin();
  await supabase.storage.from(BUCKET).remove([doc.filePath]);

  await hasuraRequest(
    DELETE_DOC,
    { id }
  );

  return NextResponse.json({ success: true });
}

