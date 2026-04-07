import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerManagerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { sendMail, managerWelcomeEmail } from "@/lib/mailer";

// GET /api/managers
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const departmentId = searchParams.get("departmentId");

  const where: Record<string, unknown> = {};
  if (departmentId) where.departmentId = departmentId;

  const searchFilter = search
    ? { user: { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] } }
    : {};

  const managers = await prisma.manager.findMany({
    where: { ...where, ...searchFilter },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { interns: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone,
      role: "MANAGER",
      managerProfile: {
        create: {
          designation,
          departmentId: departmentId || undefined,
        },
      },
    },
    include: { managerProfile: { include: { department: true } } },
  });

  // If department assigned, update the department's managerId
  if (departmentId) {
    await prisma.department.update({
      where: { id: departmentId },
      data: { managerId: user.id },
    });
  }

  // Send welcome email with credentials
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const dept = user.managerProfile?.department;
  const emailData = managerWelcomeEmail({
    name,
    email: email.toLowerCase(),
    password, // plain text – only sent once at creation
    department: dept?.name,
    designation: designation,
    loginUrl: `${baseUrl}/login`,
  });
  await sendMail({ to: email.toLowerCase(), ...emailData });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
