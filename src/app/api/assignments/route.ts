import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignManagerSchema, assignInternSchema } from "@/lib/validations";

// POST /api/assignments/manager – assign manager to department
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

    // Find manager record
    const manager = await prisma.manager.findUnique({ where: { userId: managerId } });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    // Clear old assignment for this manager
    await prisma.department.updateMany({
      where: { managerId },
      data: { managerId: null },
    });

    // Assign new
    const [dept] = await Promise.all([
      prisma.department.update({
        where: { id: departmentId },
        data: { managerId },
      }),
      prisma.manager.update({
        where: { id: manager.id },
        data: { departmentId },
      }),
    ]);

    return NextResponse.json({ success: true, data: dept });
  }

  if (type === "intern-manager") {
    const parsed = assignInternSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
    }

    const { internId, managerId, departmentId } = parsed.data;

    const manager = await prisma.manager.findUnique({ where: { userId: managerId } });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    const intern = await prisma.intern.update({
      where: { id: internId },
      data: {
        managerId: manager.id,
        departmentId: departmentId ?? manager.departmentId ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: intern });
  }

  return NextResponse.json({ error: "Invalid assignment type" }, { status: 400 });
}
