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
import { monthKey, plural, relativeDay } from "@/lib/format";
import { visitsByEmployee, type EmployeeVisits } from "@/lib/people";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MOM Portal" },
      {
        name: "description",
        content: "Meetings recorded, visits per team member, and what's still pending.",
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

  const [period, setPeriod] = useState<PeriodKey>("all");
  const team = useMemo(
    () => visitsByEmployee(withinPeriod(data ?? [], period)),
    [data, period],
  );
  const creditedVisits = useMemo(() => team.reduce((n, t) => n + t.visits, 0), [team]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="What's been recorded, who's been out there, and what's still waiting on someone."
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

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            {/* Visits per team member — a joint visit counts for everyone on it. */}
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div>
                  <h2 className="font-display text-base font-semibold">Visits by team member</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    A visit made together counts for everyone who was on it.
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPeriod(p.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        period === p.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {team.length === 0 ? (
                <p className="px-5 py-16 text-center text-sm text-muted-foreground">
                  No visits recorded in this period.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-4 px-5 pt-4 text-xs text-muted-foreground">
                    <LegendKey color="var(--color-primary)" label="On site" />
                    <LegendKey color="var(--color-chart-2)" label="Online" />
                  </div>
                  <div
                    className="px-2 pb-4 pt-2"
                    style={{ height: Math.max(220, team.length * 42 + 40) }}
                  >
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={team}
                          layout="vertical"
                          barSize={18}
                          margin={{ top: 4, right: 28, bottom: 0, left: 4 }}
                        >
                          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                          <XAxis
                            type="number"
                            allowDecimals={false}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={132}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                          />
                          <Tooltip
                            cursor={{ fill: "var(--color-muted)" }}
                            content={<VisitTooltip />}
                          />
                          <Bar dataKey="onsite" name="On site" stackId="v">
                            {team.map((t) => (
                              <Cell key={t.key} fill="var(--color-primary)" />
                            ))}
                          </Bar>
                          <Bar dataKey="online" name="Online" stackId="v" radius={[0, 4, 4, 0]}>
                            {team.map((t) => (
                              <Cell key={t.key} fill="var(--color-chart-2)" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="border-t border-border bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">
                    {plural(creditedVisits, "credited visit")} across{" "}
                    {plural(team.length, "team member")} — counted from the recorder plus every
                    attendee tagged as Okie Dokie team.
                  </div>
                </>
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
                  {stats.byModule.slice(0, 8).map((m) => (
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

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** The bar only carries the on-site/online split; the rest of a person's
 *  numbers live here so the chart itself stays readable. */
function VisitTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: EmployeeVisits }[];
}) {
  if (!active || !payload?.length) return null;
  const t = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-display text-sm font-semibold">{t.name}</p>
      <p className="mt-1">
        <span className="tabular font-medium">{t.visits}</span>{" "}
        {t.visits === 1 ? "visit" : "visits"}
      </p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="tabular">{t.onsite}</span> on site ·{" "}
        <span className="tabular">{t.online}</span> online
      </p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="tabular">{t.clients}</span> {t.clients === 1 ? "client" : "clients"}
        {t.joint > 0 && (
          <>
            {" "}
            · <span className="tabular">{t.joint}</span> joint
          </>
        )}
      </p>
      {t.lastVisit && (
        <p className="mt-0.5 text-muted-foreground">Last {relativeDay(t.lastVisit)}</p>
      )}
    </div>
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
  };
}

type PeriodKey = "month" | "quarter" | "all";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "90 days" },
  { value: "all", label: "All time" },
];

function withinPeriod(moms: MOM[], period: PeriodKey): MOM[] {
  if (period === "all") return moms;
  const now = new Date();
  const start =
    period === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
  const cutoff = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
    start.getDate(),
  ).padStart(2, "0")}`;
  return moms.filter((m) => m.meeting_date >= cutoff);
}
