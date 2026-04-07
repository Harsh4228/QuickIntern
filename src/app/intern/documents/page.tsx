"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Upload, Trash2, ExternalLink, CheckCircle, Clock, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InternDocumentsPage() {
  const { data: session } = useSession();
  const { data: dtData } = useSWR("/api/document-types", fetcher);
  const { data: docsData, mutate } = useSWR("/api/documents", fetcher);

  const docTypes = dtData?.data ?? [];
  const myDocs = docsData?.data ?? [];

  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTypeId, setActiveTypeId] = useState<string | null>(null);

  function getDocForType(dtId: string) {
    return myDocs.find((d: any) => d.documentTypeId === dtId);
  }

  async function handleUpload(file: File, documentTypeId: string) {
    setUploading(documentTypeId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("documentTypeId", documentTypeId);

    const res = await fetch("/api/documents", { method: "POST", body: fd });
    setUploading(null);

    if (res.ok) {
      toast.success("Document uploaded successfully");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Upload failed");
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Document deleted"); mutate(); }
    else toast.error("Failed to delete");
  }

  const statusIcon = (status: string) => {
    if (status === "APPROVED") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "REJECTED") return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Documents</h2>
        <p className="text-sm text-muted-foreground">
          Upload the required documents to complete your profile
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeTypeId) handleUpload(file, activeTypeId);
          e.target.value = "";
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docTypes.map((dt: any) => {
          const uploaded = getDocForType(dt.id);
          const isUploading = uploading === dt.id;

          return (
            <div key={dt.id} className={`rounded-lg border bg-card p-5 shadow-sm flex flex-col gap-3 ${
              dt.isRequired && !uploaded ? "border-orange-200" : ""
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{dt.name}</p>
                    {dt.description && (
                      <p className="text-xs text-muted-foreground">{dt.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant={dt.isRequired ? "destructive" : "secondary"} className="shrink-0">
                  {dt.isRequired ? "Required" : "Optional"}
                </Badge>
              </div>

              {dt.acceptedFormats && (
                <p className="text-xs text-muted-foreground">
                  Accepted: {dt.acceptedFormats} • Max {dt.maxSizeMb ?? 5} MB
                </p>
              )}

              {uploaded ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                    {statusIcon(uploaded.status)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{uploaded.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploaded.fileSize)}</p>
                    </div>
                    <a href={uploaded.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>

                  {uploaded.status === "REJECTED" && uploaded.rejectionReason && (
                    <p className="text-xs text-red-600 bg-red-50 rounded p-2">{uploaded.rejectionReason}</p>
                  )}

                  <div className="flex gap-2">
                    {uploaded.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        isLoading={isUploading}
                        onClick={() => { setActiveTypeId(dt.id); fileInputRef.current?.click(); }}
                      >
                        <Upload className="mr-1 h-3 w-3" /> Re-upload
                      </Button>
                    )}
                    {uploaded.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(uploaded.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isUploading}
                  onClick={() => { setActiveTypeId(dt.id); fileInputRef.current?.click(); }}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Document
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {docTypes.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          No document types configured by admin yet.
        </p>
      )}
    </div>
  );
}
