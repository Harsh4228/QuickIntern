"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentTypeFormModal } from "@/components/modals/document-type-form-modal";
import { DocumentReviewModal } from "@/components/modals/document-review-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AdminDocumentsPage() {
  const [dtModalOpen, setDtModalOpen] = useState(false);
  const [editingDtId, setEditingDtId] = useState<string | null>(null);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const { data: dtData, mutate: mutateDt } = useSWR("/api/document-types", fetcher);
  const { data: docsData, mutate: mutateDocs } = useSWR(
    `/api/documents?status=${statusFilter}`,
    fetcher
  );

  const docTypes = dtData?.data ?? [];
  const documents = docsData?.data ?? [];

  const handleDeleteDt = useCallback(
    async (id: string) => {
      if (!confirm("Deactivate this document type?")) return;
      const res = await fetch(`/api/document-types/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Document type deactivated"); mutateDt(); }
      else toast.error("Failed");
    },
    [mutateDt]
  );

  return (
    <div className="space-y-8">
      {/* ── Document Master ── */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Document Master</h2>
            <p className="text-sm text-muted-foreground">Define document types that interns must upload</p>
          </div>
          <Button onClick={() => { setEditingDtId(null); setDtModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Document Type
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Document Type</th>
                <th className="px-4 py-3 font-medium">Required</th>
                <th className="px-4 py-3 font-medium">Formats</th>
                <th className="px-4 py-3 font-medium">Max Size</th>
                <th className="px-4 py-3 font-medium">Total Uploads</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {docTypes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No document types configured.</td></tr>
              ) : (
                docTypes.map((dt: any) => (
                  <tr key={dt.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{dt.name}</p>
                          <p className="text-xs text-muted-foreground">{dt.description ?? ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={dt.isRequired ? "destructive" : "secondary"}>
                        {dt.isRequired ? "Required" : "Optional"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{dt.acceptedFormats ?? "any"}</td>
                    <td className="px-4 py-3">{dt.maxSizeMb ?? 5} MB</td>
                    <td className="px-4 py-3">{dt._count?.documents ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingDtId(dt.id); setDtModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteDt(dt.id)}>
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
      </div>

      {/* ── Document Review ── */}
      <div>
        <h3 className="text-lg font-semibold">Document Review Queue</h3>

        <div className="mt-2 flex gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Intern</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No documents with status: {statusFilter}</td></tr>
              ) : (
                documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {doc.originalName}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{doc.user?.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">{doc.documentType?.name}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={doc.status === "APPROVED" ? "success" : doc.status === "REJECTED" ? "destructive" : "warning"}
                      >
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {doc.status === "PENDING" && (
                        <Button variant="outline" size="sm" onClick={() => setReviewDocId(doc.id)}>
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {dtModalOpen && (
        <DocumentTypeFormModal
          docTypeId={editingDtId}
          onClose={() => setDtModalOpen(false)}
          onSuccess={() => { setDtModalOpen(false); mutateDt(); }}
        />
      )}
      {reviewDocId && (
        <DocumentReviewModal
          docId={reviewDocId}
          onClose={() => setReviewDocId(null)}
          onSuccess={() => { setReviewDocId(null); mutateDocs(); }}
        />
      )}
    </div>
  );
}
