import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { updateInternSchema } from "@/lib/validations";
import {
  GET_INTERN, GET_INTERN_BASIC, UPDATE_USER, UPDATE_INTERN,
  GET_INTERN_UPDATED, GET_INTERN_USER_ID, DEACTIVATE_USER,
} from "@/lib/graphql/queries";

// GET /api/interns/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const data = await hasuraRequest<{
    interns_by_pk: {
      id: string;
      userId: string;
      internId: string | null;
      university: string | null;
      course: string | null;
      yearOfStudy: string | null;
      address: string | null;
      startDate: string | null;
      endDate: string | null;
      status: string;
      managerId: string | null;
      departmentId: string | null;
      user: { id: string; name: string; email: string; phone: string | null; isActive: boolean; createdAt: string };
      department: { id: string; name: string; description: string | null } | null;
      manager: { id: string; user: { name: string; email: string } } | null;
    } | null;
  }>(GET_INTERN, { id });

  if (!data.interns_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: data.interns_by_pk });
}

// PATCH /api/interns/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = updateInternSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Fetch existing intern for userId and current email
  const existing = await hasuraRequest<{
    interns_by_pk: { id: string; userId: string; user: { email: string } } | null;
  }>(
    GET_INTERN_BASIC,
    { id }
  );
  const intern = existing.interns_by_pk;
  if (!intern) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, email, phone, university, course, yearOfStudy, address, startDate, endDate, departmentId, managerId, status } = parsed.data;

  // Update user record
  await hasuraRequest(
    UPDATE_USER,
    {
      id: intern.userId,
      set: {
        name,
        phone: phone ?? null,
        ...(email && email !== intern.user.email ? { email: email.toLowerCase() } : {}),
      },
    }
  );

  // Update intern profile
  await hasuraRequest(
    UPDATE_INTERN,
    {
      id,
      set: {
        university: university ?? null,
        course: course ?? null,
        yearOfStudy: yearOfStudy ?? null,
        address: address ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        departmentId: departmentId ?? null,
        managerId: managerId ?? null,
        ...(status ? { status } : {}),
      },
    }
  );

  // Return updated data
  const updated = await hasuraRequest<{
    interns_by_pk: { id: string; userId: string; status: string; departmentId: string | null; managerId: string | null } | null;
  }>(GET_INTERN_UPDATED, { id });

  return NextResponse.json({ success: true, data: updated.interns_by_pk });
}

// DELETE /api/interns/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const existing = await hasuraRequest<{
    interns_by_pk: { userId: string } | null;
  }>(GET_INTERN_USER_ID, { id });
  if (!existing.interns_by_pk) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await hasuraRequest(
    DEACTIVATE_USER,
    { id: existing.interns_by_pk.userId }
  );

  return NextResponse.json({ success: true });
}
