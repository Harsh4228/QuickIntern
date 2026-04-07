"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { User, GraduationCap, Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function InternProfilePage() {
  const { data: session } = useSession();
  const { data } = useSWR("/api/profile/me", fetcher);
  const profile = data?.data;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <Link href="/intern/documents">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" /> Upload Documents
          </Button>
        </Link>
      </div>

      {/* Profile completion banner */}
      {profile && (
        <div className={`rounded-lg border p-4 ${profile.completionPct < 100 ? "border-orange-200 bg-orange-50" : "border-green-200 bg-green-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Profile Completion</p>
            <span className={`text-sm font-bold ${profile.completionPct < 100 ? "text-orange-700" : "text-green-700"}`}>
              {profile.completionPct}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${profile.completionPct < 100 ? "bg-orange-500" : "bg-green-500"}`}
              style={{ width: `${profile.completionPct}%` }}
            />
          </div>
          {profile.completionPct < 100 && (
            <p className="mt-2 text-xs text-orange-700">
              {profile.pendingRequired} required document(s) still pending.{" "}
              <Link href="/intern/documents" className="underline font-semibold">Upload now →</Link>
            </p>
          )}
        </div>
      )}

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Full Name" value={session?.user.name} />
          <Row label="Email" value={session?.user.email} />
          <Row label="Phone" value={profile?.phone} />
          <Row label="Address" value={profile?.address} />
        </CardContent>
      </Card>

      {/* Academic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-4 w-4" /> Academic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="University" value={profile?.university} />
          <Row label="Course / Degree" value={profile?.course} />
          <Row label="Year of Study" value={profile?.yearOfStudy} />
        </CardContent>
      </Card>

      {/* Internship Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" /> Internship Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Intern ID" value={profile?.internId} mono />
          <Row
            label="Status"
            value={undefined}
            badge={
              <Badge variant={profile?.status === "ACTIVE" ? "success" : "secondary"}>
                {profile?.status ?? "—"}
              </Badge>
            }
          />
          <Row label="Department" value={profile?.department?.name} />
          <Row label="Reporting Manager" value={profile?.manager?.user?.name} />
          <Row label="Manager Email" value={profile?.manager?.user?.email} />
          <Row label="Start Date" value={formatDate(profile?.startDate)} />
          <Row label="End Date" value={formatDate(profile?.endDate)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  badge,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      {badge ?? (
        <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

