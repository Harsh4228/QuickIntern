"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Search, Pencil, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { InternFormModal } from "@/components/modals/intern-form-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InternsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR(
    `/api/interns?page=${page}&pageSize=15&search=${encodeURIComponent(search)}`,
    fetcher
  );

  const interns = data?.data ?? [];
  const pagination = data?.pagination;

  const handleDelete = useCallback(
    async (internId: string) => {
      if (!confirm("Deactivate this intern? They will no longer be able to log in.")) return;
      const res = await fetch(`/api/interns/${internId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Intern deactivated");
        mutate();
      } else {
        toast.error("Failed to deactivate intern");
      }
    },
    [mutate]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interns</h2>
          <p className="text-sm text-muted-foreground">Manage all registered interns</p>
        </div>
        <Button onClick={() => { setEditingId(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Intern
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Intern</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Manager</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Start Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : interns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No interns found.</td></tr>
            ) : (
              interns.map((intern: any) => (
                <tr key={intern.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {intern.user?.name?.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{intern.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{intern.user?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{intern.internId ?? "—"}</td>
                  <td className="px-4 py-3">{intern.department?.name ?? "—"}</td>
                  <td className="px-4 py-3">{intern.manager?.user?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={intern.status === "ACTIVE" ? "success" : intern.status === "COMPLETED" ? "secondary" : "destructive"}
                    >
                      {intern.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(intern.startDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingId(intern.id); setModalOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(intern.id)}
                      >
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <InternFormModal
          internId={editingId}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); mutate(); }}
        />
      )}
    </div>
  );
}
