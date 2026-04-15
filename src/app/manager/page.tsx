import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasuraRequest } from "@/lib/hasura";
import { MANAGER_DASHBOARD } from "@/lib/graphql/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manager Dashboard" };

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);

  const data = await hasuraRequest<{
    managers: Array<{
      id: string;
      department: { name: string } | null;
      interns: Array<{
        id: string;
        status: string;
        startDate: string;
        user: { name: string; email: string; isActive: boolean };
      }>;
    }>;
    pendingDocs: { aggregate: { count: number } };
  }>(
    MANAGER_DASHBOARD,
    { userId: session!.user.id }
  );

  const manager = data.managers[0] ?? null;
  const pendingDocs = data.pendingDocs.aggregate.count;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Welcome, {session?.user.name}</h2>
        <p className="text-sm text-muted-foreground">
          Department: {manager?.department?.name ?? "Not assigned"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">My Interns</p>
              <p className="text-2xl font-bold">{manager?.interns.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Interns</p>
              <p className="text-2xl font-bold">
                {manager?.interns.filter((i) => i.status === "ACTIVE").length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Docs</p>
              <p className="text-2xl font-bold">{pendingDocs}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Interns</CardTitle>
        </CardHeader>
        <CardContent>
          {!manager?.interns.length ? (
            <p className="text-sm text-muted-foreground">No interns assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Start Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {manager.interns.map((intern) => (
                    <tr key={intern.id}>
                      <td className="py-3 pr-4 font-medium">{intern.user.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{intern.user.email}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={intern.status === "ACTIVE" ? "success" : "secondary"}>
                          {intern.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(intern.startDate)}</td>
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
