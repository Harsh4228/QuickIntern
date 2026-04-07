import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, UserCheck, FileText, Clock, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

async function getStats() {
  const [
    totalInterns,
    activeInterns,
    totalManagers,
    totalDepartments,
    totalDocTypes,
    pendingDocs,
    recentInterns,
  ] = await Promise.all([
    prisma.intern.count(),
    prisma.intern.count({ where: { status: "ACTIVE" } }),
    prisma.manager.count(),
    prisma.department.count(),
    prisma.documentType.count(),
    prisma.document.count({ where: { status: "PENDING" } }),
    prisma.user.findMany({
      where: { role: "INTERN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { internProfile: { include: { department: true, manager: { include: { user: true } } } } },
    }),
  ]);

  return { totalInterns, activeInterns, totalManagers, totalDepartments, totalDocTypes, pendingDocs, recentInterns };
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  const statCards = [
    { label: "Total Interns", value: stats.totalInterns, sub: `${stats.activeInterns} active`, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Managers", value: stats.totalManagers, sub: "Department managers", icon: UserCheck, color: "text-purple-600 bg-purple-50" },
    { label: "Departments", value: stats.totalDepartments, sub: "Across organization", icon: Building2, color: "text-green-600 bg-green-50" },
    { label: "Pending Documents", value: stats.pendingDocs, sub: "Awaiting review", icon: Clock, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {session?.user.name} 👋
        </h2>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening in your internship program today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent interns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recently Added Interns</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentInterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interns added yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Department</th>
                    <th className="pb-3 pr-4 font-medium">Manager</th>
                    <th className="pb-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentInterns.map((u) => (
                    <tr key={u.id} className="text-foreground">
                      <td className="py-3 pr-4 font-medium">{u.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                      <td className="py-3 pr-4">{u.internProfile?.department?.name ?? "—"}</td>
                      <td className="py-3 pr-4">{u.internProfile?.manager?.user?.name ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
