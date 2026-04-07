import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "intern-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB hard cap

// GET /api/documents – list documents
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  let whereUserId: string | undefined;
  if (session.user.role === "INTERN") {
    // Interns can only see their own documents
    whereUserId = session.user.id;
  } else if (userId) {
    whereUserId = userId;
  }

  const docs = await prisma.document.findMany({
    where: {
      ...(whereUserId ? { userId: whereUserId } : {}),
      ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      documentType: { select: { id: true, name: true, isRequired: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: docs });
}

// POST /api/documents – upload a document
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const documentTypeId = formData.get("documentTypeId") as string | null;
  // Admin can upload on behalf of another user
  const targetUserId = (formData.get("userId") as string | null) ?? session.user.id;

  if (!file || !documentTypeId) {
    return NextResponse.json({ error: "file and documentTypeId are required" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds maximum size of 10 MB" }, { status: 413 });
  }

  // Validate document type exists
  const docType = await prisma.documentType.findUnique({ where: { id: documentTypeId } });
  if (!docType) return NextResponse.json({ error: "Document type not found" }, { status: 404 });

  // Validate accepted formats
  if (docType.acceptedFormats) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowed = docType.acceptedFormats.split(",").map((f) => f.trim().toLowerCase());
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `File format not allowed. Accepted: ${docType.acceptedFormats}` }, { status: 415 });
    }
  }

  const supabase = createSupabaseAdmin();

  // Build safe file path: userId/docTypeId/timestamp-filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${targetUserId}/${documentTypeId}/${timestamp}-${safeName}`;

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "File upload failed", detail: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  // Remove previous pending document of same type for this user (replace)
  const existing = await prisma.document.findFirst({
    where: { userId: targetUserId, documentTypeId, status: "PENDING" },
  });
  if (existing) {
    await supabase.storage.from(BUCKET).remove([existing.filePath]);
    await prisma.document.delete({ where: { id: existing.id } });
  }

  const doc = await prisma.document.create({
    data: {
      userId: targetUserId,
      documentTypeId,
      fileName: `${timestamp}-${safeName}`,
      originalName: file.name,
      fileUrl: publicUrlData.publicUrl,
      filePath,
      fileSize: file.size,
      mimeType: file.type,
      status: "PENDING",
    },
    include: { documentType: true },
  });

  return NextResponse.json({ success: true, data: doc }, { status: 201 });
}
