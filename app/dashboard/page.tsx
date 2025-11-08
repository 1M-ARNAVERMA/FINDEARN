"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Card } from "@/components/ui/card";

type StatusDb = "pending" | "in_progress" | "done" | "skipped" | "hard";

function getClientId() {
  const key = "findearn_client_id";
  let id = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!id && typeof window !== "undefined") {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id ?? "server";
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const rid = searchParams.get("rid") || ""; // roadmap id
  const cidParam = searchParams.get("cid") || "";
  const cid = cidParam || getClientId();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        { global: { headers: { "x-client-id": cid } } }
      ),
    [cid]
  );

  const [counts, setCounts] = useState({
    total: 0,
    done: 0,
    pending: 0,
    skipped: 0,
    hard: 0,
    in_progress: 0,
  });

  const [progressByWeek, setProgressByWeek] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // If no rid provided, pick latest roadmap for this client
        let roadmapId = rid;
        if (!roadmapId) {
          const { data: latest } = await supabase
            .from("roadmaps")
            .select("id, created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          roadmapId = latest?.id || "";
          if (roadmapId) {
            router.replace(`/dashboard?rid=${roadmapId}&cid=${cid}`);
          }
        }
        if (!roadmapId) {
          setCounts({ total: 0, done: 0, pending: 0, skipped: 0, hard: 0, in_progress: 0 });
          setProgressByWeek([]);
          setLoading(false);
          return;
        }

        // 1) Milestones counts
        const { data: milestones } = await supabase
          .from("milestones")
          .select("id,status")
          .eq("roadmap_id", roadmapId);

        const total = milestones?.length || 0;
        const done = milestones?.filter((m) => m.status === "done").length || 0;
        const skipped = milestones?.filter((m) => m.status === "skipped").length || 0;
        const hard = milestones?.filter((m) => m.status === "hard").length || 0;
        const in_progress = milestones?.filter((m) => m.status === "in_progress").length || 0;
        const pending = total - (done + skipped + hard + in_progress);

        setCounts({ total, done, pending, skipped, hard, in_progress });

        // 2) Progress over time => count "done" feedback per week
        const { data: fb } = await supabase
          .from("feedback")
          .select("action, created_at")
          .eq("action", "done");

        // group by ISO week (YYYY-WW)
        const byWeek = new Map<string, number>();
        (fb || []).forEach((f) => {
          const d = new Date(f.created_at);
          // week label: e.g., "2025-W07"
          const y = d.getFullYear();
          const onejan = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil((((d as any) - (onejan as any)) / 86400000 + onejan.getDay() + 1) / 7);
          const label = `${y}-W${String(week).padStart(2, "0")}`;
          byWeek.set(label, (byWeek.get(label) || 0) + 1);
        });

        // Keep last 8 weeks sorted
        const series = [...byWeek.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .slice(-8)
          .map(([label, value]) => ({ label, value }));

        setProgressByWeek(series);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [rid, cid, supabase, router]);

  const completionPct =
    counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Learning Dashboard</h1>
          <Link href={`/roadmap?rid=${rid || ""}&cid=${cid}`}>
            <Button variant="outline">← Back to Roadmap</Button>
          </Link>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Total Topics</div>
            <div className="text-3xl font-semibold mt-2">{counts.total}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Completed</div>
            <div className="text-3xl font-semibold mt-2 text-green-600">{counts.done}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-3xl font-semibold mt-2 text-yellow-600">{counts.pending}</div>
          </Card>
          <Card className="p-5">
            <div className="text-sm text-muted-foreground">Completion</div>
            <div className="text-3xl font-semibold mt-2">{completionPct}%</div>
          </Card>
        </div>

        {/* Lower Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="text-lg font-medium mb-4">Topic Status</div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : counts.total === 0 ? (
              <div className="text-sm text-muted-foreground">No topics yet.</div>
            ) : (
              <ul className="text-sm space-y-1">
                <li>Done: {counts.done}</li>
                <li>In Progress: {counts.in_progress}</li>
                <li>Hard: {counts.hard}</li>
                <li>Skipped: {counts.skipped}</li>
                <li>Pending: {counts.pending}</li>
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="text-lg font-medium mb-4">Progress Over Time</div>
            {progressByWeek.length === 0 ? (
              <div className="text-sm text-muted-foreground">No completed entries yet.</div>
            ) : (
              <div className="flex items-end gap-3 h-48">
                {progressByWeek.map((d) => (
                  <div key={d.label} className="flex flex-col items-center">
                    <div
                      className="bg-primary rounded w-8"
                      style={{ height: `${Math.min(100, d.value * 14)}px` }}
                      title={`${d.value} done`}
                    />
                    <div className="text-[11px] mt-1 text-muted-foreground">{d.label.replace(/^.*W/, "W")}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
