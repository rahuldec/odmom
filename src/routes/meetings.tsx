import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowUpDown,
  Clock3,
  Download,
  Images,
  Loader2,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Seal } from "@/components/seal";
import { MeetingTypeChip } from "@/components/chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getMom, listMoms } from "@/lib/mom.functions";
import { getTodaysTasks, uploadMomToAsana } from "@/lib/asana.functions";
import type { MOM, MomPhoto } from "@/lib/mom-types";
import { downloadMomPdf, getPdfBuffer } from "@/lib/pdf";
import { formatDay, plural, relativeDay } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "All meetings — MOM Portal" },
      {
        name: "description",
        content:
          "Create and manage Minutes of Meeting for client visits, training, and support calls.",
      },
    ],
  }),
  component: ListPage,
});

type SortKey = "date_desc" | "date_asc" | "client_asc" | "pending_desc";

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ListPage() {
  const router = useRouter();
  const list = useServerFn(listMoms);
  const get = useServerFn(getMom);
  const listTasks = useServerFn(getTodaysTasks);
  const addToTask = useServerFn(uploadMomToAsana);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ title: string; photos: MomPhoto[] } | null>(null);
  const [asanaPickerMomId, setAsanaPickerMomId] = useState<string | null>(null);
  const [asanaTaskQuery, setAsanaTaskQuery] = useState("");
  const [asanaSelectedTaskId, setAsanaSelectedTaskId] = useState("");
  const [asanaUploading, setAsanaUploading] = useState(false);

  const { data: asanaTasks = [], isLoading: asanaTasksLoading } = useQuery({
    queryKey: ["asanaTodaysTasks"],
    queryFn: () => listTasks({}),
    enabled: !!asanaPickerMomId,
  });

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [employee, setEmployee] = useState("");
  const [type, setType] = useState<"all" | "online" | "offline">("all");
  const [sort, setSort] = useState<SortKey>("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounced(search);
  const debouncedClient = useDebounced(client);
  const debouncedEmployee = useDebounced(employee);

  const filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      client: debouncedClient || undefined,
      employee: debouncedEmployee || undefined,
      meeting_type: type === "all" ? undefined : type,
    }),
    [debouncedSearch, debouncedClient, debouncedEmployee, type],
  );

  const hasFilters = Boolean(
    debouncedSearch || debouncedClient || debouncedEmployee || type !== "all",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["moms", filters],
    queryFn: () => list({ data: filters }),
  });

  const rows = useMemo(() => {
    const items = [...(data ?? [])];
    const pending = (m: MOM) => (m.pending_points ?? []).length;
    switch (sort) {
      case "date_asc":
        return items.sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
      case "client_asc":
        return items.sort((a, b) => a.client_name.localeCompare(b.client_name));
      case "pending_desc":
        return items.sort((a, b) => pending(b) - pending(a));
      default:
        return items.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
    }
  }, [data, sort]);

  const clearFilters = () => {
    setSearch("");
    setClient("");
    setEmployee("");
    setType("all");
  };

  const handleAddToAsana = async () => {
    if (!asanaSelectedTaskId || !asanaPickerMomId) return;
    const momId = asanaPickerMomId;
    setAsanaUploading(true);
    setAsanaPickerMomId(null);
    try {
      const mom = await get({ data: { id: momId } });
      if (!mom) throw new Error("MOM not found");
      let pdfData: string | undefined;
      try {
        const buf = await getPdfBuffer(mom);
        let s = "";
        for (let i = 0; i < buf.length; i += 8192)
          s += String.fromCharCode(...buf.subarray(i, i + 8192));
        pdfData = btoa(s);
      } catch { /* skip PDF on error */ }
      const result = await addToTask({
        data: {
          id: momId,
          taskId: asanaSelectedTaskId,
          pdfData,
          clientName: mom.client_name,
          meetingDate: mom.meeting_date.slice(0, 10),
        },
      });
      toast.success("MOM details and PDF added to the Asana task");
      window.open(result.task_url, "_blank");
      setAsanaSelectedTaskId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update the Asana task. Try again.");
    } finally {
      setAsanaUploading(false);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const mom = await get({ data: { id } });
      if (!mom) throw new Error("This MOM no longer exists.");
      await downloadMomPdf(mom);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build the PDF. Try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Client record"
        title="Meetings"
        description="Every client visit, training session, and support call — written up, stamped, and ready to send."
        actions={
          <Link to="/mom/new">
            <Button className="gap-1.5 font-semibold">
              <Plus className="h-4 w-4" /> New MOM
            </Button>
          </Link>
        }
      />

      {/* Search + filters */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-9"
              placeholder="Search client, employee, location or conclusion…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search meetings"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            className="h-11 gap-1.5"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-3">
            <Input
              placeholder="Client name"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              aria-label="Filter by client"
            />
            <Input
              placeholder="Employee name"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              aria-label="Filter by employee"
            />
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger aria-label="Filter by meeting type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All meeting types</SelectItem>
                <SelectItem value="offline">On site</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="eyebrow">
            {isLoading ? "Loading…" : plural(rows.length, "meeting")}
            {hasFilters && !isLoading ? " found" : ""}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-[168px] border-none bg-transparent text-xs shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="date_desc">Newest first</SelectItem>
                <SelectItem value="date_asc">Oldest first</SelectItem>
                <SelectItem value="client_asc">Client A–Z</SelectItem>
                <SelectItem value="pending_desc">Most pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState filtered={hasFilters} onClear={clearFilters} />
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/60">
                <tr className="eyebrow">
                  <th className="px-5 py-3 text-left font-medium">Client</th>
                  <th className="px-5 py-3 text-left font-medium">Date</th>
                  <th className="px-5 py-3 text-left font-medium">Type</th>
                  <th className="px-5 py-3 text-left font-medium">Employee</th>
                  <th className="px-5 py-3 text-left font-medium">Pending</th>
                  <th className="px-5 py-3 text-left font-medium">Photos</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr
                    key={m.id}
                    tabIndex={0}
                    role="link"
                    onClick={() => router.navigate({ to: "/mom/$id", params: { id: m.id } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        router.navigate({ to: "/mom/$id", params: { id: m.id } });
                    }}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-secondary/60 focus-visible:bg-secondary/60"
                  >
                    <td className="px-5 py-4">
                      <span className="font-medium">{m.client_name}</span>
                      {m.location && (
                        <span className="mt-0.5 block max-w-[22ch] truncate text-xs text-muted-foreground">
                          {m.location}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="tabular text-sm">{formatDay(m.meeting_date)}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {relativeDay(m.meeting_date)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <MeetingTypeChip type={m.meeting_type} />
                    </td>
                    <td className="px-5 py-4">{m.employee_name}</td>
                    <td className="px-5 py-4">
                      <PendingCount count={(m.pending_points ?? []).length} />
                    </td>
                    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                      <PhotoStack
                        photos={(m.photos ?? []) as MomPhoto[]}
                        onOpen={() =>
                          setGallery({
                            title: m.client_name,
                            photos: (m.photos ?? []) as MomPhoto[],
                          })
                        }
                      />
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        id={m.id}
                        downloading={downloadingId === m.id}
                        onDownload={() => void handleDownload(m.id)}
                        onAsana={() => setAsanaPickerMomId(m.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {rows.map((m) => (
              <Card key={m.id} className="overflow-hidden">
                <Link
                  to="/mom/$id"
                  params={{ id: m.id }}
                  className="block p-4 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-semibold">
                        {m.client_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="tabular">{formatDay(m.meeting_date)}</span> ·{" "}
                        {m.employee_name}
                      </p>
                    </div>
                    <MeetingTypeChip type={m.meeting_type} className="shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <PendingCount count={(m.pending_points ?? []).length} />
                    {(m.photos ?? []).length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Images className="h-3.5 w-3.5" />
                        {(m.photos ?? []).length}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
                  <RowActions
                    id={m.id}
                    downloading={downloadingId === m.id}
                    onDownload={() => void handleDownload(m.id)}
                    onAsana={() => setAsanaPickerMomId(m.id)}
                  />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Asana task picker */}
      <AsanaDefs />
      <Dialog open={!!asanaPickerMomId} onOpenChange={(o) => !o && setAsanaPickerMomId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to Asana</DialogTitle>
            <DialogDescription>
              The MOM details go into the task description and the PDF is attached.
            </DialogDescription>
          </DialogHeader>
          {asanaTasksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : asanaTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tasks created today in the Asana project.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={asanaTaskQuery}
                  onChange={(e) => setAsanaTaskQuery(e.target.value)}
                  placeholder="Search tasks"
                  className="pl-9"
                />
              </div>
              <RadioGroup
                value={asanaSelectedTaskId}
                onValueChange={setAsanaSelectedTaskId}
                className="max-h-72 space-y-2 overflow-y-auto pr-1"
              >
                {asanaTasks
                  .filter((t) => t.name.toLowerCase().includes(asanaTaskQuery.trim().toLowerCase()))
                  .map((task) => (
                    <div key={task.gid} className="flex items-start gap-2 rounded-md border p-2.5">
                      <RadioGroupItem value={task.gid} id={`task-${task.gid}`} className="mt-0.5" />
                      <Label htmlFor={`task-${task.gid}`} className="flex-1 cursor-pointer font-medium">
                        {task.name}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setAsanaPickerMomId(null)} disabled={asanaUploading}>
                  Cancel
                </Button>
                <Button onClick={() => void handleAddToAsana()} disabled={asanaUploading || !asanaSelectedTaskId}>
                  {asanaUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add to task
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo gallery */}
      <Dialog open={!!gallery} onOpenChange={(o) => !o && setGallery(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">{gallery?.title} — photos</DialogTitle>
          </DialogHeader>
          <div className="-mr-2 grid max-h-[76vh] grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
            {gallery?.photos.map((p) => (
              <a
                key={p.path}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-muted"
              >
                <img
                  src={p.url}
                  alt={p.caption || "Meeting photo"}
                  loading="lazy"
                  className="h-72 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-80"
                />
                {p.caption ? (
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground">{p.caption}</p>
                ) : null}
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function AsanaDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
      <defs>
        <radialGradient id="asana-g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFB85F" />
          <stop offset="100%" stopColor="#F06A6A" />
        </radialGradient>
        <radialGradient id="asana-g2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF9B5E" />
          <stop offset="100%" stopColor="#F06A6A" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function AsanaIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="30" r="20" fill="url(#asana-g1)" />
      <circle cx="22" cy="72" r="20" fill="url(#asana-g2)" />
      <circle cx="78" cy="72" r="20" fill="url(#asana-g1)" />
    </svg>
  );
}

function RowActions({
  id,
  downloading,
  onDownload,
  onAsana,
}: {
  id: string;
  downloading: boolean;
  onDownload: () => void;
  onAsana: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={onAsana}
        className="gap-1.5 text-xs"
        aria-label="Add to Asana"
        title="Add to Asana"
      >
        <AsanaIcon />
        Add to Asana
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDownload}
        disabled={downloading}
        aria-label="Download PDF"
        title="Download PDF"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
      <Link to="/edit/$id" params={{ id }}>
        <Button size="icon" variant="ghost" aria-label="Edit MOM" title="Edit MOM">
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

function PendingCount({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-xs text-muted-foreground">All clear</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/20 px-2.5 py-0.5 text-xs font-medium text-gold-foreground dark:text-gold">
      <Clock3 className="h-3 w-3" />
      {plural(count, "pending")}
    </span>
  );
}

function PhotoStack({ photos, onOpen }: { photos: MomPhoto[]; onOpen: () => void }) {
  if (!photos.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${plural(photos.length, "photo")}`}
      className="group flex items-center -space-x-3 rounded-full p-0.5 transition-all hover:-space-x-1"
    >
      {shown.map((p, i) => (
        <span
          key={p.path}
          className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-card shadow-sm ring-1 ring-border transition-transform duration-200 group-hover:scale-105"
          style={{ zIndex: shown.length - i }}
        >
          <img
            src={p.url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </span>
      ))}
      {extra > 0 ? (
        <span className="relative z-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-[11px] font-semibold text-secondary-foreground ring-1 ring-border">
          +{extra}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <Seal className="mb-6 h-28 w-28 text-primary/30" />
      {filtered ? (
        <>
          <h2 className="font-display text-lg font-semibold">No meetings match those filters</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Try a shorter search term, or clear the filters to see everything.
          </p>
          <Button variant="outline" className="mt-5 gap-1.5" onClick={onClear}>
            <X className="h-4 w-4" /> Clear filters
          </Button>
        </>
      ) : (
        <>
          <h2 className="font-display text-lg font-semibold">No meetings recorded yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Write up your first client visit. Rough notes are fine — the AI cleans up the wording
            before you send it.
          </p>
          <Link to="/mom/new" className="mt-5">
            <Button className="gap-1.5 font-semibold">
              <Plus className="h-4 w-4" /> New MOM
            </Button>
          </Link>
        </>
      )}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-8 w-24" />
        </div>
      ))}
    </Card>
  );
}
