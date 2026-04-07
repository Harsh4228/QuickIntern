import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── User / Intern Registration ────────────────────────────
export const registerInternSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  university: z.string().optional(),
  course: z.string().optional(),
  yearOfStudy: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
});

export const updateInternSchema = registerInternSchema
  .omit({ password: true })
  .extend({
    status: z.enum(["ACTIVE", "COMPLETED", "TERMINATED"]).optional(),
  });

// ── Manager Registration ──────────────────────────────────
export const registerManagerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional(),
});

export const updateManagerSchema = registerManagerSchema
  .omit({ password: true })
  .extend({ departmentId: z.string().optional() });

// ── Department ────────────────────────────────────────────
export const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  description: z.string().optional(),
});

// ── Assign Manager to Department ─────────────────────────
export const assignManagerSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  managerId: z.string().min(1, "Manager is required"),
});

// ── Assign Intern to Manager ──────────────────────────────
export const assignInternSchema = z.object({
  internId: z.string().min(1, "Intern is required"),
  managerId: z.string().min(1, "Manager is required"),
  departmentId: z.string().optional(),
});

// ── Document Type ─────────────────────────────────────────
export const documentTypeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  isRequired: z.boolean().default(false),
  acceptedFormats: z.string().optional(),
  maxSizeMb: z.number().min(1).max(50).default(5),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInternInput = z.infer<typeof registerInternSchema>;
export type UpdateInternInput = z.infer<typeof updateInternSchema>;
export type RegisterManagerInput = z.infer<typeof registerManagerSchema>;
export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type AssignManagerInput = z.infer<typeof assignManagerSchema>;
export type AssignInternInput = z.infer<typeof assignInternSchema>;
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;
