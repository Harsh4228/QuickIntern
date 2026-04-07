"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { registerInternSchema, updateInternSchema, type RegisterInternInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  internId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InternFormModal({ internId, onClose, onSuccess }: Props) {
  const isEdit = !!internId;

  const { data: internData } = useSWR(isEdit ? `/api/interns/${internId}` : null, fetcher);
  const { data: deptsData } = useSWR("/api/departments", fetcher);
  const { data: mgrsData } = useSWR("/api/managers", fetcher);

  const departments = deptsData?.data ?? [];
  const managers = mgrsData?.data ?? [];

  const schema = isEdit ? updateInternSchema : registerInternSchema;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isEdit && internData?.data) {
      const d = internData.data;
      reset({
        name: d.user?.name ?? "",
        email: d.user?.email ?? "",
        phone: d.user?.phone ?? "",
        university: d.university ?? "",
        course: d.course ?? "",
        yearOfStudy: d.yearOfStudy ?? "",
        address: d.address ?? "",
        startDate: d.startDate ? d.startDate.slice(0, 10) : "",
        endDate: d.endDate ? d.endDate.slice(0, 10) : "",
        departmentId: d.departmentId ?? "",
        managerId: d.manager?.userId ?? "",
        status: d.status,
      });
    }
  }, [internData, isEdit, reset]);

  async function onSubmit(data: any) {
    const url = isEdit ? `/api/interns/${internId}` : "/api/interns";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(isEdit ? "Intern updated" : "Intern registered");
      onSuccess();
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Edit Intern" : "Register New Intern"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name *" placeholder="John Doe" {...register("name")} error={errors.name?.message as string} />
            <Input label="Email *" type="email" placeholder="john@example.com" {...register("email")} error={errors.email?.message as string} />
            {!isEdit && (
              <Input label="Password *" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register("password")} error={errors.password?.message as string} />
            )}
            <Input label="Phone" type="tel" placeholder="+91 XXXXX XXXXX" {...register("phone")} />
            <Input label="University" placeholder="University of Mumbai" {...register("university")} />
            <Input label="Course / Degree" placeholder="B.Tech Computer Science" {...register("course")} />
            <Input label="Year of Study" placeholder="3rd Year" {...register("yearOfStudy")} />
            <Input label="Start Date" type="date" {...register("startDate")} />
            <Input label="End Date" type="date" {...register("endDate")} />
            <Select label="Department" placeholder="Select department…" {...register("departmentId")}>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Select label="Reporting Manager" placeholder="Select manager…" {...register("managerId")}>
              {managers.map((m: any) => <option key={m.userId} value={m.userId}>{m.user?.name}</option>)}
            </Select>
            {isEdit && (
              <Select label="Status" {...register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="TERMINATED">Terminated</option>
              </Select>
            )}
            <div className="sm:col-span-2">
              <Input label="Address" placeholder="Full address" {...register("address")} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? "Save Changes" : "Register Intern"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
