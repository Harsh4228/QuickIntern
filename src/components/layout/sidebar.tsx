"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  GitMerge,
  FileText,
  LogOut,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/interns", label: "Interns", icon: Users },
  { href: "/admin/departments", label: "Departments", icon: Building2 },
  { href: "/admin/managers", label: "Managers", icon: UserCheck },
  { href: "/admin/assignments", label: "Assignments", icon: GitMerge },
  { href: "/admin/documents", label: "Document Master", icon: FileText },
];

const managerNavItems = [
  { href: "/manager", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/manager/interns", label: "My Interns", icon: Users },
  { href: "/manager/documents", label: "Documents", icon: FileText },
];

const internNavItems = [
  { href: "/intern", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/intern/documents", label: "My Documents", icon: FileText },
  { href: "/intern/profile", label: "My Profile", icon: Users },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems =
    role === "ADMIN"
      ? adminNavItems
      : role === "MANAGER"
      ? managerNavItems
      : internNavItems;

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">QuickIntern</p>
          <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">
            {role}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-3 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
            {getInitials(session?.user?.name ?? "U")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">
              {session?.user?.name}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/60">
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
