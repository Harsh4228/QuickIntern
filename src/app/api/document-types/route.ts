import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { documentTypeSchema } from "@/lib/validations";
import { GET_DOCUMENT_TYPES, CHECK_DOC_TYPE, CREATE_DOCUMENT_TYPE } from "@/lib/graphql/queries";

// GET /api/document-types
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await hasuraRequest<{
    document_types: Array<{
      id: string;
      name: string;
      description: string | null;
      isRequired: boolean;
      isActive: boolean;
      acceptedFormats: string | null;
      maxSizeMb: number | null;
      documents_aggregate: { aggregate: { count: number } };
    }>;
  }>(GET_DOCUMENT_TYPES);

  const types = data.document_types.map((dt) => ({
    ...dt,
    _count: { documents: dt.documents_aggregate.aggregate.count },
  }));

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

  // Check uniqueness
  const existing = await hasuraRequest<{ document_types: Array<{ id: string }> }>(
    CHECK_DOC_TYPE,
    { name: parsed.data.name }
  );
  if (existing.document_types.length > 0) {
    return NextResponse.json({ error: "Document type already exists" }, { status: 409 });
  }

  const result = await hasuraRequest<{
    insert_document_types_one: {
      id: string;
      name: string;
      description: string | null;
      isRequired: boolean;
      isActive: boolean;
      acceptedFormats: string | null;
      maxSizeMb: number | null;
    };
  }>(
    CREATE_DOCUMENT_TYPE,
    {
      object: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isRequired: parsed.data.isRequired,
        acceptedFormats: parsed.data.acceptedFormats ?? null,
        maxSizeMb: parsed.data.maxSizeMb,
      },
    }
  );

  return NextResponse.json(
    { success: true, data: result.insert_document_types_one },
    { status: 201 }
  );
}
