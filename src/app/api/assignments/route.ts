import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { assignManagerSchema, assignInternSchema } from "@/lib/validations";
import {
  GET_MANAGER_BY_USER_ID, GET_MANAGER_BY_USER_ID_WITH_DEPT,
  CLEAR_OLD_MANAGER_ASSIGNMENT, ASSIGN_MANAGER_TO_DEPT,
  UPDATE_MANAGER_DEPT, ASSIGN_INTERN_TO_MANAGER,
} from "@/lib/graphql/queries";

// POST /api/assignments
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { type } = body;

  if (type === "manager-department") {
    const parsed = assignManagerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { departmentId, managerId } = parsed.data;

    // Find manager record by userId
    const mgrData = await hasuraRequest<{ managers: Array<{ id: string }> }>(
      GET_MANAGER_BY_USER_ID,
      { userId: managerId }
    );
    if (!mgrData.managers[0]) return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    const managerRecord = mgrData.managers[0];

    // Clear old assignment for this manager from other departments
    await hasuraRequest(
      CLEAR_OLD_MANAGER_ASSIGNMENT,
      { userId: managerId }
    );

    // Assign manager to the new department and update manager's department_id
    const [deptResult] = await Promise.all([
      hasuraRequest<{ update_departments_by_pk: { id: string; name: string } | null }>(
        ASSIGN_MANAGER_TO_DEPT,
        { deptId: departmentId, userId: managerId }
      ),
      hasuraRequest(
        UPDATE_MANAGER_DEPT,
        { id: managerRecord.id, deptId: departmentId }
      ),
    ]);

    return NextResponse.json({ success: true, data: deptResult.update_departments_by_pk });
  }

  if (type === "intern-manager") {
    const parsed = assignInternSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { internId, managerId, departmentId } = parsed.data;

    // Find manager record by userId
    const mgrData = await hasuraRequest<{
      managers: Array<{ id: string; department_id: string | null }>;
    }>(
      GET_MANAGER_BY_USER_ID_WITH_DEPT,
      { userId: managerId }
    );
    if (!mgrData.managers[0]) return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    const managerRecord = mgrData.managers[0];

    const result = await hasuraRequest<{
      update_interns_by_pk: { id: string; manager_id: string | null; department_id: string | null } | null;
    }>(
      ASSIGN_INTERN_TO_MANAGER,
      {
        id: internId,
        managerId: managerRecord.id,
        deptId: departmentId ?? managerRecord.department_id ?? null,
      }
    );

    return NextResponse.json({ success: true, data: result.update_interns_by_pk });
  }

  return NextResponse.json({ error: "Invalid assignment type" }, { status: 400 });
}
