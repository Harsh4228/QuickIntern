import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { registerInternSchema } from "@/lib/validations";
import {
  GET_MANAGER_BY_USER_ID, GET_INTERNS, CHECK_EMAIL, INTERN_COUNT,
  CREATE_USER, CREATE_INTERN, GET_DEPT_NAME, GET_MGR_NAME,
} from "@/lib/graphql/queries";
import bcrypt from "bcryptjs";
import { generateInternId } from "@/lib/utils";
import { sendMail, internWelcomeEmail } from "@/lib/mailer";

// GET /api/interns – list all interns (admin) or filtered by manager
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const search = searchParams.get("search") ?? "";
  const managerId = searchParams.get("managerId");
  const departmentId = searchParams.get("departmentId");

  const andConditions: Record<string, unknown>[] = [];

  // Managers can only see their own interns
  if (session.user.role === "MANAGER") {
    const mgrData = await hasuraRequest<{ managers: Array<{ id: string }> }>(
      GET_MANAGER_BY_USER_ID,
      { userId: session.user.id }
    );
    if (!mgrData.managers[0]) {
      return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
    }
    andConditions.push({ managerId: { _eq: mgrData.managers[0].id } });
  } else if (managerId) {
    andConditions.push({ managerId: { _eq: managerId } });
  }

  if (departmentId) andConditions.push({ departmentId: { _eq: departmentId } });

  if (search) {
    andConditions.push({
      _or: [
        { user: { name: { _ilike: `%${search}%` } } },
        { user: { email: { _ilike: `%${search}%` } } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { _and: andConditions } : {};
  const offset = (page - 1) * pageSize;

  const data = await hasuraRequest<{
    interns_aggregate: { aggregate: { count: number } };
    interns: Array<{
      id: string;
      userId: string;
      managerId: string | null;
      departmentId: string | null;
      internId: string | null;
      university: string | null;
      course: string | null;
      status: string;
      user: { id: string; name: string; email: string; phone: string | null; isActive: boolean; createdAt: string };
      department: { id: string; name: string } | null;
      manager: { id: string; user: { name: string; email: string } } | null;
    }>;
  }>(GET_INTERNS, { where, limit: pageSize, offset });

  const total = data.interns_aggregate.aggregate.count;

  return NextResponse.json({
    data: data.interns,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/interns – register a new intern (admin only)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = registerInternSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, password, phone, university, course, yearOfStudy, address, startDate, endDate, departmentId, managerId } = parsed.data;

  // Check email uniqueness
  const emailCheck = await hasuraRequest<{ users: Array<{ id: string }> }>(
    CHECK_EMAIL,
    { email: email.toLowerCase() }
  );
  if (emailCheck.users.length > 0) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Get intern count for ID generation
  const countData = await hasuraRequest<{ interns_aggregate: { aggregate: { count: number } } }>(
    INTERN_COUNT
  );
  const internId = generateInternId(countData.interns_aggregate.aggregate.count);

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
        role: "INTERN",
      },
    }
  );
  const user = userResult.insert_users_one;

  // Create intern profile
  const internResult = await hasuraRequest<{
    insert_interns_one: {
      id: string;
      internId: string | null;
      departmentId: string | null;
      managerId: string | null;
    };
  }>(
    CREATE_INTERN,
    {
      object: {
        userId: user.id,
        internId,
        university: university ?? null,
        course: course ?? null,
        yearOfStudy: yearOfStudy ?? null,
        address: address ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        departmentId: departmentId ?? null,
        managerId: managerId ?? null,
      },
    }
  );

  // Fetch department/manager names for welcome email
  let deptName: string | undefined;
  let managerName: string | undefined;

  if (departmentId) {
    const deptData = await hasuraRequest<{ departments_by_pk: { name: string } | null }>(
      GET_DEPT_NAME,
      { id: departmentId }
    );
    deptName = deptData.departments_by_pk?.name;
  }
  if (managerId) {
    const mgrData = await hasuraRequest<{ managers_by_pk: { user: { name: string } } | null }>(
      GET_MGR_NAME,
      { id: managerId }
    );
    managerName = mgrData.managers_by_pk?.user?.name;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const emailData = internWelcomeEmail({
    name,
    email: email.toLowerCase(),
    password,
    internId,
    department: deptName,
    manager: managerName,
    loginUrl: `${baseUrl}/login`,
  });
  await sendMail({ to: email.toLowerCase(), ...emailData });

  return NextResponse.json(
    { success: true, data: { ...user, internProfile: internResult.insert_interns_one } },
    { status: 201 }
  );
}
