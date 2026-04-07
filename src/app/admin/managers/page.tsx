"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ManagerFormModal } from "@/components/modals/manager-form-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ManagersPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    `/api/managers?search=${encodeURIComponent(search)}`,
    fetcher
  );
  const managers = data?.data ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Deactivate this manager?")) return;
      const res = await fetch(`/api/managers/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Manager deactivated"); mutate(); }
      else toast.error("Failed");
    },
    [mutate]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Managers</h2>
          <p className="text-sm text-muted-foreground">Manage department managers</p>
        </div>
        <Button onClick={() => { setEditingId(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Manager
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Manager</th>
              <th className="px-4 py-3 font-medium">Designation</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Interns</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : managers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No managers found.</td></tr>
            ) : (
              managers.map((mgr: any) => (
                <tr key={mgr.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                        {mgr.user?.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{mgr.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{mgr.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{mgr.designation ?? "—"}</td>
                  <td className="px-4 py-3">{mgr.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">{mgr._count?.interns ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={mgr.user?.isActive ? "success" : "destructive"}>
                      {mgr.user?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(mgr.user?.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(mgr.id); setModalOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(mgr.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ManagerFormModal
          managerId={editingId}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); mutate(); }}
        />
      )}
    </div>
  );
}
