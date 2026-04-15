import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  GET_DOCUMENTS, GET_DOC_TYPE_BY_PK, FIND_EXISTING_DOC,
  DELETE_DOC, INSERT_DOCUMENT,
} from "@/lib/graphql/queries";

const BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "intern-documents";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB hard cap

// GET /api/documents – list documents
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  const andConditions: Record<string, unknown>[] = [];

  if (session.user.role === "INTERN") {
    andConditions.push({ userId: { _eq: session.user.id } });
  } else if (userId) {
    andConditions.push({ userId: { _eq: userId } });
  }

  if (status) andConditions.push({ status: { _eq: status } });

  const where = andConditions.length > 0 ? { _and: andConditions } : {};

  const data = await hasuraRequest<{
    documents: Array<{
      id: string;
      userId: string;
      documentTypeId: string;
      fileName: string;
      originalName: string;
      fileUrl: string;
      filePath: string;
      fileSize: number | null;
      mimeType: string | null;
      status: string;
      rejectionReason: string | null;
      reviewedAt: string | null;
      reviewedBy: string | null;
      createdAt: string;
      user: { id: string; name: string; email: string };
      document_type: { id: string; name: string; isRequired: boolean };
    }>;
  }>(GET_DOCUMENTS, { where });

  // Reshape document_type → documentType to match frontend expectations
  const docs = data.documents.map(({ document_type, ...d }) => ({
    ...d,
    documentType: document_type,
  }));

  return NextResponse.json({ data: docs });
}

// POST /api/documents – upload a document
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const documentTypeId = formData.get("documentTypeId") as string | null;
  const targetUserId = (formData.get("userId") as string | null) ?? session.user.id;

  if (!file || !documentTypeId) {
    return NextResponse.json({ error: "file and documentTypeId are required" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds maximum size of 10 MB" }, { status: 413 });
  }

  // Validate document type exists
  const docTypeData = await hasuraRequest<{
    document_types_by_pk: { id: string; name: string; isRequired: boolean; acceptedFormats: string | null } | null;
  }>(GET_DOC_TYPE_BY_PK, { id: documentTypeId });
  const docType = docTypeData.document_types_by_pk;
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

  // Remove previous pending document of same type for this user
  const existingDoc = await hasuraRequest<{
    documents: Array<{ id: string; filePath: string }>;
  }>(FIND_EXISTING_DOC, { userId: targetUserId, docTypeId: documentTypeId });

  if (existingDoc.documents[0]) {
    const prev = existingDoc.documents[0];
    await supabase.storage.from(BUCKET).remove([prev.filePath]);
    await hasuraRequest(
      DELETE_DOC,
      { id: prev.id }
    );
  }

  // Insert new document record
  const result = await hasuraRequest<{
    insert_documents_one: {
      id: string;
      userId: string;
      documentTypeId: string;
      fileName: string;
      originalName: string;
      fileUrl: string;
      filePath: string;
      fileSize: number | null;
      mimeType: string | null;
      status: string;
      createdAt: string;
      document_type: { id: string; name: string };
    };
  }>(
    INSERT_DOCUMENT,
    {
      object: {
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
    }
  );

  const doc = result.insert_documents_one;
  return NextResponse.json(
    {
      success: true,
      data: {
        ...doc,
        documentType: doc.document_type,
      },
    },
    { status: 201 }
  );
}
