import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerInternSchema } from "@/lib/validations";
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

  const where: Record<string, unknown> = {};

  // Managers can only see their own interns
  if (session.user.role === "MANAGER") {
    const manager = await prisma.manager.findUnique({
      where: { userId: session.user.id },
    });
    if (!manager) return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
    where.managerId = manager.id;
  } else if (managerId) {
    where.managerId = managerId;
  }

  if (departmentId) where.departmentId = departmentId;

  const searchFilter = search
    ? { user: { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } }
    : {};

  const [total, interns] = await Promise.all([
    prisma.intern.count({
      where: { ...where, ...searchFilter },
    }),
    prisma.intern.findMany({
      where: { ...where, ...searchFilter },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true } },
        department: { select: { id: true, name: true } },
        manager: { include: { user: { select: { name: true, email: true } } } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    data: interns,
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

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const internCount = await prisma.intern.count();
  const internId = generateInternId(internCount);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone,
      role: "INTERN",
      internProfile: {
        create: {
          internId,
          university,
          course,
          yearOfStudy,
          address,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          departmentId: departmentId || undefined,
          managerId: managerId || undefined,
        },
      },
    },
    include: { internProfile: { include: { department: true, manager: { include: { user: true } } } } },
  });

  // Send welcome email with credentials
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const emailData = internWelcomeEmail({
    name,
    email: email.toLowerCase(),
    password, // plain text – only sent once at creation
    internId,
    department: user.internProfile?.department?.name,
    manager: user.internProfile?.manager?.user?.name,
    loginUrl: `${baseUrl}/login`,
  });
  await sendMail({ to: email.toLowerCase(), ...emailData });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
