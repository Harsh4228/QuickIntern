"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { departmentSchema, type DepartmentInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  departmentId: string | null;
  departments: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DepartmentFormModal({ departmentId, departments, onClose, onSuccess }: Props) {
  const isEdit = !!departmentId;

  const existing = departments.find((d: any) => d.id === departmentId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DepartmentInput>({
    resolver: zodResolver(departmentSchema),
  });

  useEffect(() => {
    if (isEdit && existing) {
      reset({ name: existing.name, description: existing.description ?? "" });
    }
  }, [isEdit, existing, reset]);

  async function onSubmit(data: DepartmentInput) {
    const url = isEdit ? `/api/departments/${departmentId}` : "/api/departments";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(isEdit ? "Department updated" : "Department created");
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
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Department" : "Add Department"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input label="Department Name *" placeholder="e.g. Engineering" {...register("name")} error={errors.name?.message} />
          <Textarea label="Description" placeholder="Brief description of the department" rows={3} {...register("description")} />

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Create Department"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
