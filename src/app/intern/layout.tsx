import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Intern Portal" };

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "INTERN") redirect("/unauthorized");
  return <DashboardLayout role="INTERN">{children}</DashboardLayout>;
}
