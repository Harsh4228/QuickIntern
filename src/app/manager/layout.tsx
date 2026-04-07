import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Manager Portal" };

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "MANAGER") redirect("/unauthorized");
  return <DashboardLayout role="MANAGER">{children}</DashboardLayout>;
}
