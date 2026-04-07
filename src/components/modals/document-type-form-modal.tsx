"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { documentTypeSchema, type DocumentTypeInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  docTypeId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentTypeFormModal({ docTypeId, onClose, onSuccess }: Props) {
  const isEdit = !!docTypeId;
  const { data } = useSWR(isEdit ? `/api/document-types` : null, fetcher);
  const docTypes = data?.data ?? [];
  const existing = docTypes.find((d: any) => d.id === docTypeId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DocumentTypeInput>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: { isRequired: false, maxSizeMb: 5 },
  });

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        name: existing.name,
        description: existing.description ?? "",
        isRequired: existing.isRequired,
        acceptedFormats: existing.acceptedFormats ?? "",
        maxSizeMb: existing.maxSizeMb ?? 5,
      });
    }
  }, [existing, isEdit, reset]);

  async function onSubmit(data: DocumentTypeInput) {
    const url = isEdit ? `/api/document-types/${docTypeId}` : "/api/document-types";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(isEdit ? "Document type updated" : "Document type created");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Document Type" : "Add Document Type"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <Input label="Document Name *" placeholder="e.g. Aadhar Card" {...register("name")} error={errors.name?.message} />
          <Textarea label="Description" placeholder="Brief description" rows={2} {...register("description")} />
          <Input
            label="Accepted Formats (comma-separated)"
            placeholder="pdf,jpg,jpeg,png"
            {...register("acceptedFormats")}
          />
          <Input label="Max File Size (MB)" type="number" min={1} max={50} {...register("maxSizeMb", { valueAsNumber: true })} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded border-input" {...register("isRequired")} />
            <span className="text-sm font-medium">Required document</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
