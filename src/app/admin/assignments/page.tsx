"use client";

import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { assignManagerSchema, assignInternSchema, type AssignManagerInput, type AssignInternInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GitMerge, ArrowRight } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AssignmentsPage() {
  const { data: departmentsData } = useSWR("/api/departments", fetcher);
  const { data: managersData } = useSWR("/api/managers", fetcher);
  const { data: internsData } = useSWR("/api/interns?pageSize=200", fetcher);

  const departments = departmentsData?.data ?? [];
  const managers = managersData?.data ?? [];
  const interns = internsData?.data ?? [];

  // ── Assign manager to department ──────────────────────
  const mgrForm = useForm<AssignManagerInput>({ resolver: zodResolver(assignManagerSchema) });
  const [mgrLoading, setMgrLoading] = useState(false);

  async function assignManager(data: AssignManagerInput) {
    setMgrLoading(true);
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type: "manager-department" }),
    });
    setMgrLoading(false);
    if (res.ok) { toast.success("Manager assigned to department"); mgrForm.reset(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed"); }
  }

  // ── Assign intern to manager ──────────────────────────
  const intForm = useForm<AssignInternInput>({ resolver: zodResolver(assignInternSchema) });
  const [intLoading, setIntLoading] = useState(false);

  async function assignIntern(data: AssignInternInput) {
    setIntLoading(true);
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, type: "intern-manager" }),
    });
    setIntLoading(false);
    if (res.ok) { toast.success("Intern assigned to manager"); intForm.reset(); }
    else { const err = await res.json(); toast.error(err.error ?? "Failed"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assignments</h2>
        <p className="text-sm text-muted-foreground">Assign managers to departments and interns to managers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assign Manager → Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitMerge className="h-4 w-4" /> Assign Manager to Department
            </CardTitle>
            <CardDescription>Select a manager and their target department</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mgrForm.handleSubmit(assignManager)} className="space-y-4">
              <Select
                label="Manager"
                placeholder="Select manager…"
                {...mgrForm.register("managerId")}
                error={mgrForm.formState.errors.managerId?.message}
              >
                {managers.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name} – {m.department?.name ?? "Unassigned"}
                  </option>
                ))}
              </Select>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>

              <Select
                label="Department"
                placeholder="Select department…"
                {...mgrForm.register("departmentId")}
                error={mgrForm.formState.errors.departmentId?.message}
              >
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.manager ? `(${d.manager.name})` : "(No manager)"}
                  </option>
                ))}
              </Select>

              <Button type="submit" className="w-full" isLoading={mgrLoading}>
                Assign Manager
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assign Intern → Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitMerge className="h-4 w-4" /> Assign Intern to Manager
            </CardTitle>
            <CardDescription>Select an intern and their reporting manager</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={intForm.handleSubmit(assignIntern)} className="space-y-4">
              <Select
                label="Intern"
                placeholder="Select intern…"
                {...intForm.register("internId")}
                error={intForm.formState.errors.internId?.message}
              >
                {interns.map((i: any) => (
                  <option key={i.id} value={i.id}>
                    {i.user?.name} – {i.user?.email}
                  </option>
                ))}
              </Select>

              <div className="flex items-center justify-center text-muted-foreground">
                <ArrowRight className="h-5 w-5" />
              </div>

              <Select
                label="Manager"
                placeholder="Select manager…"
                {...intForm.register("managerId")}
                error={intForm.formState.errors.managerId?.message}
              >
                {managers.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name} – {m.department?.name ?? "No dept"}
                  </option>
                ))}
              </Select>

              <Button type="submit" className="w-full" isLoading={intLoading}>
                Assign Intern
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Current assignments table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Intern Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Intern</th>
                  <th className="pb-3 pr-4 font-medium">Manager</th>
                  <th className="pb-3 font-medium">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {interns.length === 0 ? (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No interns yet</td></tr>
                ) : (
                  interns.map((i: any) => (
                    <tr key={i.id}>
                      <td className="py-3 pr-4 font-medium">{i.user?.name}</td>
                      <td className="py-3 pr-4">{i.manager?.user?.name ?? "—"}</td>
                      <td className="py-3">{i.department?.name ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
