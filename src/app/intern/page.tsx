import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, User, Calendar } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intern Dashboard" };

export default async function InternDashboard() {
  const session = await getServerSession(authOptions);

  const internProfile = await prisma.intern.findUnique({
    where: { userId: session!.user.id },
    include: {
      department: true,
      manager: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  const docTypes = await prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: [{ isRequired: "desc" }, { name: "asc" }],
  });

  const myDocs = await prisma.document.findMany({
    where: { userId: session!.user.id },
    include: { documentType: true },
  });

  const uploadedTypeIds = new Set(myDocs.map((d) => d.documentTypeId));
  const requiredTypes = docTypes.filter((dt) => dt.isRequired);
  const completedRequired = requiredTypes.filter((dt) => uploadedTypeIds.has(dt.id)).length;
  const profileCompletion = requiredTypes.length > 0
    ? Math.round((completedRequired / requiredTypes.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Hello, {session?.user.name} 👋</h2>
        <p className="text-sm text-muted-foreground">
          Intern ID: {internProfile?.internId ?? "Pending"} &bull; Status: {" "}
          <Badge variant={internProfile?.status === "ACTIVE" ? "success" : "secondary"}>
            {internProfile?.status ?? "Unknown"}
          </Badge>
        </p>
      </div>

      {/* Profile completion */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Profile Completion</p>
              <p className="text-2xl font-bold">{profileCompletion}%</p>
              <p className="text-xs text-muted-foreground">
                {completedRequired}/{requiredTypes.length} required documents uploaded
              </p>
            </div>
            <div className="flex-1 ml-8">
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
          </div>
          {profileCompletion < 100 && (
            <div className="mt-4">
              <Link href="/intern/documents">
                <Button size="sm">Complete Profile →</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Internship details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Internship Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{internProfile?.department?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manager</span>
              <span className="font-medium">{internProfile?.manager?.user?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium">{formatDate(internProfile?.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date</span>
              <span className="font-medium">{formatDate(internProfile?.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">University</span>
              <span className="font-medium">{internProfile?.university ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Document summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Document Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docTypes.slice(0, 6).map((dt) => {
                const uploaded = myDocs.find((d) => d.documentTypeId === dt.id);
                return (
                  <div key={dt.id} className="flex items-center justify-between text-sm">
                    <span className={dt.isRequired ? "font-medium" : "text-muted-foreground"}>
                      {dt.name}
                    </span>
                    {uploaded ? (
                      <Badge variant={uploaded.status === "APPROVED" ? "success" : uploaded.status === "REJECTED" ? "destructive" : "warning"}>
                        {uploaded.status}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not uploaded</Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Link href="/intern/documents">
                <Button variant="outline" size="sm" className="w-full">View All Documents</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
