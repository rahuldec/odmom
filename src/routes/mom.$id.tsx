import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Download, Loader2, Pencil, Printer, Share2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Seal } from "@/components/seal";
import { ModuleChip } from "@/components/chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getMom } from "@/lib/mom.functions";
import { createMomAsanaTask } from "@/lib/asana.functions";
import type { Attendee, PendingPoint } from "@/lib/mom-types";
import { downloadMomPdf, getPdfBuffer } from "@/lib/pdf";
import { formatDay, plural } from "@/lib/format";
import { toast } from "sonner";
import logoUrl from "@/logo.png";

export const Route = createFileRoute("/mom/$id")({
  head: () => ({ meta: [{ title: "MOM — Okie Dokie" }] }),
  component: DetailPage,
});

function DetailPage() {
  const { id } = Route.useParams();
  const get = useServerFn(getMom);
  const createTask = useServerFn(createMomAsanaTask);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: mom, isLoading } = useQuery({
    queryKey: ["mom", id],
    queryFn: () => get({ data: { id } }),
  });


  if (isLoading) {
    return (
      <AppShell>
        <Card className="p-6">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="mt-6 h-4 w-48" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </Card>
      </AppShell>
    );
  }

  if (!mom) {
    return (
      <AppShell>
        <Card className="px-6 py-16 text-center">
          <h2 className="font-display text-lg font-semibold">This MOM no longer exists</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            It may have been deleted by someone else on the team.
          </p>
          <Link to="/meetings" className="mt-5 inline-block">
            <Button variant="outline">Go to all meetings</Button>
          </Link>
        </Card>
      </AppShell>
    );
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
      /* dismissed */
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadMomPdf(mom);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build the PDF. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadToAsana = async () => {
    setUploading(true);
    try {
      // Generate the same PDF as the download, as base64
      let pdfData: string | undefined;
      try {
        const pdfBuffer = await getPdfBuffer(mom);
        let binaryString = "";
        const chunk = 8192;
        for (let i = 0; i < pdfBuffer.length; i += chunk) {
          binaryString += String.fromCharCode(...pdfBuffer.subarray(i, i + chunk));
        }
        pdfData = btoa(binaryString);
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
      }

      const result = await createTask({ data: { id, pdfData } });
      toast.success("Asana task created with the MOM PDF attached");
      window.open(result.task_url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create the Asana task. Try again.");
    } finally {
      setUploading(false);
    }
  };


  const ours = (mom.pending_points ?? []).filter((p) => p.pending_with === "okie_dokie");
  const theirs = (mom.pending_points ?? []).filter((p) => p.pending_with === "client");
  const clientSide = mom.attendees.filter((a) => a.team === "client");
  const odSide = mom.attendees.filter((a) => a.team === "okie_dokie");

  return (
    <AppShell>
      <div data-print-hide className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/meetings">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> All meetings
          </Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void handleUploadToAsana()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Create Asana task
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void handleShare()}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Link to="/edit/$id" params={{ id }}>
            <Button size="sm" className="gap-1.5 font-semibold">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </Link>
        </div>
      </div>

      <article className="print-document space-y-5">
        {/* Document masthead — the one place the seal appears at full size. */}
        <Card data-doc-card className="relative overflow-hidden border-0 bg-seal text-seal-foreground">
          {/* Real Okie Dokie seal logo on a light disc so it pops on the maroon header. */}
          <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 sm:block lg:right-8">
            <img
              src={logoUrl}
              alt=""
              className="h-32 w-32 rounded-full bg-seal-foreground object-contain p-1 shadow-xl ring-1 ring-seal-foreground/30 lg:h-40 lg:w-40"
            />
          </div>
          <div className="relative px-6 py-7 sm:px-8 sm:py-9 sm:pr-48 lg:pr-64">
            <p className="eyebrow text-seal-foreground/70">Minutes of meeting</p>
            <h1 className="mt-2 max-w-[24ch] font-display text-3xl font-bold leading-tight sm:text-4xl">
              {mom.client_name}
            </h1>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <Meta label="Date" value={formatDay(mom.meeting_date)} mono />
              <Meta
                label="Format"
                value={mom.meeting_type === "online" ? "Online" : "On site"}
              />
              <Meta label="Recorded by" value={mom.employee_name} />
              {mom.location && <Meta label="Where" value={mom.location} />}
            </dl>
          </div>
        </Card>

        {mom.attendees.length > 0 && (
          <Section title="Attendees" count={mom.attendees.length}>
            <div className="grid gap-6 p-5 sm:grid-cols-2">
              <AttendeeColumn heading="Client" people={clientSide} />
              <AttendeeColumn heading="Okie Dokie" people={odSide} />
            </div>
          </Section>
        )}

        {mom.discussion_points.length > 0 && (
          <Section title="Discussion points" count={mom.discussion_points.length}>
            <ul className="divide-y divide-border">
              {mom.discussion_points.map((d, i) => (
                <li key={i} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:gap-4">
                  <ModuleChip module={d.module} className="h-fit shrink-0" />
                  <p className="text-sm leading-relaxed">{d.details}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {mom.work_completed.length > 0 && (
          <Section title="Work completed" count={mom.work_completed.length}>
            <ul className="divide-y divide-border">
              {mom.work_completed.map((w, i) => (
                <li key={i} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:gap-4">
                  <ModuleChip module={w.module} className="h-fit shrink-0" />
                  <p className="text-sm leading-relaxed">{w.task}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(mom.pending_points ?? []).length > 0 && (
          <Section title="Pending points" count={mom.pending_points.length}>
            <div className="divide-y divide-border">
              <PendingGroup
                heading="Waiting on Okie Dokie"
                tone="ours"
                items={ours}
              />
              <PendingGroup heading="Waiting on the client" tone="theirs" items={theirs} />
            </div>
          </Section>
        )}

        {mom.summary && (
          <Section title="Conclusion">
            <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">{mom.summary}</p>
          </Section>
        )}

        {mom.photos && mom.photos.length > 0 && (
          <Section title="Photos" count={mom.photos.length}>
            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4">
              {mom.photos.map((p, i) => (
                <a
                  key={p.path}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-lg border border-border bg-card"
                >
                  <img
                    src={p.url}
                    alt={p.caption || `Photo ${i + 1}`}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {p.kind === "selfie" && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Selfie
                    </span>
                  )}
                  {p.caption && (
                    <p className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
                      {p.caption}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </Section>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Seal className="h-9 w-9 text-muted-foreground/50" topText="" bottomText="" />
          <p className="eyebrow">Recorded by Okie Dokie · MOM Portal</p>
        </div>
      </article>

    </AppShell>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="eyebrow text-seal-foreground/60">{label}</dt>
      <dd className={`mt-1.5 ${mono ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card data-doc-card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {count !== undefined && <span className="eyebrow">{count}</span>}
      </div>
      {children}
    </Card>
  );
}

function AttendeeColumn({ heading, people }: { heading: string; people: Attendee[] }) {
  return (
    <div>
      <p className="eyebrow mb-3">{heading}</p>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody recorded.</p>
      ) : (
        <ul className="space-y-3">
          {people.map((a, i) => (
            <li key={i} className="text-sm">
              <p className="font-medium">{a.name}</p>
              <p className="text-muted-foreground">
                {a.designation}
                {a.mobile ? <span className="tabular"> · {a.mobile}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PendingGroup({
  heading,
  tone,
  items,
}: {
  heading: string;
  tone: "ours" | "theirs";
  items: PendingPoint[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="px-5 py-4">
      <p className="mb-3 flex items-center gap-2">
        <span
          className={
            tone === "ours"
              ? "h-2 w-2 rounded-full bg-gold"
              : "h-2 w-2 rounded-full bg-muted-foreground/50"
          }
        />
        <span className="eyebrow">{heading}</span>
        <span className="eyebrow">· {plural(items.length, "item")}</span>
      </p>
      <ul className="space-y-3">
        {items.map((p, i) => (
          <li key={i} className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <ModuleChip module={p.module} className="h-fit shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm leading-relaxed">{p.requirement}</p>
              {p.attachments && p.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.attachments.map((a) => (
                    <a
                      key={a.path}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs hover:bg-secondary"
                    >
                      {a.name || "Attachment"}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
