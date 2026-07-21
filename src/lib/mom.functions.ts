import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { MOM, MOMInput } from "./mom-types";

function getSupa() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

const attendeeSchema = z.object({
  name: z.string(),
  designation: z.string().default(""),
  mobile: z.string().optional(),
  team: z.enum(["client", "okie_dokie"]).default("client"),
});
const dpSchema = z.object({ module: z.string(), details: z.string() });
const wcSchema = z.object({ module: z.string(), task: z.string() });
const ppSchema = z.object({
  module: z.string(),
  requirement: z.string(),
  pending_with: z.enum(["okie_dokie", "client", "sample_from_customer"]).default("okie_dokie"),
});
const photoSchema = z.object({
  path: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().optional(),
});

const momInputSchema = z.object({
  client_name: z.string().min(1).max(200),
  meeting_date: z.string().min(1),
  meeting_type: z.enum(["online", "offline"]),
  employee_name: z.string().min(1).max(120),
  location: z.string().max(300).nullable().optional(),
  summary: z.string().max(10000).nullable().optional(),
  attendees: z.array(attendeeSchema).default([]),
  discussion_points: z.array(dpSchema).default([]),
  work_completed: z.array(wcSchema).default([]),
  pending_points: z.array(ppSchema).default([]),
  photos: z.array(photoSchema).default([]),
});


export const listMoms = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        search: z.string().optional(),
        client: z.string().optional(),
        employee: z.string().optional(),
        meeting_type: z.enum(["online", "offline"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<MOM[]> => {
    const supa = getSupa();
    let q = supa
      .from("moms")
      .select("*")
      .order("meeting_date", { ascending: false });
    if (data.client) q = q.ilike("client_name", `%${data.client}%`);
    if (data.employee) q = q.ilike("employee_name", `%${data.employee}%`);
    if (data.meeting_type) q = q.eq("meeting_type", data.meeting_type);
    if (data.from) q = q.gte("meeting_date", data.from);
    if (data.to) q = q.lte("meeting_date", data.to);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(
        `client_name.ilike.${s},employee_name.ilike.${s},summary.ilike.${s},location.ilike.${s}`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as MOM[];
  });

export const getMom = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<MOM | null> => {
    const supa = getSupa();
    const { data: row, error } = await supa
      .from("moms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown as MOM) ?? null;
  });

export const createMom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => momInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const supa = getSupa();
    const { data: row, error } = await supa
      .from("moms")
      .insert(data as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const updateMom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ id: z.string().uuid(), patch: momInputSchema })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supa = getSupa();
    const { error } = await supa
      .from("moms")
      .update(data.patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMom = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const supa = getSupa();
    const { error } = await supa.from("moms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type AiOut = {
  discussion_points: { module: string; details: string }[];
  work_completed: { module: string; task: string }[];
  pending_points: {
    module: string;
    requirement: string;
    pending_with: "okie_dokie" | "client" | "sample_from_customer";
  }[];
  summary: string;
};

export const generateMomFromNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ notes: z.string().min(5).max(5000) }).parse(input),
  )
  .handler(async ({ data }): Promise<AiOut> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const modules = [
      "Admission",
      "SIS",
      "Fee",
      "Transport",
      "HR",
      "Examination",
      "Mobile App",
      "Website",
      "Other",
    ];

    const system = `You are an assistant that turns rough, informally-written meeting notes from a client visit at a school/institute into a structured, professional Minutes of Meeting. The notes may already be loosely grouped under headings like "Discussion points", "Work completed", and "Pending points" — use that grouping as a strong hint for where each item belongs, but feel free to re-classify an item if it's clearly in the wrong place. Rewrite every item in clear, professional, ERP/CRM tone — fix grammar, expand abbreviations, and make vague notes specific where the meaning is clear, without inventing facts that aren't implied by the notes.

Return STRICT JSON matching this shape:
{
  "discussion_points": [{ "module": <one of ${modules.join(", ")}>, "details": string }],
  "work_completed":    [{ "module": <one of ${modules.join(", ")}>, "task": string }],
  "pending_points":    [{ "module": <one of ${modules.join(", ")}>, "requirement": string, "pending_with": "okie_dokie"|"client"|"sample_from_customer" }],
  "summary": string
}
- Infer the right module per item. Use "Other" if unclear.
- For each pending point, set "pending_with" to "okie_dokie" if the Okie Dokie team needs to act, "client" if the school/institute needs to act, or "sample_from_customer" if a physical sample/document/data is awaited from the customer.
- Summary should be 2-4 sentences covering key outcomes and next steps.`;

    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.notes },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );
    if (!resp.ok) {
      const txt = await resp.text();
      if (resp.status === 429)
        throw new Error("AI rate limit exceeded. Please try again shortly.");
      if (resp.status === 402)
        throw new Error("AI credits exhausted. Please add credits.");
      throw new Error(`AI error ${resp.status}: ${txt}`);
    }
    const json = (await resp.json()) as {
      choices: { message: { content: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: AiOut;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    return {
      discussion_points: parsed.discussion_points ?? [],
      work_completed: parsed.work_completed ?? [],
      pending_points: parsed.pending_points ?? [],
      summary: parsed.summary ?? "",
    };
  });
