"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ManagerDocumentsPage() {
  const { data, isLoading } = useSWR("/api/documents", fetcher);
  const documents = data?.data ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Team Documents</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Intern</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Uploaded</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No documents yet.</td></tr>
            ) : (
              documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-primary underline-offset-2 hover:underline">
                      {doc.originalName}
                    </a>
                  </td>
                  <td className="px-4 py-3">{doc.user?.name}</td>
                  <td className="px-4 py-3">{doc.documentType?.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={doc.status === "APPROVED" ? "success" : doc.status === "REJECTED" ? "destructive" : "warning"}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
