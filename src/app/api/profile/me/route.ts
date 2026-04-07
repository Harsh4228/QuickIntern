import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile/me – returns full profile for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      internProfile: {
        include: {
          department: { select: { id: true, name: true } },
          manager: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
      managerProfile: {
        include: {
          department: { select: { id: true, name: true } },
          interns: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      documents: {
        include: { documentType: { select: { id: true, name: true, isRequired: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Calculate profile completion for interns
  let completionPct = 100;
  let pendingRequired = 0;

  if (user.role === "INTERN") {
    const allDocTypes = await prisma.documentType.findMany({
      where: { isActive: true, isRequired: true },
    });
    const uploadedTypeIds = new Set(
      user.documents
        .filter((d) => d.status !== "REJECTED")
        .map((d) => d.documentTypeId)
    );
    pendingRequired = allDocTypes.filter((dt) => !uploadedTypeIds.has(dt.id)).length;
    completionPct =
      allDocTypes.length > 0
        ? Math.round(((allDocTypes.length - pendingRequired) / allDocTypes.length) * 100)
        : 100;
  }

  return NextResponse.json({
    data: {
      ...user.internProfile,
      ...user.managerProfile,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      documents: user.documents,
      completionPct,
      pendingRequired,
    },
  });
}
