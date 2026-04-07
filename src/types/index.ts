export type Role = "ADMIN" | "MANAGER" | "INTERN";
export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type InternStatus = "ACTIVE" | "COMPLETED" | "TERMINATED";

export interface UserBase {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  managerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ManagerProfile {
  id: string;
  userId: string;
  employeeId?: string | null;
  designation?: string | null;
  departmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InternProfile {
  id: string;
  userId: string;
  internId?: string | null;
  university?: string | null;
  course?: string | null;
  yearOfStudy?: string | null;
  address?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: InternStatus;
  managerId?: string | null;
  departmentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentType {
  id: string;
  name: string;
  description?: string | null;
  isRequired: boolean;
  isActive: boolean;
  acceptedFormats?: string | null;
  maxSizeMb?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  userId: string;
  documentTypeId: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  filePath: string;
  fileSize?: number | null;
  mimeType?: string | null;
  status: DocumentStatus;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
