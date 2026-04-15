import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { documentTypeSchema } from "@/lib/validations";
import { UPDATE_DOCUMENT_TYPE, DEACTIVATE_DOC_TYPE } from "@/lib/graphql/queries";

// PATCH /api/document-types/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = documentTypeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await hasuraRequest<{
    update_document_types_by_pk: {
      id: string;
      name: string;
      description: string | null;
      isRequired: boolean;
      isActive: boolean;
      acceptedFormats: string | null;
      maxSizeMb: number | null;
    } | null;
  }>(
    UPDATE_DOCUMENT_TYPE,
    {
      id,
      set: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isRequired: parsed.data.isRequired,
        acceptedFormats: parsed.data.acceptedFormats ?? null,
        maxSizeMb: parsed.data.maxSizeMb,
      },
    }
  );

  if (!result.update_document_types_by_pk) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.update_document_types_by_pk });
}

// DELETE /api/document-types/[id] (soft delete)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await hasuraRequest(
    DEACTIVATE_DOC_TYPE,
    { id }
  );

  return NextResponse.json({ success: true });
}

