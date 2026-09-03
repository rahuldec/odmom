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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getMom } from "@/lib/mom.functions";
import { uploadMomToAsana, getTodaysTasks } from "@/lib/asana.functions";
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
  const upload = useServerFn(uploadMomToAsana);
  const getTasks = useServerFn(getTodaysTasks);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const { data: mom, isLoading } = useQuery({
    queryKey: ["mom", id],
    queryFn: () => get({ data: { id } }),
  });

  const { data: todaysTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["todaysTasks"],
    queryFn: () => getTasks({}),
    enabled: showTaskPicker,
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
    setShowTaskPicker(true);
  };

  const handleTaskSelection = async () => {
    if (!selectedTaskId) {
      toast.error("Please select a task");
      return;
    }

    setUploading(true);
    setShowTaskPicker(false);

    try {
      // Generate full PDF as base64 (same one as download)
      let pdfData: string | undefined;
      try {
        const doc = await (async () => {
          const { jsPDF } = await import("jspdf");
          const { default: autoTable } = await import("jspdf-autotable");

          const newDoc = new jsPDF({ unit: "pt", format: "a4" });
          const pageWidth = newDoc.internal.pageSize.getWidth();
          const pageHeight = newDoc.internal.pageSize.getHeight();
          const margin = 42;
          const contentW = pageWidth - margin * 2;

          const MAROON: [number, number, number] = [124, 29, 19];
          const MAROON_DEEP: [number, number, number] = [90, 19, 12];
          const ORANGE: [number, number, number] = [238, 103, 35];
          const WHITE: [number, number, number] = [255, 255, 255];
          const SLATE_LIGHT: [number, number, number] = [232, 201, 191];
          const INK: [number, number, number] = [42, 22, 19];
          const LINE: [number, number, number] = [237, 223, 215];
          const ROW_TINT: [number, number, number] = [251, 246, 242];

          // Simplified header (no logo due to browser API limitations on client)
          newDoc.setFillColor(...MAROON);
          newDoc.rect(0, 0, pageWidth, 60, "F");
          newDoc.setFillColor(...MAROON_DEEP);
          newDoc.rect(0, 52, pageWidth, 8, "F");
          newDoc.setFillColor(...ORANGE);
          newDoc.rect(pageWidth - 130, 0, 130, 4, "F");

          newDoc.setFont("helvetica", "bold");
          newDoc.setFontSize(15);
          newDoc.setTextColor(...WHITE);
          newDoc.text("OKIE DOKIE SOLUTIONS", margin, 28);

          newDoc.setFont("helvetica", "normal");
          newDoc.setFontSize(8.5);
          newDoc.setTextColor(...SLATE_LIGHT);
          newDoc.text("www.okiedokiepay.com   ·   services@okiedokiepay.com", margin, 42);

          newDoc.setFont("helvetica", "bold");
          newDoc.setFontSize(11);
          newDoc.setTextColor(...ORANGE);
          newDoc.text("MINUTES OF MEETING", pageWidth - margin, 32, { align: "right" });

          let y = 90;

          // Title
          newDoc.setFont("helvetica", "bold");
          newDoc.setFontSize(18);
          newDoc.setTextColor(...INK);
          newDoc.text(`Meeting with ${mom.client_name}`, margin, y);
          y += 20;

          const dateLabel = new Date(mom.meeting_date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          newDoc.setFont("helvetica", "normal");
          newDoc.setFontSize(10);
          newDoc.setTextColor(...MAROON);
          newDoc.text(dateLabel, margin, y);
          y += 20;

          // Attendees
          if (mom.attendees.length > 0) {
            newDoc.setFont("helvetica", "bold");
            newDoc.setFontSize(11);
            newDoc.text("ATTENDEES", margin, y);
            y += 12;
            autoTable(newDoc, {
              startY: y,
              head: [["Name", "Designation", "Team"]],
              body: mom.attendees.map((a) => [
                a.name,
                a.designation,
                a.team === "okie_dokie" ? "Okie Dokie Team" : "Client",
              ]),
              columnStyles: { 2: { halign: "center", cellWidth: 110 } },
              styles: {
                fontSize: 8.5,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
                textColor: INK,
                lineColor: LINE,
                lineWidth: 0.5,
              },
              headStyles: {
                fillColor: MAROON,
                textColor: WHITE,
                fontStyle: "bold",
                fontSize: 8,
              },
              alternateRowStyles: { fillColor: ROW_TINT },
              margin: { left: margin, right: margin },
            });
            // @ts-expect-error autotable
            y = newDoc.lastAutoTable.finalY + 15;
          }

          // Discussion Points
          if (mom.discussion_points.length > 0) {
            newDoc.setFont("helvetica", "bold");
            newDoc.setFontSize(11);
            newDoc.text("DISCUSSION POINTS", margin, y);
            y += 12;
            autoTable(newDoc, {
              startY: y,
              head: [["Module", "Details"]],
              body: mom.discussion_points.map((d) => [d.module, d.details]),
              columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" } },
              styles: {
                fontSize: 8.5,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
                textColor: INK,
                lineColor: LINE,
                lineWidth: 0.5,
              },
              headStyles: {
                fillColor: MAROON,
                textColor: WHITE,
                fontStyle: "bold",
                fontSize: 8,
              },
              alternateRowStyles: { fillColor: ROW_TINT },
              margin: { left: margin, right: margin },
            });
            // @ts-expect-error autotable
            y = newDoc.lastAutoTable.finalY + 15;
          }

          // Work Completed
          if (mom.work_completed.length > 0) {
            newDoc.setFont("helvetica", "bold");
            newDoc.setFontSize(11);
            newDoc.text("WORK COMPLETED", margin, y);
            y += 12;
            autoTable(newDoc, {
              startY: y,
              head: [["Module", "Task Completed"]],
              body: mom.work_completed.map((w) => [w.module, w.task]),
              columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" } },
              styles: {
                fontSize: 8.5,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
                textColor: INK,
                lineColor: LINE,
                lineWidth: 0.5,
              },
              headStyles: {
                fillColor: MAROON,
                textColor: WHITE,
                fontStyle: "bold",
                fontSize: 8,
              },
              alternateRowStyles: { fillColor: ROW_TINT },
              margin: { left: margin, right: margin },
            });
            // @ts-expect-error autotable
            y = newDoc.lastAutoTable.finalY + 15;
          }

          // Pending Points
          if ((mom.pending_points ?? []).length > 0) {
            newDoc.setFont("helvetica", "bold");
            newDoc.setFontSize(11);
            newDoc.text("PENDING POINTS", margin, y);
            y += 12;
            autoTable(newDoc, {
              startY: y,
              head: [["Module", "Requirement", "Pending With"]],
              body: (mom.pending_points ?? []).map((p) => [
                p.module,
                p.requirement,
                p.pending_with === "okie_dokie" ? "Okie Dokie Team" : "Client",
              ]),
              columnStyles: {
                0: { cellWidth: 100, fontStyle: "bold" },
                2: { cellWidth: 110, halign: "center" },
              },
              styles: {
                fontSize: 8.5,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
                textColor: INK,
                lineColor: LINE,
                lineWidth: 0.5,
              },
              headStyles: {
                fillColor: MAROON,
                textColor: WHITE,
                fontStyle: "bold",
                fontSize: 8,
              },
              alternateRowStyles: { fillColor: ROW_TINT },
              margin: { left: margin, right: margin },
            });
          }

          return newDoc;
        })();

        const pdfArrayBuffer = doc.output("arraybuffer");
        const binaryString = String.fromCharCode(...new Uint8Array(pdfArrayBuffer));
        pdfData = btoa(binaryString);
      } catch (pdfError) {
        console.error("Failed to generate PDF:", pdfError);
        // Continue without PDF
      }

      // Update task with MOM details and PDF attachment
      const result = await upload({
        data: {
          id,
          taskId: selectedTaskId,
          pdfData,
          clientName: mom.client_name,
          meetingDate: mom.meeting_date,
        },
      });
      toast.success("MOM details and PDF added to Asana task!");
      // Open the Asana task in a new tab
      window.open(result.task_url, "_blank");
      setSelectedTaskId("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload to Asana. Try again.");
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
            Upload to Asana
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

      <Dialog open={showTaskPicker} onOpenChange={setShowTaskPicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Asana Task</DialogTitle>
            <DialogDescription>
              Choose a task from today to add MOM details
            </DialogDescription>
          </DialogHeader>

          {tasksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : todaysTasks.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              <p>No tasks found for today</p>
              <p className="text-sm mt-2">Create a task in Asana first</p>
            </div>
          ) : (
            <div className="space-y-4">
              <RadioGroup value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <div className="space-y-3">
                  {todaysTasks.map((task) => (
                    <div key={task.gid} className="flex items-center space-x-2">
                      <RadioGroupItem value={task.gid} id={`task-${task.gid}`} />
                      <Label
                        htmlFor={`task-${task.gid}`}
                        className="cursor-pointer flex-1 font-medium"
                      >
                        {task.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTaskPicker(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleTaskSelection} disabled={uploading || !selectedTaskId}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {uploading ? "Adding..." : "Add to Task"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
