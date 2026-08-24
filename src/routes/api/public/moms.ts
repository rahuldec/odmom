import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const attendeeSchema = z.object({
  name: z.string().min(1),
  designation: z.string().default(""),
  mobile: z.string().optional(),
  team: z.enum(["client", "okie_dokie"]).default("client"),
});
const photoSchema = z.object({
  path: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().optional(),
  kind: z.enum(["general", "selfie"]).optional(),
});
const momSchema = z.object({
  client_name: z.string().min(1).max(200),
  meeting_date: z.string().min(1),
  meeting_type: z.enum(["online", "offline"]),
  employee_name: z.string().min(1).max(120),
  location: z.string().max(300).nullable().optional(),
  summary: z.string().max(10000).nullable().optional(),
  attendees: z.array(attendeeSchema).default([]),
  discussion_points: z
    .array(z.object({ module: z.string(), details: z.string() }))
    .default([]),
  work_completed: z
    .array(z.object({ module: z.string(), task: z.string() }))
    .default([]),
  pending_points: z
    .array(
      z.object({
        module: z.string(),
        requirement: z.string(),
        pending_with: z.enum(["okie_dokie", "client"]).default("okie_dokie"),
        attachments: z
          .array(
            z.object({
              path: z.string().min(1),
              url: z.string().min(1),
              name: z.string().optional(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .default([]),
  photos: z.array(photoSchema).default([]),
});

function authorized(request: Request): boolean {
  const expected = process.env["MOM_API_KEY"];
  if (!expected) return false;
  const provided =
    request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export const Route = createFileRoute("/api/public/moms")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
        const client = url.searchParams.get("client");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        let q = supabaseAdmin
          .from("moms")
          .select("*")
          .order("meeting_date", { ascending: false })
          .limit(limit);
        if (client) q = q.ilike("client_name", `%${client}%`);
        if (from) q = q.gte("meeting_date", from);
        if (to) q = q.lte("meeting_date", to);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ data });
      },

      POST: async ({ request }) => {
        if (!authorized(request)) return json({ error: "Unauthorized" }, 401);
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = momSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            { error: "Validation failed", issues: parsed.error.issues },
            400,
          );
        }
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data, error } = await supabaseAdmin
          .from("moms")
          .insert(parsed.data as never)
          .select("*")
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ data }, 201);
      },
    },
  },
});
