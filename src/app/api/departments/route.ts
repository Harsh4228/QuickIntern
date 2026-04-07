import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { departmentSchema } from "@/lib/validations";

// GET /api/departments
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departments = await prisma.department.findMany({
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { interns: true, managers: true } },
    },
    orderBy: { name: "asc" },
  });

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

  const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Department already exists" }, { status: 409 });

  const dept = await prisma.department.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: dept }, { status: 201 });
}
