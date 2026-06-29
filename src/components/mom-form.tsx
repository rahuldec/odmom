import { useState } from "react";
import {
  Plus,
  Sparkles,
  Trash2,
  Loader2,
  Users,
  MessagesSquare,
  ClipboardCheck,
  AlarmClockCheck,
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
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateMomFromNotes } from "@/lib/mom.functions";
import {
  MODULES,
  ATTENDEE_TEAMS,
  PENDING_WITH,
  type MOMInput,
  type AttendeeTeam,
  type PendingWith,
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
});

export function MomForm({ initial, submitting, onSubmit, submitLabel }: Props) {
  const [form, setForm] = useState<MOMInput>(initial ?? blank());
  const [aiLoading, setAiLoading] = useState(false);
  const genFn = useServerFn(generateMomFromNotes);

  const update = <K extends keyof MOMInput>(k: K, v: MOMInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    const lines: string[] = [];

    const dp = form.discussion_points.filter((d) => d.details.trim());
    if (dp.length) {
      lines.push("Discussion points (rough):");
      dp.forEach((d) => lines.push(`- [${d.module}] ${d.details.trim()}`));
    }

    const wc = form.work_completed.filter((w) => w.task.trim());
    if (wc.length) {
      lines.push("Work completed during visit (rough):");
      wc.forEach((w) => lines.push(`- [${w.module}] ${w.task.trim()}`));
    }

    const pp = form.pending_points.filter((p) => p.requirement.trim());
    if (pp.length) {
      lines.push("Pending points (rough):");
      pp.forEach((p) =>
        lines.push(
          `- [${p.module}] ${p.requirement.trim()} (pending with: ${p.pending_with === "okie_dokie" ? "Okie Dokie team" : "client"})`,
        ),
      );
    }

    const notes = lines.join("\n");
    if (notes.trim().length < 5) {
      toast.error(
        "Add a few rough lines under Discussion Points, Work Completed, or Pending Points first.",
      );
      return;
    }

    setAiLoading(true);
    try {
      const r = await genFn({ data: { notes } });
      setForm((f) => ({
        ...f,
        discussion_points: r.discussion_points,
        work_completed: r.work_completed,
        pending_points: r.pending_points,
        summary: r.summary,
      }));
      toast.success("AI polished your MOM.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiLoading(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.employee_name.trim()) {
      toast.error("Client name and Employee name are required.");
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
        hint="Just write roughly — the AI will tidy up the wording for you."
        items={form.discussion_points}
        onChange={(v) => update("discussion_points", v)}
        addLabel="Add Point"
        empty={{ module: "Other", details: "" }}
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
        hint="Just write roughly — the AI will tidy up the wording for you."
        items={form.work_completed}
        onChange={(v) => update("work_completed", v)}
        addLabel="Add Task"
        empty={{ module: "Other", task: "" }}
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
        hint="Just write roughly — the AI will tidy up the wording for you."
        items={form.pending_points}
        onChange={(v) => update("pending_points", v)}
        addLabel="Add Pending Item"
        empty={{ module: "Other", requirement: "", pending_with: "okie_dokie" as PendingWith }}
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

      {/* Big AI generate CTA */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <p className="text-base font-semibold">Let AI polish this MOM</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Wrote the sections above roughly? One click rewrites them into clean,
              professional language and adds a summary — no extra typing needed.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={aiLoading}
            size="lg"
            className="w-full max-w-sm gap-2 text-base shadow-sm"
          >
            {aiLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Generate MOM using AI
          </Button>
        </CardContent>
      </Card>

      {/* Final submit, kept separate from the AI card */}
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
  title, icon: Icon, hint, items, onChange, render, empty, addLabel,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  items: T[];
  onChange: (v: T[]) => void;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
  empty: T;
  addLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </CardTitle>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, structuredClone(empty)])}
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
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
