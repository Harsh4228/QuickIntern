import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { departmentSchema } from "@/lib/validations";
import { GET_DEPARTMENT, UPDATE_DEPARTMENT, DEACTIVATE_DEPARTMENT } from "@/lib/graphql/queries";

// GET /api/departments/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const data = await hasuraRequest<{
    departments_by_pk: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      managerId: string | null;
      manager: { id: string; name: string; email: string } | null;
      interns: Array<{ id: string; userId: string; user: { name: string; email: string } }>;
      managers: Array<{ id: string; userId: string; user: { name: string; email: string } }>;
    } | null;
  }>(GET_DEPARTMENT, { id });

  if (!data.departments_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: data.departments_by_pk });
}

// PATCH /api/departments/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const result = await hasuraRequest<{
    update_departments_by_pk: { id: string; name: string; description: string | null; isActive: boolean } | null;
  }>(
    UPDATE_DEPARTMENT,
    { id, set: { name: parsed.data.name, description: parsed.data.description ?? null } }
  );

  if (!result.update_departments_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: result.update_departments_by_pk });
}

// DELETE /api/departments/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await hasuraRequest(
    DEACTIVATE_DEPARTMENT,
    { id }
  );

  return NextResponse.json({ success: true });
}

