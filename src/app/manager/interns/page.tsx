"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ManagerInternsPage() {
  const { data, isLoading } = useSWR("/api/interns", fetcher);
  const interns = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Interns</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Intern</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium">University</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Start → End</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : interns.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No interns assigned.</td></tr>
            ) : (
              interns.map((intern: any) => (
                <tr key={intern.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{intern.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{intern.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">{intern.course ?? "—"}</td>
                  <td className="px-4 py-3">{intern.university ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={intern.status === "ACTIVE" ? "success" : "secondary"}>
                      {intern.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(intern.startDate)} → {formatDate(intern.endDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
