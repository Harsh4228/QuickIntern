"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { registerManagerSchema, updateManagerSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  managerId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManagerFormModal({ managerId, onClose, onSuccess }: Props) {
  const isEdit = !!managerId;
  const { data: mgrData } = useSWR(isEdit ? `/api/managers/${managerId}` : null, fetcher);
  const { data: deptsData } = useSWR("/api/departments", fetcher);
  const departments = deptsData?.data ?? [];

  const schema = isEdit ? updateManagerSchema : registerManagerSchema;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<any>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (isEdit && mgrData?.data) {
      const d = mgrData.data;
      reset({
        name: d.user?.name ?? "",
        email: d.user?.email ?? "",
        phone: d.user?.phone ?? "",
        designation: d.designation ?? "",
        departmentId: d.departmentId ?? "",
      });
    }
  }, [mgrData, isEdit, reset]);

  async function onSubmit(data: any) {
    const url = isEdit ? `/api/managers/${managerId}` : "/api/managers";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(isEdit ? "Manager updated" : "Manager registered");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit Manager" : "Register Manager"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name *" {...register("name")} error={errors.name?.message as string} />
            <Input label="Email *" type="email" {...register("email")} error={errors.email?.message as string} />
            {!isEdit && (
              <Input label="Password *" type="password" {...register("password")} error={errors.password?.message as string} />
            )}
            <Input label="Phone" type="tel" {...register("phone")} />
            <Input label="Designation" placeholder="e.g. Senior Developer" {...register("designation")} />
            <Select label="Department" placeholder="Select department…" {...register("departmentId")}>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Register Manager"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
