import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { updateManagerSchema } from "@/lib/validations";
import {
  GET_MANAGER, GET_MANAGER_BASIC, UPDATE_USER, UPDATE_MANAGER_PROFILE,
  SET_DEPARTMENT_MANAGER, CLEAR_DEPARTMENT_MANAGER, GET_MANAGER_UPDATED,
  GET_MANAGER_USER_ID, DEACTIVATE_USER,
} from "@/lib/graphql/queries";

// GET /api/managers/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const data = await hasuraRequest<{
    managers_by_pk: {
      id: string;
      userId: string;
      designation: string | null;
      departmentId: string | null;
      user: { id: string; name: string; email: string; phone: string | null; isActive: boolean };
      department: { id: string; name: string; description: string | null } | null;
      interns: Array<{ id: string; userId: string; user: { name: string; email: string } }>;
    } | null;
  }>(GET_MANAGER, { id });

  if (!data.managers_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: data.managers_by_pk });
}

// PATCH /api/managers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = updateManagerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Fetch existing manager
  const existing = await hasuraRequest<{
    managers_by_pk: { id: string; userId: string; departmentId: string | null } | null;
  }>(
    GET_MANAGER_BASIC,
    { id }
  );
  const manager = existing.managers_by_pk;
  if (!manager) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, phone, designation, departmentId } = parsed.data;

  // Update user record
  await hasuraRequest(
    UPDATE_USER,
    {
      id: manager.userId,
      set: {
        name,
        phone: phone ?? null,
        ...(email ? { email: email.toLowerCase() } : {}),
      },
    }
  );

  // Update manager profile
  await hasuraRequest(
    UPDATE_MANAGER_PROFILE,
    {
      id,
      set: {
        designation: designation ?? null,
        departmentId: departmentId ?? null,
      },
    }
  );

  // Sync department manager_id assignment
  if (departmentId) {
    await hasuraRequest(
      SET_DEPARTMENT_MANAGER,
      { deptId: departmentId, userId: manager.userId }
    );
  } else if (manager.departmentId) {
    // Remove manager from their old department
    await hasuraRequest(
      CLEAR_DEPARTMENT_MANAGER,
      { userId: manager.userId }
    );
  }

  // Return updated manager data
  const updated = await hasuraRequest<{
    managers_by_pk: {
      id: string; userId: string; designation: string | null; departmentId: string | null;
      user: { id: string; name: string; email: string; phone: string | null };
    } | null;
  }>(GET_MANAGER_UPDATED, { id });

  return NextResponse.json({ success: true, data: updated.managers_by_pk });
}

// DELETE /api/managers/[id] – soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await hasuraRequest<{
    managers_by_pk: { userId: string } | null;
  }>(GET_MANAGER_USER_ID, { id });
  if (!existing.managers_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await hasuraRequest(
    DEACTIVATE_USER,
    { id: existing.managers_by_pk.userId }
  );

  return NextResponse.json({ success: true });
}
