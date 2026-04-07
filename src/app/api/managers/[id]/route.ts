import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateManagerSchema } from "@/lib/validations";

// GET /api/managers/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const manager = await prisma.manager.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
      department: true,
      interns: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  if (!manager) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: manager });
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

  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, phone, designation, departmentId } = parsed.data;

  const updatedUser = await prisma.user.update({
    where: { id: manager.userId },
    data: {
      name,
      phone,
      ...(email ? { email: email.toLowerCase() } : {}),
      managerProfile: {
        update: { designation, departmentId: departmentId || null },
      },
    },
    include: { managerProfile: true },
  });

  // Sync department head assignment
  if (departmentId) {
    await prisma.department.update({ where: { id: departmentId }, data: { managerId: manager.userId } });
  } else if (manager.departmentId) {
    // Remove from old department if unassigned
    await prisma.department.updateMany({
      where: { managerId: manager.userId },
      data: { managerId: null },
    });
  }

  return NextResponse.json({ success: true, data: updatedUser });
}

// DELETE /api/managers/[id] – soft delete
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const manager = await prisma.manager.findUnique({ where: { id } });
  if (!manager) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.update({ where: { id: manager.userId }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
