import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { registerManagerSchema } from "@/lib/validations";
import { GET_MANAGERS, CHECK_EMAIL, CREATE_USER, CREATE_MANAGER, SET_DEPARTMENT_MANAGER, GET_DEPT_NAME } from "@/lib/graphql/queries";
import bcrypt from "bcryptjs";
import { sendMail, managerWelcomeEmail } from "@/lib/mailer";

// GET /api/managers
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const departmentId = searchParams.get("departmentId");

  // Build the where clause dynamically
  const andConditions: Record<string, unknown>[] = [];
  if (departmentId) {
    andConditions.push({ departmentId: { _eq: departmentId } });
  }
  if (search) {
    andConditions.push({
      _or: [
        { user: { name: { _ilike: `%${search}%` } } },
        { user: { email: { _ilike: `%${search}%` } } },
      ],
    });
  }
  const where = andConditions.length > 0 ? { _and: andConditions } : {};

  const data = await hasuraRequest<{
    managers: Array<{
      id: string;
      userId: string;
      designation: string | null;
      departmentId: string | null;
      user: { id: string; name: string; email: string; phone: string | null; isActive: boolean; createdAt: string };
      department: { id: string; name: string } | null;
      interns_aggregate: { aggregate: { count: number } };
    }>;
  }>(GET_MANAGERS, { where });

  const managers = data.managers.map((m) => ({
    ...m,
    _count: { interns: m.interns_aggregate.aggregate.count },
  }));

  return NextResponse.json({ data: managers });
}

// POST /api/managers
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = registerManagerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, password, phone, designation, departmentId } = parsed.data;

  // Check email uniqueness
  const emailCheck = await hasuraRequest<{ users: Array<{ id: string }> }>(
    CHECK_EMAIL,
    { email: email.toLowerCase() }
  );
  if (emailCheck.users.length > 0) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const userResult = await hasuraRequest<{
    insert_users_one: { id: string; email: string; name: string; phone: string | null; role: string };
  }>(
    CREATE_USER,
    {
      object: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone: phone ?? null,
        role: "MANAGER",
      },
    }
  );
  const user = userResult.insert_users_one;

  // Create manager profile
  const managerResult = await hasuraRequest<{
    insert_managers_one: { id: string; userId: string; designation: string | null; departmentId: string | null };
  }>(
    CREATE_MANAGER,
    {
      object: {
        userId: user.id,
        designation: designation ?? null,
        departmentId: departmentId ?? null,
      },
    }
  );

  // If department assigned, update the department's manager_id
  if (departmentId) {
    await hasuraRequest(
      SET_DEPARTMENT_MANAGER,
      { deptId: departmentId, userId: user.id }
    );
  }

  // Fetch department name for the welcome email
  let deptName: string | undefined;
  if (departmentId) {
    const deptData = await hasuraRequest<{ departments_by_pk: { name: string } | null }>(
      GET_DEPT_NAME,
      { id: departmentId }
    );
    deptName = deptData.departments_by_pk?.name;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const emailData = managerWelcomeEmail({
    name,
    email: email.toLowerCase(),
    password,
    department: deptName,
    designation,
    loginUrl: `${baseUrl}/login`,
  });
  await sendMail({ to: email.toLowerCase(), ...emailData });

  return NextResponse.json(
    { success: true, data: { ...user, managerProfile: managerResult.insert_managers_one } },
    { status: 201 }
  );
}
