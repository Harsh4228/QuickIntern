import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { departmentSchema } from "@/lib/validations";
import { GET_DEPARTMENTS, CHECK_DEPARTMENT, CREATE_DEPARTMENT } from "@/lib/graphql/queries";

// GET /api/departments
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await hasuraRequest<{
    departments: Array<{
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      managerId: string | null;
      manager: { id: string; name: string; email: string } | null;
      interns_aggregate: { aggregate: { count: number } };
      managers_aggregate: { aggregate: { count: number } };
    }>;
  }>(GET_DEPARTMENTS);

  const departments = data.departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    isActive: d.isActive,
    managerId: d.managerId,
    manager: d.manager,
    _count: {
      interns: d.interns_aggregate.aggregate.count,
      managers: d.managers_aggregate.aggregate.count,
    },
  }));

  return NextResponse.json({ data: departments });
}

// POST /api/departments
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Check if department already exists
  const existing = await hasuraRequest<{ departments: Array<{ id: string }> }>(
    CHECK_DEPARTMENT,
    { name: parsed.data.name }
  );
  if (existing.departments.length > 0) {
    return NextResponse.json({ error: "Department already exists" }, { status: 409 });
  }

  const result = await hasuraRequest<{ insert_departments_one: { id: string; name: string; description: string | null; isActive: boolean; createdAt: string } }>(
    CREATE_DEPARTMENT,
    { object: { name: parsed.data.name, description: parsed.data.description ?? null } }
  );

  const dept = result.insert_departments_one;
  return NextResponse.json(
    { success: true, data: { ...dept } },
    { status: 201 }
  );
}

