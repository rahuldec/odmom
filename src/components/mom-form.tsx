import { useState } from "react";
import { Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
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
  PRIORITIES,
  ATTENDEE_TEAMS,
  PENDING_WITH,
  type MOMInput,
  type Priority,
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
  const [notes, setNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const genFn = useServerFn(generateMomFromNotes);

  const update = <K extends keyof MOMInput>(k: K, v: MOMInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (notes.trim().length < 5) {
      toast.error("Add a few words of notes first.");
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
      toast.success("AI generated MOM sections.");
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
        items={form.pending_points}
        onChange={(v) => update("pending_points", v)}
        addLabel="Add Pending Item"
        empty={{ module: "Other", requirement: "", priority: "Medium" as Priority, pending_with: "okie_dokie" as PendingWith }}
        render={(p, set) => (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_130px_170px]">
            <ModuleSelect value={p.module} onChange={(m) => set({ ...p, module: m })} />
            <Input placeholder="Requirement" value={p.requirement} onChange={(e) => set({ ...p, requirement: e.target.value })} />
            <Select value={p.priority} onValueChange={(v) => set({ ...p, priority: v as Priority })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((pr) => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={p.pending_with} onValueChange={(v) => set({ ...p, pending_with: v as PendingWith })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PENDING_WITH.map((pw) => <SelectItem key={pw.value} value={pw.value}>{pw.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Meeting Summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            value={form.summary ?? ""}
            onChange={(e) => update("summary", e.target.value)}
            placeholder="Provide a concise summary of the meeting, key outcomes, and next steps."
          />
        </CardContent>
      </Card>

      {/* Footer: AI generate + submit */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Generate MOM using AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder='e.g. "Met Principal. Fixed Class 11 fee issue. Updated hostel setup. Need tuition fee certificate."'
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/20 px-6 py-3">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={aiLoading}
            variant="secondary"
            className="gap-1.5"
          >
            {aiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate
          </Button>
          <Button type="submit" disabled={submitting} className="gap-1.5">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </Card>
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
  title, items, onChange, render, empty, addLabel,
}: {
  title: string;
  items: T[];
  onChange: (v: T[]) => void;
  render: (item: T, set: (next: T) => void) => React.ReactNode;
  empty: T;
  addLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, structuredClone(empty)])}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border border-border p-3">
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
