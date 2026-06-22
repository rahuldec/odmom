import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarRange, FileText, Plus, Search, Trash2 } from "lucide-react";
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
import { deleteMom, listMoms } from "@/lib/mom.functions";
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
  const del = useServerFn(deleteMom);

  const [search, setSearch] = useState("");
  const [client, setClient] = useState("");
  const [employee, setEmployee] = useState("");
  const [type, setType] = useState<"all" | "online" | "offline">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters = useMemo(
    () => ({
      search: search || undefined,
      client: client || undefined,
      employee: employee || undefined,
      meeting_type: type === "all" ? undefined : type,
      from: from || undefined,
      to: to || undefined,
    }),
    [search, client, employee, type, from, to],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["moms", filters],
    queryFn: () => list({ data: filters }),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this MOM?")) return;
    try {
      await del({ data: { id } });
      toast.success("MOM deleted");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minutes of Meeting</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, search, and download professional MOMs for every client interaction.
          </p>
        </div>
        <Link to="/mom/new">
          <Button className="gap-1.5"><Plus className="h-4 w-4" /> New MOM</Button>
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
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
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
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
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
