import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { GET_PROFILE } from "@/lib/graphql/queries";

// GET /api/profile/me – returns full profile for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await hasuraRequest<{
    users_by_pk: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      is_active: boolean;
      created_at: string;
      interns: Array<{
        id: string;
        intern_id: string | null;
        university: string | null;
        course: string | null;
        year_of_study: string | null;
        address: string | null;
        start_date: string | null;
        end_date: string | null;
        status: string;
        department_id: string | null;
        manager_id: string | null;
        department: { id: string; name: string } | null;
        manager: { id: string; user: { id: string; name: string; email: string } } | null;
      }>;
      managers: Array<{
        id: string;
        designation: string | null;
        department_id: string | null;
        department: { id: string; name: string } | null;
        interns: Array<{ id: string; user: { name: string; email: string } }>;
      }>;
      documents: Array<{
        id: string;
        document_type_id: string;
        file_name: string;
        original_name: string;
        file_url: string;
        file_path: string;
        file_size: number | null;
        mime_type: string | null;
        status: string;
        rejection_reason: string | null;
        created_at: string;
        document_type: { id: string; name: string; is_required: boolean };
      }>;
    } | null;
    document_types_aggregate: { aggregate: { count: number } };
    document_types: Array<{ id: string }>;
  }>(
    GET_PROFILE,
    { userId: session.user.id }
  );

  const user = data.users_by_pk;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const internProfile = user.interns[0] ?? null;
  const managerProfile = user.managers[0] ?? null;

  // Map documents to camelCase
  const documents = user.documents.map((d) => ({
    id: d.id,
    documentTypeId: d.document_type_id,
    fileName: d.file_name,
    originalName: d.original_name,
    fileUrl: d.file_url,
    filePath: d.file_path,
    fileSize: d.file_size,
    mimeType: d.mime_type,
    status: d.status,
    rejectionReason: d.rejection_reason,
    createdAt: d.created_at,
    documentType: {
      id: d.document_type.id,
      name: d.document_type.name,
      isRequired: d.document_type.is_required,
    },
  }));

  // Calculate profile completion for interns
  let completionPct = 100;
  let pendingRequired = 0;

  if (user.role === "INTERN") {
    const requiredDocTypeIds = new Set(data.document_types.map((dt) => dt.id));
    const uploadedTypeIds = new Set(
      documents.filter((d) => d.status !== "REJECTED").map((d) => d.documentTypeId)
    );
    pendingRequired = [...requiredDocTypeIds].filter((id) => !uploadedTypeIds.has(id)).length;
    completionPct =
      requiredDocTypeIds.size > 0
        ? Math.round(((requiredDocTypeIds.size - pendingRequired) / requiredDocTypeIds.size) * 100)
        : 100;
  }

  // Reshape intern profile
  const internData = internProfile
    ? {
        id: internProfile.id,
        internId: internProfile.intern_id,
        university: internProfile.university,
        course: internProfile.course,
        yearOfStudy: internProfile.year_of_study,
        address: internProfile.address,
        startDate: internProfile.start_date,
        endDate: internProfile.end_date,
        status: internProfile.status,
        departmentId: internProfile.department_id,
        managerId: internProfile.manager_id,
        department: internProfile.department,
        manager: internProfile.manager,
      }
    : null;

  // Reshape manager profile
  const managerData = managerProfile
    ? {
        id: managerProfile.id,
        designation: managerProfile.designation,
        departmentId: managerProfile.department_id,
        department: managerProfile.department,
        interns: managerProfile.interns,
      }
    : null;

  return NextResponse.json({
    data: {
      ...internData,
      ...managerData,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      documents,
      completionPct,
      pendingRequired,
    },
  });
}
