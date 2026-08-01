import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileText, ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getMom, listMoms } from "@/lib/mom.functions";
import type { MomPhoto } from "@/lib/mom-types";
import { downloadMomPdf } from "@/lib/pdf";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MOM Portal — All Meetings" },
      { name: "description", content: "Create and manage Minutes of Meeting for client visits, training, and support calls." },
    ],
  }),
  component: ListPage,
});

function ListPage() {
  const router = useRouter();
  const list = useServerFn(listMoms);
  const get = useServerFn(getMom);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<{ title: string; photos: MomPhoto[] } | null>(null);

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [employee, setEmployee] = useState("");
  const [type, setType] = useState<"all" | "online" | "offline">("all");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      client: client || undefined,
      employee: employee || undefined,
      meeting_type: type === "all" ? undefined : type,
    }),
    [search, client, employee, type],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["moms", filters],
    queryFn: () => list({ data: filters }),
  });


  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const mom = await get({ data: { id } });
      if (!mom) throw new Error("MOM not found");
      await downloadMomPdf(mom);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setDownloadingId(null);
    }
  };


  return (
    <AppShell>
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minutes of Meeting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, search, and download professional MOMs for every client interaction.
          </p>
        </div>
        <Link to="/mom/new">
          <Button
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 px-8 text-base font-semibold shadow-lg shadow-primary/30 ring-2 ring-primary/25 transition-transform hover:scale-[1.03]"
          >
            <Plus className="h-5 w-5" /> New MOM
          </Button>
        </Link>
      </div>


      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by client, employee, summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Input placeholder="Client" value={client} onChange={(e) => setClient(e.target.value)} />
          <Input placeholder="Employee" value={employee} onChange={(e) => setEmployee(e.target.value)} />
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-base font-medium">No MOMs yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start by creating your first Minutes of Meeting.</p>
          <Link to="/mom/new" className="mt-4">
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New MOM</Button>
          </Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Photos</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    onClick={() => router.navigate({ to: "/mom/$id", params: { id: m.id } })}
                  >
                    <td className="px-4 py-3 font-medium">{m.client_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.meeting_date}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.meeting_type === "online" ? "secondary" : "outline"}>
                        {m.meeting_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{m.employee_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.location || "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <PhotoStack
                        photos={(m.photos ?? []) as MomPhoto[]}
                        onOpen={() => setGallery({ title: m.client_name, photos: (m.photos ?? []) as MomPhoto[] })}
                      />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(m.id)}
                          disabled={downloadingId === m.id}
                          aria-label="Download PDF"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link to="/edit/$id" params={{ id: m.id }}>
                          <Button size="icon" variant="ghost" aria-label="Edit PDF" title="Edit PDF">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!gallery} onOpenChange={(o) => !o && setGallery(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{gallery?.title} — Photos</DialogTitle>
          </DialogHeader>
          <div className="-mr-2 grid max-h-[76vh] grid-cols-1 gap-4 overflow-y-auto pr-2 sm:grid-cols-2">
            {gallery?.photos.map((p) => (
              <a
                key={p.path}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
              >
                <img
                  src={p.url}
                  alt={p.caption || "MOM photo"}
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

function PhotoStack({ photos, onOpen }: { photos: MomPhoto[]; onOpen: () => void }) {
  if (!photos.length) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <ImageIcon className="h-3.5 w-3.5" /> —
      </span>
    );
  }
  const shown = photos.slice(0, 3);
  const extra = photos.length - shown.length;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${photos.length} photos`}
      className="group flex items-center -space-x-3 rounded-full p-0.5 transition-all hover:-space-x-1"
    >
      {shown.map((p, i) => (
        <span
          key={p.path}
          className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-background shadow-sm ring-1 ring-border transition-transform duration-200 group-hover:scale-105"
          style={{ zIndex: shown.length - i }}
        >
          <img src={p.url} alt={p.caption || "MOM photo"} loading="lazy" className="h-full w-full object-cover" />
        </span>
      ))}
      {extra > 0 ? (
        <span className="relative z-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-border">
          +{extra}
        </span>
      ) : null}
    </button>
  );
}
