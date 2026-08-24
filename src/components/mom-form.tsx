import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlarmClockCheck,
  Check,
  ClipboardCheck,
  GripVertical,
  ImagePlus,
  Loader2,
  MessagesSquare,
  Paperclip,
  PenLine,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  Undo2,
  Users,
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
import { Card } from "@/components/ui/card";
import { ModuleChip } from "@/components/chips";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateMomFromNotes } from "@/lib/mom.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  MODULES,
  PENDING_WITH,
  type MOMInput,
  type AttendeeTeam,
  type PendingWith,
  type MomPhoto,
  type PendingAttachment,
} from "@/lib/mom-types";

type Props = {
  initial?: MOMInput;
  submitting?: boolean;
  onSubmit: (input: MOMInput) => void | Promise<void>;
  submitLabel: string;
  /** Set on the "new MOM" route so work-in-progress survives a lost connection. */
  draftKey?: string;
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

type AiSection = "discussion_points" | "work_completed" | "pending_points";

const SECTIONS = [
  { id: "meeting", label: "Meeting", icon: PenLine, required: true },
  { id: "attendees", label: "Attendees", icon: Users, required: false },
  { id: "discussion", label: "Discussion", icon: MessagesSquare, required: false },
  { id: "work", label: "Work done", icon: ClipboardCheck, required: false },
  { id: "pending", label: "Pending", icon: AlarmClockCheck, required: false },
  { id: "photos", label: "Photos", icon: ImagePlus, required: true },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type Errors = Partial<Record<"client_name" | "employee_name" | "meeting_date" | "photos", string>>;

const FIELD_LABELS: Record<keyof Errors, string> = {
  client_name: "client name",
  employee_name: "attendee name",
  meeting_date: "meeting date",
  photos: "photos",
};

export function MomForm({ initial, submitting, onSubmit, submitLabel, draftKey }: Props) {
  const [form, setForm] = useState<MOMInput>(initial ?? blank());
  const [errors, setErrors] = useState<Errors>({});
  const [aiLoading, setAiLoading] = useState<AiSection | null>(null);
  const [undoable, setUndoable] = useState<Partial<Record<AiSection, MOMInput[AiSection]>>>({});
  const [draft, setDraft] = useState<{ savedAt: string; value: MOMInput } | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const genFn = useServerFn(generateMomFromNotes);
  const dirty = useRef(false);
  const [dragAttendee, setDragAttendee] = useState<number | null>(null);
  const [overAttendee, setOverAttendee] = useState<number | null>(null);

  const update = <K extends keyof MOMInput>(k: K, v: MOMInput[K]) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const moveAttendee = (from: number, to: number) => {
    if (from === to) return;
    const copy = form.attendees.slice();
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    update("attendees", copy);
  };

  /* ---------------------------------------------------------------- drafts */

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: string; value: MOMInput };
      if (parsed?.value?.client_name !== undefined) setDraft(parsed);
    } catch {
      /* corrupt draft — ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !dirty.current) return;
    const t = setTimeout(() => {
      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(draftKey, JSON.stringify({ savedAt, value: form }));
        setDraftSavedAt(savedAt);
      } catch {
        /* storage full or blocked */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [form, draftKey]);

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    setDraftSavedAt(null);
  }, [draftKey]);

  /* ------------------------------------------------------------ completion */

  const status = useMemo(() => {
    const meetingDone = Boolean(
      form.client_name.trim() && form.employee_name.trim() && form.meeting_date,
    );
    return {
      meeting: meetingDone ? "done" : "todo",
      attendees: form.attendees.length ? "done" : "empty",
      discussion: form.discussion_points.length ? "done" : "empty",
      work: form.work_completed.length ? "done" : "empty",
      pending: form.pending_points.length ? "done" : "empty",
      photos: form.photos.length ? "done" : "todo",
    } as Record<SectionId, "done" | "todo" | "empty">;
  }, [form]);

  const counts: Record<SectionId, number | null> = {
    meeting: null,
    attendees: form.attendees.length,
    discussion: form.discussion_points.length,
    work: form.work_completed.length,
    pending: form.pending_points.length,
    photos: form.photos.length,
  };

  const blockers = SECTIONS.filter((s) => s.required && status[s.id] === "todo");

  /* -------------------------------------------------------------------- AI */

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
            `- [${p.module}] ${p.requirement.trim()} (pending with: ${
              p.pending_with === "okie_dokie" ? "Okie Dokie team" : "client"
            })`,
          ),
        );
      }
    }
    return lines.join("\n");
  };

  const handleGenerate = async (section: AiSection) => {
    const notes = buildNotes(section);
    if (notes.trim().length < 5) {
      toast.error("Write a few rough lines in this section first.");
      return;
    }

    const before = structuredClone(form[section]) as MOMInput[AiSection];
    setAiLoading(section);
    try {
      const r = await genFn({ data: { notes } });
      setForm((f) => {
        const next = { ...f };
        if (section === "discussion_points") next.discussion_points = r.discussion_points;
        if (section === "work_completed") next.work_completed = r.work_completed;
        if (section === "pending_points") {
          // The AI only rewrites module/requirement/pending_with text — it never
          // sees or returns attachments. Re-attach the original files by index
          // so formatting doesn't wipe out client sample uploads.
          next.pending_points = r.pending_points.map((pp, i) => ({
            ...pp,
            attachments: f.pending_points[i]?.attachments ?? [],
          }));
        }
        return next;
      });
      dirty.current = true;
      setUndoable((u) => ({ ...u, [section]: before }));
      toast.success("Auto corrected. Read it before you save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reach the AI. Try again.");
    } finally {
      setAiLoading(null);
    }
  };

  const handleUndo = (section: AiSection) => {
    const before = undoable[section];
    if (!before) return;
    setForm((f) => ({ ...f, [section]: before }) as MOMInput);
    setUndoable((u) => ({ ...u, [section]: undefined }));
  };

  /* ------------------------------------------------------------ validation */

  const goTo = (id: SectionId) => {
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!form.client_name.trim()) next.client_name = "Enter the client or institute name.";
    if (!form.employee_name.trim()) next.employee_name = "Enter who attended from Okie Dokie.";
    if (!form.meeting_date) next.meeting_date = "Pick the meeting date.";
    if (form.photos.length === 0) next.photos = "Add at least one photo from the visit.";

    setErrors(next);
    const missing = Object.keys(next) as (keyof Errors)[];
    if (missing.length > 0) {
      const first: SectionId = missing.length === 1 && next.photos ? "photos" : "meeting";
      goTo(first);
      // Name what's actually missing — "a few things" tells the person less
      // than the bar above the button already does.
      toast.error(
        missing.length === 1
          ? next[missing[0]]
          : `Still needed: ${missing.map((k) => FIELD_LABELS[k]).join(", ")}.`,
      );
      return;
    }

    try {
      await onSubmit({
        ...form,
        location: form.location?.trim() || null,
        summary: form.summary?.trim() || null,
      });
      clearDraft();
    } catch {
      // The route already showed the failure — keep the draft so nothing is lost.
    }
  };

  /* ----------------------------------------------------------------- paste */

  const photosRef = useRef<PhotosHandle>(null);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length) photosRef.current?.addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /* ------------------------------------------------------------------ view */

  return (
    <form onSubmit={submit} className="lg:grid lg:grid-cols-[13rem_1fr] lg:gap-10">
      {/* Section rail */}
      <nav aria-label="Form sections" className="mb-6 lg:mb-0">
        <div className="sticky top-24">
          <p className="eyebrow mb-3 hidden lg:block">Sections</p>
          <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-0">
            {SECTIONS.map((s) => {
              const state = status[s.id];
              const count = counts[s.id];
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors lg:border-transparent lg:bg-transparent",
                      "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <StateDot state={state} required={s.required} />
                    <span className="font-medium">{s.label}</span>
                    {count !== null && count > 0 && (
                      <span className="tabular ml-auto text-xs text-muted-foreground">{count}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="space-y-6">
        {draft && draftKey && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <span className="flex-1">
              You have an unsaved MOM from{" "}
              <span className="tabular">
                {new Date(draft.savedAt).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              .
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setForm(draft.value);
                setDraft(null);
                toast.success("Draft restored");
              }}
            >
              Restore it
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                clearDraft();
                setDraft(null);
              }}
            >
              Discard
            </Button>
          </div>
        )}

        {/* 1 — Meeting */}
        <Section
          id="meeting"
          index={1}
          title="Meeting"
          description="Who you met, when, and where. This becomes the header of the PDF."
          icon={PenLine}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Client or institute" required error={errors.client_name}>
              <Input
                value={form.client_name}
                onChange={(e) => update("client_name", e.target.value)}
                placeholder="e.g. Poornima Institute"
                aria-invalid={!!errors.client_name}
              />
            </Field>
            <Field label="Okie Dokie attendee" required error={errors.employee_name}>
              <Input
                value={form.employee_name}
                onChange={(e) => update("employee_name", e.target.value)}
                placeholder="Your name"
                aria-invalid={!!errors.employee_name}
              />
            </Field>
            <Field label="Meeting date" required error={errors.meeting_date}>
              <Input
                type="date"
                value={form.meeting_date}
                onChange={(e) => update("meeting_date", e.target.value)}
                aria-invalid={!!errors.meeting_date}
              />
            </Field>
            <Field label="Meeting type" required>
              <Segmented
                value={form.meeting_type}
                onChange={(v) => update("meeting_type", v)}
                options={[
                  { value: "offline", label: "On site" },
                  { value: "online", label: "Online" },
                ]}
              />
            </Field>
            <Field
              label={form.meeting_type === "online" ? "Meeting link" : "Campus / address"}
              className="md:col-span-2"
            >
              <Input
                value={form.location ?? ""}
                onChange={(e) => update("location", e.target.value)}
                placeholder={
                  form.meeting_type === "online"
                    ? "Google Meet or Zoom link"
                    : "Campus name and city"
                }
              />
            </Field>
          </div>
        </Section>

        {/* 2 — Attendees */}
        <Section
          id="attendees"
          index={2}
          title="Attendees"
          description="Everyone in the room, on both sides."
          icon={Users}
          count={form.attendees.length}
          onAdd={() =>
            update("attendees", [
              ...form.attendees,
              { name: "", designation: "", mobile: "", team: "client" as AttendeeTeam },
            ])
          }
          addLabel="Add attendee"
          emptyLabel="No attendees added yet."
        >
          {form.attendees.map((a, i) => (
            <div
              key={i}
              onDragOver={(e) => {
                if (dragAttendee === null) return;
                e.preventDefault();
                if (overAttendee !== i) setOverAttendee(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragAttendee !== null) moveAttendee(dragAttendee, i);
                setDragAttendee(null);
                setOverAttendee(null);
              }}
              className={cn(
                "rounded-lg border-t-2 border-t-transparent",
                dragAttendee === i && "opacity-50",
                overAttendee === i &&
                  dragAttendee !== null &&
                  dragAttendee !== i &&
                  "border-t-primary",
              )}
            >
              <Row
                onRemove={() =>
                  update(
                    "attendees",
                    form.attendees.filter((_, idx) => idx !== i),
                  )
                }
                removeLabel={`Remove attendee ${i + 1}`}
              >
                <div className="flex items-start gap-2">
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragAttendee(i);
                    }}
                    onDragEnd={() => {
                      setDragAttendee(null);
                      setOverAttendee(null);
                    }}
                    className="mt-2 shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
                    aria-label={`Drag to reorder attendee ${i + 1}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_170px]">
                    <Input
                      placeholder="Name"
                      value={a.name}
                      onChange={(e) => {
                        const copy = form.attendees.slice();
                        copy[i] = { ...a, name: e.target.value };
                        update("attendees", copy);
                      }}
                    />
                    <Input
                      placeholder="Designation"
                      value={a.designation}
                      onChange={(e) => {
                        const copy = form.attendees.slice();
                        copy[i] = { ...a, designation: e.target.value };
                        update("attendees", copy);
                      }}
                    />
                    <Input
                      placeholder="Mobile (optional)"
                      inputMode="tel"
                      value={a.mobile ?? ""}
                      onChange={(e) => {
                        const copy = form.attendees.slice();
                        copy[i] = { ...a, mobile: e.target.value };
                        update("attendees", copy);
                      }}
                    />
                    <Select
                      value={a.team}
                      onValueChange={(v) => {
                        const copy = form.attendees.slice();
                        copy[i] = { ...a, team: v as AttendeeTeam };
                        update("attendees", copy);
                      }}
                    >
                      <SelectTrigger aria-label="Team">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="okie_dokie">Okie Dokie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Row>
            </div>
          ))}
        </Section>

        {/* 3 — Discussion */}
        <Section
          id="discussion"
          index={3}
          title="Discussion points"
          description="What was raised. Type it rough — auto correct cleans it up after."
          icon={MessagesSquare}
          count={form.discussion_points.length}
          onAdd={() =>
            update("discussion_points", [
              ...form.discussion_points,
              { module: "Other", details: "" },
            ])
          }
          addLabel="Add point"
          emptyLabel="No discussion points yet."
          ai={{
            loading: aiLoading === "discussion_points",
            disabled: form.discussion_points.length === 0,
            onRun: () => void handleGenerate("discussion_points"),
            canUndo: !!undoable.discussion_points,
            onUndo: () => handleUndo("discussion_points"),
          }}
        >
          {form.discussion_points.map((d, i) => (
            <Row
              key={i}
              onRemove={() =>
                update(
                  "discussion_points",
                  form.discussion_points.filter((_, idx) => idx !== i),
                )
              }
              removeLabel={`Remove discussion point ${i + 1}`}
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[190px_1fr]">
                <ModuleSelect
                  value={d.module}
                  onChange={(m) => {
                    const copy = form.discussion_points.slice();
                    copy[i] = { ...d, module: m };
                    update("discussion_points", copy);
                  }}
                />
                <Textarea
                  rows={2}
                  placeholder="What was discussed"
                  value={d.details}
                  onChange={(e) => {
                    const copy = form.discussion_points.slice();
                    copy[i] = { ...d, details: e.target.value };
                    update("discussion_points", copy);
                  }}
                />
              </div>
            </Row>
          ))}
        </Section>

        {/* 4 — Work completed */}
        <Section
          id="work"
          index={4}
          title="Work completed during the visit"
          description="Anything you configured, fixed, or trained on while you were there."
          icon={ClipboardCheck}
          count={form.work_completed.length}
          onAdd={() =>
            update("work_completed", [...form.work_completed, { module: "Other", task: "" }])
          }
          addLabel="Add task"
          emptyLabel="No completed work recorded yet."
          ai={{
            loading: aiLoading === "work_completed",
            disabled: form.work_completed.length === 0,
            onRun: () => void handleGenerate("work_completed"),
            canUndo: !!undoable.work_completed,
            onUndo: () => handleUndo("work_completed"),
          }}
        >
          {form.work_completed.map((w, i) => (
            <Row
              key={i}
              onRemove={() =>
                update(
                  "work_completed",
                  form.work_completed.filter((_, idx) => idx !== i),
                )
              }
              removeLabel={`Remove task ${i + 1}`}
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[190px_1fr]">
                <ModuleSelect
                  value={w.module}
                  onChange={(m) => {
                    const copy = form.work_completed.slice();
                    copy[i] = { ...w, module: m };
                    update("work_completed", copy);
                  }}
                />
                <Input
                  placeholder="What was completed"
                  value={w.task}
                  onChange={(e) => {
                    const copy = form.work_completed.slice();
                    copy[i] = { ...w, task: e.target.value };
                    update("work_completed", copy);
                  }}
                />
              </div>
            </Row>
          ))}
        </Section>

        {/* 5 — Pending */}
        <Section
          id="pending"
          index={5}
          title="Pending points"
          description="Open items, and who they're waiting on. This is the part clients read first."
          icon={AlarmClockCheck}
          count={form.pending_points.length}
          onAdd={() =>
            update("pending_points", [
              ...form.pending_points,
              {
                module: "Other",
                requirement: "",
                pending_with: "okie_dokie" as PendingWith,
                attachments: [],
              },
            ])
          }
          addLabel="Add pending item"
          emptyLabel="Nothing pending — good place to be."
          ai={{
            loading: aiLoading === "pending_points",
            disabled: form.pending_points.length === 0,
            onRun: () => void handleGenerate("pending_points"),
            canUndo: !!undoable.pending_points,
            onUndo: () => handleUndo("pending_points"),
          }}
        >
          {form.pending_points.map((p, i) => (
            <Row
              key={i}
              onRemove={() =>
                update(
                  "pending_points",
                  form.pending_points.filter((_, idx) => idx !== i),
                )
              }
              removeLabel={`Remove pending item ${i + 1}`}
            >
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-[190px_1fr_210px]">
                  <ModuleSelect
                    value={p.module}
                    onChange={(m) => {
                      const copy = form.pending_points.slice();
                      copy[i] = { ...p, module: m };
                      update("pending_points", copy);
                    }}
                  />
                  <Input
                    placeholder="What still needs doing"
                    value={p.requirement}
                    onChange={(e) => {
                      const copy = form.pending_points.slice();
                      copy[i] = { ...p, requirement: e.target.value };
                      update("pending_points", copy);
                    }}
                  />
                  <Select
                    value={p.pending_with}
                    onValueChange={(v) => {
                      const copy = form.pending_points.slice();
                      copy[i] = { ...p, pending_with: v as PendingWith };
                      update("pending_points", copy);
                    }}
                  >
                    <SelectTrigger aria-label="Pending with">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PENDING_WITH.map((pw) => (
                        <SelectItem key={pw.value} value={pw.value}>
                          Waiting on {pw.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PendingAttachments
                  value={p.attachments ?? []}
                  onChange={(nextFiles) => {
                    const copy = form.pending_points.slice();
                    copy[i] = { ...p, attachments: nextFiles };
                    update("pending_points", copy);
                  }}
                />
              </div>
            </Row>
          ))}
        </Section>

        {/* 6 — Photos */}
        <PhotosSection
          ref={photosRef}
          photos={form.photos}
          error={errors.photos}
          onChange={(v) => update("photos", v)}
        />

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border lg:px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 text-sm">
              {blockers.length > 0 ? (
                <span className="text-muted-foreground">
                  Still needed:{" "}
                  {blockers.map((b, i) => (
                    <span key={b.id}>
                      {i > 0 && ", "}
                      <button
                        type="button"
                        className="font-medium text-primary hover:underline"
                        onClick={() => goTo(b.id)}
                      >
                        {b.label.toLowerCase()}
                      </button>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" /> Ready to save
                </span>
              )}
              {draftSavedAt && (
                <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                  · draft saved
                </span>
              )}
            </div>
            <Button type="submit" disabled={submitting} className="gap-2 font-semibold">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ pieces */

function StateDot({ state, required }: { state: "done" | "todo" | "empty"; required: boolean }) {
  if (state === "done") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border-2",
        required && state === "todo" ? "border-destructive" : "border-border",
      )}
    />
  );
}

function Section({
  id,
  index,
  title,
  description,
  icon: Icon,
  count,
  onAdd,
  addLabel,
  emptyLabel,
  ai,
  children,
}: {
  id: SectionId;
  index: number;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
  emptyLabel?: string;
  ai?: {
    loading: boolean;
    disabled: boolean;
    onRun: () => void;
    canUndo: boolean;
    onUndo: () => void;
  };
  children?: React.ReactNode;
}) {
  const isEmpty = count === 0;

  return (
    <Card id={`section-${id}`} className="scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1.5">
            {String(index).padStart(2, "0")} · Section
          </p>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ai?.canUndo && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={ai.onUndo}
              className="gap-1.5 text-muted-foreground"
            >
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
          )}
          {ai && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={ai.onRun}
              disabled={ai.loading || ai.disabled}
              title={
                ai.disabled
                  ? "Add a point first, then auto correct it"
                  : "Rewrites your rough notes into clear MOM language. Your points stay — only the wording changes."
              }
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              {ai.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {ai.loading ? "Correcting…" : "Auto correct with AI"}
            </Button>
          )}
          {onAdd && (
            <Button type="button" size="sm" onClick={onAdd} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 p-5">
        {isEmpty && emptyLabel ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            {emptyLabel} <span className="font-medium text-primary">{addLabel}</span>
          </button>
        ) : (
          <>
            {children}
            {/* Footer add, from the first row onward — the header button is off
                screen once a section grows, and it's the same action. */}
            {onAdd && (count ?? 0) > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAdd}
                className="w-full gap-1.5 border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> {addLabel}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function Row({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 transition-colors focus-within:border-primary/40 hover:bg-muted/70">
      <div className="min-w-0 flex-1">{children}</div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onRemove}
        aria-label={removeLabel}
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex h-9 w-full items-stretch overflow-hidden rounded-md border border-input bg-background p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-w-0 flex-1 truncate rounded-[0.3rem] px-1.5 text-xs font-medium transition-colors sm:px-2 sm:text-sm",
            value === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ModuleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label="Module">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODULES.map((m) => (
          <SelectItem key={m} value={m}>
            <ModuleChip module={m} className="module-chip--lg" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ------------------------------------------------------------------ photos */

type PhotosHandle = { addFiles: (files: File[]) => void };

function PhotosSection({
  photos,
  onChange,
  error,
  ref,
}: {
  photos: MomPhoto[];
  onChange: (v: MomPhoto[]) => void;
  error?: string;
  ref?: React.Ref<PhotosHandle>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rotating, setRotating] = useState<number | null>(null);
  const latest = useRef(photos);
  latest.current = photos;

  const addFiles = useCallback(
    async (files: File[], kind: "general" | "selfie" = "general") => {
      if (!files.length) return;
      setUploading(true);
      const added: MomPhoto[] = [];
      try {
        for (const file of files) {
          if (!file.type.startsWith("image/")) {
            toast.error(`${file.name} isn't an image.`);
            continue;
          }
          if (file.size > 8 * 1024 * 1024) {
            toast.error(`${file.name} is over 8 MB.`);
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
            toast.error(`${file.name}: couldn't get a link.`);
            continue;
          }
          added.push(
            kind === "selfie"
              ? { path, url: signed.signedUrl, kind, caption: "Selfie with app poster" }
              : { path, url: signed.signedUrl },
          );
        }
        if (added.length) {
          onChange([...latest.current, ...added]);
          toast.success(
            kind === "selfie"
              ? "Selfie with app poster added"
              : `Added ${added.length} photo${added.length > 1 ? "s" : ""}`,
          );
        }
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
        if (selfieRef.current) selfieRef.current.value = "";
      }
    },
    [onChange],
  );

  useImperativeHandle(ref, () => ({ addFiles: (files) => void addFiles(files) }), [addFiles]);

  const remove = async (i: number) => {
    const p = photos[i];
    try {
      await supabase.storage.from("mom-photos").remove([p.path]);
    } catch {
      /* the record matters more than an orphaned file */
    }
    onChange(photos.filter((_, idx) => idx !== i));
  };

  const rotatePhoto = async (i: number) => {
    const p = photos[i];
    setRotating(i);
    try {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error("Couldn't load the photo.");
      const sourceBlob = await res.blob();
      const objectUrl = URL.createObjectURL(sourceBlob);
      let img: HTMLImageElement;
      try {
        img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Couldn't decode the photo."));
          el.src = objectUrl;
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }

      // Rotate the actual pixels (not just a CSS transform) so the stored
      // file — and the PDF export, which draws these raw — stay in sync.
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const rotatedBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!rotatedBlob) throw new Error("Couldn't rotate the photo.");

      const { error: upErr } = await supabase.storage
        .from("mom-photos")
        .upload(p.path, rotatedBlob, { cacheControl: "3600", upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { data: signed, error: sErr } = await supabase.storage
        .from("mom-photos")
        .createSignedUrl(p.path, 60 * 60 * 24 * 365 * 5);
      if (sErr || !signed) throw new Error("Couldn't refresh the link.");

      const bust = signed.signedUrl.includes("?") ? "&" : "?";
      const idx = latest.current.findIndex((x) => x.path === p.path);
      if (idx !== -1) {
        const copy = latest.current.slice();
        copy[idx] = { ...copy[idx], url: `${signed.signedUrl}${bust}t=${Date.now()}` };
        onChange(copy);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't rotate the photo.");
    } finally {
      setRotating(null);
    }
  };

  return (
    <Card id="section-photos" className="scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1.5">06 · Section</p>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <ImagePlus className="h-4 w-4 text-primary" />
            Photos <span className="text-primary">*</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Whiteboards, screens, the room. At least one is required — drag files in or paste a
            screenshot.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(Array.from(e.target.files ?? []))}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 gap-1.5"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
      </div>

      <div className="p-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "rounded-lg border border-dashed transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border",
            photos.length ? "p-3" : "p-0",
          )}
        >
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 px-4 py-10 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ImagePlus className="h-5 w-5" />
              <span>
                Drop photos here, paste a screenshot, or{" "}
                <span className="font-medium text-primary">browse your files</span>
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p, i) => (
                <div
                  key={p.path}
                  className="group relative overflow-hidden rounded-lg border border-border bg-card"
                >
                  <img
                    src={p.url}
                    alt={p.caption || `Photo ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute right-1.5 top-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => void rotatePhoto(i)}
                      disabled={rotating === i}
                      className="rounded-full bg-foreground/70 p-1 text-background opacity-0 transition-opacity hover:bg-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100"
                      aria-label={`Rotate photo ${i + 1}`}
                    >
                      {rotating === i ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(i)}
                      disabled={rotating === i}
                      className="rounded-full bg-foreground/70 p-1 text-background opacity-0 transition-opacity hover:bg-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Input
                    placeholder="Caption (optional)"
                    value={p.caption ?? ""}
                    onChange={(e) => {
                      const copy = photos.slice();
                      copy[i] = { ...p, caption: e.target.value };
                      onChange(copy);
                    }}
                    className="h-8 rounded-none border-0 border-t border-border text-xs shadow-none focus-visible:ring-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
      </div>
    </Card>
  );
}

function PendingAttachments({
  value,
  onChange,
}: {
  value: PendingAttachment[];
  onChange: (v: PendingAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const added: PendingAttachment[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} is over 15 MB.`);
          continue;
        }
        const ext = file.name.split(".").pop() || "bin";
        const path = `pending/${crypto.randomUUID()}.${ext}`;
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
          toast.error(`${file.name}: couldn't get a link.`);
          continue;
        }
        added.push({ path, url: signed.signedUrl, name: file.name });
      }
      if (added.length) {
        onChange([...value, ...added]);
        toast.success(`Attached ${added.length} file${added.length > 1 ? "s" : ""}`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (i: number) => {
    const a = value[i];
    try {
      await supabase.storage.from("mom-photos").remove([a.path]);
    } catch {
      /* ignore */
    }
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Paperclip className="h-3 w-3" />
        )}
        {uploading ? "Uploading…" : "Attach a file from the client"}
      </Button>
      {value.map((a, i) => (
        <span
          key={a.path}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 text-xs"
        >
          <a
            href={a.url}
            target="_blank"
            rel="noreferrer"
            className="max-w-[180px] truncate hover:underline"
          >
            {a.name || "file"}
          </a>
          <button
            type="button"
            onClick={() => void remove(i)}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${a.name || "attachment"}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
