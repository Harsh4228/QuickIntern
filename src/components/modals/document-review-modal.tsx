"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { X, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  docId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentReviewModal({ docId, onClose, onSuccess }: Props) {
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!action) { toast.error("Choose Approve or Reject"); return; }
    if (action === "REJECTED" && !reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    const res = await fetch(`/api/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, rejectionReason: reason || undefined }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success(`Document ${action.toLowerCase()}`);
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Review Document</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">Choose an action for this document submission:</p>

          <div className="flex gap-3">
            <button
              onClick={() => setAction("APPROVED")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                action === "APPROVED"
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-border hover:border-green-300"
              }`}
            >
              <CheckCircle className="h-5 w-5" /> Approve
            </button>
            <button
              onClick={() => setAction("REJECTED")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                action === "REJECTED"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border hover:border-red-300"
              }`}
            >
              <XCircle className="h-5 w-5" /> Reject
            </button>
          </div>

          {action === "REJECTED" && (
            <Textarea
              label="Rejection Reason *"
              placeholder="Please explain why this document is rejected…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} isLoading={loading} disabled={!action}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
