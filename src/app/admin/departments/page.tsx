"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DepartmentFormModal } from "@/components/modals/department-form-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DepartmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR("/api/departments", fetcher);
  const departments = data?.data ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Deactivate this department?")) return;
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Department deactivated"); mutate(); }
      else toast.error("Failed");
    },
    [mutate]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Departments</h2>
          <p className="text-sm text-muted-foreground">Manage organizational departments</p>
        </div>
        <Button onClick={() => { setEditingId(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Department
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="col-span-full text-sm text-muted-foreground">Loading…</p>
        ) : departments.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">No departments yet.</p>
        ) : (
          departments.map((dept: any) => (
            <div key={dept.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">{dept.description ?? "No description"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingId(dept.id); setModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {dept._count?.interns ?? 0} interns
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1">
                  {dept._count?.managers ?? 0} managers
                </span>
                {dept.manager ? (
                  <Badge variant="success">Manager: {dept.manager.name}</Badge>
                ) : (
                  <Badge variant="warning">No manager assigned</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {modalOpen && (
        <DepartmentFormModal
          departmentId={editingId}
          departments={departments}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); mutate(); }}
        />
      )}
    </div>
  );
}
