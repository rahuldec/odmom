import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Download,
  Pencil,
  Printer,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMom } from "@/lib/mom.functions";
import { downloadMomPdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/mom/$id")({
  head: () => ({ meta: [{ title: "MOM Detail — MOM Portal" }] }),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getMom);
  const { data: mom, isLoading } = useQuery({
    queryKey: ["mom", id],
    queryFn: () => get({ data: { id } }),
  });

  if (isLoading) {
    return <AppShell><div className="py-20 text-center text-sm text-muted-foreground">Loading…</div></AppShell>;
  }
  if (!mom) {
    return <AppShell><Card className="p-10 text-center"><h2 className="text-base font-medium">MOM not found</h2></Card></AppShell>;
  }

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `MOM — ${mom.client_name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };


  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void downloadMomPdf(mom)}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Link to="/edit/$id" params={{ id }}>
            <Button size="sm" className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
          </Link>
        </div>
      </div>

      <article className="space-y-6">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 bg-slate-900 px-6 py-5 text-white dark:bg-slate-950">
            <img
              src="https://okiedokie-erp-images.s3.ap-south-1.amazonaws.com/Okie%20Dokie/2025/12/sourceURL/26aebcbe10f4ac5a3e8b-611ed1b9032568edd4f3-Okie_Dokie_App_icon__2___2_-removebg-preview.png"
              alt="Okie Dokie Solutions"
              className="h-12 w-12 shrink-0 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300">Minutes of Meeting</p>
              <h1 className="mt-1 text-2xl font-semibold">{mom.client_name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-200">
                <span>{mom.meeting_date}</span>
                <span className="capitalize">{mom.meeting_type}</span>
                <span>{mom.employee_name}</span>
                {mom.location && <span>{mom.location}</span>}
              </div>
            </div>
          </div>
        </Card>

        {mom.attendees.length > 0 && (
          <Section title="Attendees">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Designation</th><th className="px-3 py-2">Mobile</th><th className="px-3 py-2">Team</th></tr>
              </thead>
              <tbody>
                {mom.attendees.map((a, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.designation}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.mobile || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={a.team === "okie_dokie" ? "default" : "outline"}>
                        {a.team === "okie_dokie" ? "Okie Dokie Team" : "Client"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {mom.discussion_points.length > 0 && (
          <Section title="Discussion Points">
            <ul className="divide-y divide-border">
              {mom.discussion_points.map((d, i) => (
                <li key={i} className="flex gap-4 px-3 py-3">
                  <Badge variant="outline" className="h-fit shrink-0">{d.module}</Badge>
                  <p className="text-sm leading-relaxed">{d.details}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {mom.work_completed.length > 0 && (
          <Section title="Work Completed">
            <ul className="divide-y divide-border">
              {mom.work_completed.map((w, i) => (
                <li key={i} className="flex gap-4 px-3 py-3">
                  <Badge variant="outline" className="h-fit shrink-0">{w.module}</Badge>
                  <p className="text-sm leading-relaxed">{w.task}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {mom.pending_points.length > 0 && (
          <Section title="Pending Points">
            <ul className="divide-y divide-border">
              {mom.pending_points.map((p, i) => (
                <li key={i} className="flex items-start gap-4 px-3 py-3">
                  <Badge variant="outline" className="h-fit shrink-0">{p.module}</Badge>
                  <p className="flex-1 text-sm leading-relaxed">{p.requirement}</p>
                  <span className="h-fit shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    Pending at {p.pending_with === "okie_dokie" ? "Okie Dokie Team" : "Client"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {mom.photos && mom.photos.length > 0 && (
          <Section title="Photos">
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
              {mom.photos.map((p, i) => (
                <a
                  key={p.path}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md border border-border bg-muted/20"
                >
                  <img
                    src={p.url}
                    alt={p.caption || `Photo ${i + 1}`}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {p.caption && (
                    <p className="border-t border-border px-2 py-1 text-xs text-muted-foreground">
                      {p.caption}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </Section>
        )}


        {mom.summary && (
          <Section title="Conclusion">
            <p className="whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed">{mom.summary}</p>
          </Section>
        )}

        <p className="pt-2 text-center text-xs text-muted-foreground">
          Generated by Okie Dokie Solutions — MOM Portal
        </p>
      </article>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
