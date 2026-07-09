import { useRef, useState } from "react";
import {
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  Users,
  MessagesSquare,
  ClipboardCheck,
  AlarmClockCheck,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateMomFromNotes } from "@/lib/mom.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  MODULES,
  ATTENDEE_TEAMS,
  PENDING_WITH,
  type MOMInput,
  type AttendeeTeam,
  type PendingWith,
  type MomPhoto,
} from "@/lib/mom-types";

type Props = {
  initial?: MOMInput;
  submitting?: boolean;
  onSubmit: (input: MOMInput) => void;
  submitLabel: string;
};

const blank = (): MOMInput => ({
  client_name: "",
  meeting_date: new Date().toISOString().slice(0, 10),
  meeting_type: "offline",
  employee_name: "",
  location: "",
  summary: "",
  attendees: [],
  discussion_points: [],
  work_completed: [],
  pending_points: [],
  photos: [],
});


// Which sections the AI can regenerate
type AiSection = "discussion_points" | "work_completed" | "pending_points";

export function MomForm({ initial, submitting, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<MOMInput>(initial ?? blank());
  // Track loading per-section ("all" means global polish)
  const [aiLoading, setAiLoading] = useState<AiSection | null>(null);
  const genFn = useServerFn(generateMomFromNotes);

  const update = <K extends keyof MOMInput>(k: K, v: MOMInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** Build the notes string. Pass a section to only include that section's items. */
  const buildNotes = (section: AiSection): string => {
    const lines: string[] = [];

    if (section === "discussion_points") {
      const dp = form.discussion_points.filter((d) => d.details.trim());
      if (dp.length) {
        lines.push("Discussion points (rough):");
        dp.forEach((d) => lines.push(`- [${d.module}] ${d.details.trim()}`));
      }
    }

    if (section === "work_completed") {
      const wc = form.work_completed.filter((w) => w.task.trim());
      if (wc.length) {
        lines.push("Work completed during visit (rough):");
        wc.forEach((w) => lines.push(`- [${w.module}] ${w.task.trim()}`));
      }
    }

    if (section === "pending_points") {
      const pp = form.pending_points.filter((p) => p.requirement.trim());
      if (pp.length) {
        lines.push("Pending points (rough):");
        pp.forEach((p) =>
          lines.push(
            `- [${p.module}] ${p.requirement.trim()} (pending with: ${p.pending_with === "okie_dokie" ? "Okie Dokie team" : "client"})`,
          ),
        );
      }
    }

    return lines.join("\n");
  };

  /** Run AI for a specific section, or all sections at once. */
  const handleGenerate = async (section: AiSection) => {
    const notes = buildNotes(section);
    if (notes.trim().length < 5) {
      toast.error(
        "Add a few rough lines in this section first.",
      );
      return;
    }

    setAiLoading(section);
    try {
      const r = await genFn({ data: { notes } });

      setForm((f) => {
        const next = { ...f };
        if (section === "discussion_points") {
          next.discussion_points = r.discussion_points;
        }
        if (section === "work_completed") {
          next.work_completed = r.work_completed;
        }
        if (section === "pending_points") {
          next.pending_points = r.pending_points;
        }
        return next;
      });

      toast.success("AI improved this section.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiLoading(null);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.employee_name.trim()) {
      toast.error("Client name and Employee name are required.");
      return;
    }
    if (form.photos.length === 0) {
      toast.error("Please add at least one photo before submitting.");
      return;
    }
    onSubmit({
      ...form,
      location: form.location?.trim() || null,
      summary: form.summary?.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Meeting info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Meeting Information</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Client / Institute Name *">
            <Input value={form.client_name} onChange={(e) => update("client_name", e.target.value)} />
          </Field>
          <Field label="Employee Name *">
            <Input value={form.employee_name} onChange={(e) => update("employee_name", e.target.value)} />
          </Field>
          <Field label="Meeting Date *">
            <Input type="date" value={form.meeting_date} onChange={(e) => update("meeting_date", e.target.value)} />
          </Field>
          <Field label="Meeting Type *">
            <Select value={form.meeting_type} onValueChange={(v) => update("meeting_type", v as "online" | "offline")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location" className="md:col-span-2">
            <Input value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} placeholder="Address / link" />
          </Field>
        </CardContent>
      </Card>

      {/* Attendees */}
      <DynamicSection
        title="Attendees"
        icon={Users}
        items={form.attendees}
        onChange={(v) => update("attendees", v)}
        addLabel="Add Attendee"
        empty={{ name: "", designation: "", mobile: "", team: "client" as AttendeeTeam }}
        render={(a, set) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Select value={a.team} onValueChange={(v) => set({ ...a, team: v as AttendeeTeam })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATTENDEE_TEAMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Name" value={a.name} onChange={(e) => set({ ...a, name: e.target.value })} />
            <Input placeholder="Designation" value={a.designation} onChange={(e) => set({ ...a, designation: e.target.value })} />
            <Input placeholder="Mobile (optional)" value={a.mobile ?? ""} onChange={(e) => set({ ...a, mobile: e.target.value })} />
          </div>
        )}
      />

      {/* Discussion points */}
      <DynamicSection
        title="Discussion Points"
        icon={MessagesSquare}
        hint="💡 Tip: Type rough bullet points here, then click ✨ Auto-format with AI to turn them into clean, professional wording."
        items={form.discussion_points}
        onChange={(v) => update("discussion_points", v)}
        addLabel="Add Point"
        empty={{ module: "Other", details: "" }}
        aiLoading={aiLoading === "discussion_points"}
        onAiPolish={() => handleGenerate("discussion_points")}
        render={(d, set) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
            <ModuleSelect value={d.module} onChange={(m) => set({ ...d, module: m })} />
            <Textarea rows={2} placeholder="Discussion details" value={d.details} onChange={(e) => set({ ...d, details: e.target.value })} />
          </div>
        )}
      />

      {/* Work completed */}
      <DynamicSection
        title="Work Completed During Visit"
        icon={ClipboardCheck}
        hint="💡 Tip: Type rough bullet points here, then click ✨ Auto-format with AI to turn them into clean, professional wording."
        items={form.work_completed}
        onChange={(v) => update("work_completed", v)}
        addLabel="Add Task"
        empty={{ module: "Other", task: "" }}
        aiLoading={aiLoading === "work_completed"}
        onAiPolish={() => handleGenerate("work_completed")}
        render={(w, set) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr]">
            <ModuleSelect value={w.module} onChange={(m) => set({ ...w, module: m })} />
            <Input placeholder="Task completed" value={w.task} onChange={(e) => set({ ...w, task: e.target.value })} />
          </div>
        )}
      />

      {/* Pending */}
      <DynamicSection
        title="Pending Points"
        icon={AlarmClockCheck}
        hint="💡 Tip: Type rough bullet points here, then click ✨ Auto-format with AI to turn them into clean, professional wording."
        items={form.pending_points}
        onChange={(v) => update("pending_points", v)}
        addLabel="Add Pending Item"
        empty={{ module: "Other", requirement: "", pending_with: "okie_dokie" as PendingWith }}
        aiLoading={aiLoading === "pending_points"}
        onAiPolish={() => handleGenerate("pending_points")}
        render={(p, set) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_170px]">
            <ModuleSelect value={p.module} onChange={(m) => set({ ...p, module: m })} />
            <Input placeholder="Requirement" value={p.requirement} onChange={(e) => set({ ...p, requirement: e.target.value })} />
            <Select value={p.pending_with} onValueChange={(v) => set({ ...p, pending_with: v as PendingWith })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PENDING_WITH.map((pw) => <SelectItem key={pw.value} value={pw.value}>{pw.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* Photos */}
      <PhotosSection
        photos={form.photos}
        onChange={(v) => update("photos", v)}
      />


      {/* Final submit */}
      <Button type="submit" disabled={submitting} size="lg" className="w-full gap-2 text-base">
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ModuleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function DynamicSection<T>({
  title, icon: Icon, hint, items, onChange, render, empty, addLabel, aiLoading, onAiPolish,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  items: T[];
  onChange: (v: T[]) => void;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
  empty: T;
  addLabel: string;
  aiLoading?: boolean;
  onAiPolish?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </CardTitle>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAiPolish && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAiPolish}
              disabled={aiLoading}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              title="Improve this section with AI"
            >
              {aiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {aiLoading ? "Improving…" : "Improve with AI"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...items, structuredClone(empty)])}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-border bg-muted/20 p-3 transition-colors hover:bg-muted/35">
            <div className="flex-1">
              {render(item, (next) => {
                const copy = items.slice();
                copy[i] = next;
                onChange(copy);
              })}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PhotosSection({
  photos,
  onChange,
}: {
  photos: MomPhoto[];
  onChange: (v: MomPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: MomPhoto[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image`);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name}: exceeds 8MB`);
          continue;
        }
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("mom-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) {
          toast.error(`${file.name}: ${upErr.message}`);
          continue;
        }
        const { data: signed, error: sErr } = await supabase.storage
          .from("mom-photos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (sErr || !signed) {
          toast.error(`${file.name}: could not get URL`);
          continue;
        }
        added.push({ path, url: signed.signedUrl });
      }
      if (added.length) {
        onChange([...photos, ...added]);
        toast.success(`Uploaded ${added.length} photo${added.length > 1 ? "s" : ""}`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (i: number) => {
    const p = photos[i];
    try {
      await supabase.storage.from("mom-photos").remove([p.path]);
    } catch {
      /* ignore */
    }
    onChange(photos.filter((_, idx) => idx !== i));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4 w-4 text-primary" />
            Photos *
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Attach photos from the visit (whiteboard notes, site pictures, screenshots). Max 8MB each. At least one photo is required.
          </p>
        </div>
        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Add Photos"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-sm text-destructive">No photos yet. Please add at least one photo.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((p, i) => (
              <div
                key={p.path}
                className="group relative overflow-hidden rounded-md border border-border bg-muted/20"
              >
                <img
                  src={p.url}
                  alt={p.caption || `Photo ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => void remove(i)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <Input
                  placeholder="Caption (optional)"
                  value={p.caption ?? ""}
                  onChange={(e) => {
                    const copy = photos.slice();
                    copy[i] = { ...p, caption: e.target.value };
                    onChange(copy);
                  }}
                  className="h-8 rounded-none border-0 border-t border-border text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
