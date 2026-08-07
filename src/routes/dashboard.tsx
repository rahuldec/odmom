import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, CalendarDays, Clock3, FileText } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/app-shell";
import { ModuleChip } from "@/components/chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listMoms } from "@/lib/mom.functions";
import type { MOM } from "@/lib/mom-types";
import { formatDay, monthKey, plural, relativeDay } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MOM Portal" },
      {
        name: "description",
        content: "Meetings recorded, clients covered, and what's still pending.",
      },
      { property: "og:title", content: "Dashboard — MOM Portal" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const list = useServerFn(listMoms);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, isLoading } = useQuery({
    queryKey: ["moms", {}],
    queryFn: () => list({ data: {} }),
  });

  const stats = useMemo(() => summarise(data ?? []), [data]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="What's been recorded, and what's still waiting on someone."
        actions={
          <Link to="/">
            <Button variant="outline" className="gap-1.5">
              All meetings <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-9 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={FileText}
              label="Meetings recorded"
              value={stats.total}
              caption="all time"
            />
            <Stat
              icon={CalendarDays}
              label="This month"
              value={stats.thisMonth}
              caption={stats.lastMonth > 0 ? `${stats.lastMonth} last month` : "first month"}
            />
            <Stat
              icon={Building2}
              label="Clients covered"
              value={stats.clients}
              caption="distinct institutes"
            />
            <Stat
              icon={Clock3}
              label="Open pending items"
              value={stats.pendingTotal}
              caption={`${stats.pendingOurs} on us · ${stats.pendingTheirs} on clients`}
              highlight={stats.pendingOurs > 0}
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* Follow-up queue — the reason to open this page. */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h2 className="font-display text-base font-semibold">Waiting on Okie Dokie</h2>
                <span className="eyebrow">{plural(stats.followUps.length, "meeting")}</span>
              </div>
              {stats.followUps.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nothing outstanding on our side. Every pending item is with a client.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.followUps.slice(0, 6).map((f) => (
                    <li key={f.mom.id}>
                      <Link
                        to="/mom/$id"
                        params={{ id: f.mom.id }}
                        className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{f.mom.client_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            <span className="tabular">{formatDay(f.mom.meeting_date)}</span> ·{" "}
                            {relativeDay(f.mom.meeting_date)} · {f.mom.employee_name}
                          </p>
                          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                            {f.first}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-gold/60 bg-gold/20 px-2.5 py-0.5 text-xs font-medium text-gold-foreground dark:text-gold">
                          {f.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Pending by module */}
            <Card className="overflow-hidden">
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="font-display text-base font-semibold">Pending by module</h2>
              </div>
              {stats.byModule.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nothing pending anywhere.
                </p>
              ) : (
                <ul className="space-y-3 p-5">
                  {stats.byModule.slice(0, 6).map((m) => (
                    <li key={m.module}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <ModuleChip module={m.module} />
                        <span className="tabular text-xs text-muted-foreground">{m.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          data-module={m.module}
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((m.count / stats.byModule[0].count) * 100)}%`,
                            background: "var(--chip)",
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Meetings over time */}
          <Card className="mt-5 overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-base font-semibold">Meetings per month</h2>
            </div>
            <div className="h-64 p-5">
              {mounted && stats.byMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byMonth} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)" }}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" name="Meetings" radius={[6, 6, 0, 0]}>
                      {stats.byMonth.map((entry) => (
                        <Cell key={entry.label} fill="var(--color-primary)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No meetings recorded yet.
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  caption,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  caption?: string;
  highlight?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Icon className={highlight ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
        <p className="eyebrow">{label}</p>
      </div>
      <p className="mt-3 font-display text-4xl font-bold tracking-tight tabular-nums">{value}</p>
      {caption && <p className="mt-1.5 text-xs text-muted-foreground">{caption}</p>}
    </Card>
  );
}

function summarise(moms: MOM[]) {
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  let pendingOurs = 0;
  let pendingTheirs = 0;
  const moduleCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  const clients = new Set<string>();
  const followUps: { mom: MOM; count: number; first: string }[] = [];

  for (const m of moms) {
    clients.add(m.client_name.trim().toLowerCase());
    const key = monthKey(m.meeting_date);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);

    const pending = m.pending_points ?? [];
    const ours = pending.filter((p) => p.pending_with === "okie_dokie");
    pendingOurs += ours.length;
    pendingTheirs += pending.length - ours.length;

    for (const p of pending) {
      moduleCounts.set(p.module, (moduleCounts.get(p.module) ?? 0) + 1);
    }

    if (ours.length > 0) {
      followUps.push({ mom: m, count: ours.length, first: ours[0].requirement });
    }
  }

  // Last six months, oldest first, including months with nothing recorded.
  const byMonth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.push({
      label: d.toLocaleString(undefined, { month: "short" }),
      count: monthCounts.get(key) ?? 0,
    });
  }

  return {
    total: moms.length,
    thisMonth: monthCounts.get(thisKey) ?? 0,
    lastMonth: monthCounts.get(prevKey) ?? 0,
    clients: clients.size,
    pendingTotal: pendingOurs + pendingTheirs,
    pendingOurs,
    pendingTheirs,
    byModule: [...moduleCounts.entries()]
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count),
    byMonth,
    followUps: followUps.sort((a, b) => b.mom.meeting_date.localeCompare(a.mom.meeting_date)),
  };
}
