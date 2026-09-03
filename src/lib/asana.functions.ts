import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MOM } from "./mom-types";
import { getMom } from "./mom.functions";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID;
const ASANA_CLIENT_ID = process.env.ASANA_CLIENT_ID;
const ASANA_CLIENT_SECRET = process.env.ASANA_CLIENT_SECRET;
const ASANA_REDIRECT_URI = process.env.ASANA_REDIRECT_URI || "http://localhost:8080/auth/asana/callback";

// In-memory cache so we don't refresh on every request within the same server process
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getValidToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expires_at - now > 60_000) {
    return cachedToken.access_token;
  }

  const refreshToken = process.env.ASANA_REFRESH_TOKEN;
  if (refreshToken && ASANA_CLIENT_ID && ASANA_CLIENT_SECRET) {
    // Auto-refresh using refresh token
    const res = await fetch("https://app.asana.com/-/oauth_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ASANA_CLIENT_ID,
        client_secret: ASANA_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { access_token: string; expires_in: number };
      cachedToken = { access_token: data.access_token, expires_at: now + data.expires_in * 1000 };
      return cachedToken.access_token;
    }
  }

  // Fall back to the static token in .env
  const staticToken = process.env.ASANA_OAUTH_TOKEN;
  if (!staticToken) throw new Error("Asana OAuth token not configured");
  return staticToken;
}

async function getAsanaHeaders() {
  const token = await getValidToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const getTodaysTasks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({}).parse(input ?? {}),
  )
  .handler(async (): Promise<{ gid: string; name: string }[]> => {
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const response = await fetch(
      `${ASANA_API_BASE}/projects/${ASANA_PROJECT_ID}/tasks?opt_fields=gid,name,created_at`,
      { headers: await getAsanaHeaders() },
    );

    if (!response.ok) throw new Error("Failed to fetch Asana tasks");

    const data = (await response.json()) as { data: { gid: string; name: string; created_at: string }[] };

    // Filter tasks created today
    return data.data
      .filter((task) => task.created_at.startsWith(todayStr))
      .map((task) => ({ gid: task.gid, name: task.name }));
  });

/** All open tasks in the project, newest first — for picking an existing task. */
export const getProjectTasks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async (): Promise<{ gid: string; name: string; created_at: string }[]> => {
    const projectId = process.env.ASANA_PROJECT_ID ?? ASANA_PROJECT_ID;
    if (!projectId) throw new Error("Asana project ID not configured");

    const response = await fetch(
      `${ASANA_API_BASE}/projects/${projectId}/tasks?limit=100&opt_fields=gid,name,created_at,completed`,
      { headers: await getAsanaHeaders() },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Asana tasks [${response.status}]: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      data: { gid: string; name: string; created_at: string; completed: boolean }[];
    };

    return data.data
      .filter((t) => !t.completed)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((t) => ({ gid: t.gid, name: t.name, created_at: t.created_at }));
  });



async function attachPdfToTask(
  taskId: string,
  pdfData: string,
  clientName: string,
  meetingDate: string,
) {
  const boundary = `----FormBoundary${Date.now()}`;
  const buffer = Buffer.from(pdfData, "base64");
  const safe = clientName.replace(/[^a-z0-9]+/gi, "_");
  const filename = `MOM_${safe}_${meetingDate}.pdf`;

  const parts = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    `Content-Type: application/pdf`,
    ``,
  ];

  const body = Buffer.concat([
    Buffer.from(parts.join("\r\n") + "\r\n"),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const token = await getValidToken();
  const res = await fetch(`${ASANA_API_BASE}/tasks/${taskId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    console.error(`PDF attach failed [${res.status}]: ${await res.text()}`);
  }
}

/** Creates a brand-new Asana task for this MOM and attaches the PDF. */
export const createMomAsanaTask = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        pdfData: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ task_id: string; task_url: string }> => {
    const projectId = process.env.ASANA_PROJECT_ID ?? ASANA_PROJECT_ID;
    if (!projectId) throw new Error("Asana project ID not configured");

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const meetingDate = mom.meeting_date.slice(0, 10);
    const taskName = `MOM — ${mom.client_name} — ${meetingDate}`;

    const createRes = await fetch(`${ASANA_API_BASE}/tasks`, {
      method: "POST",
      headers: await getAsanaHeaders(),
      body: JSON.stringify({
        data: {
          projects: [projectId],
          name: taskName,
          notes: formatAsanaTaskDescription(mom),
          due_on: meetingDate,
        },
      }),
    });

    if (!createRes.ok) {
      throw new Error(
        `Failed to create Asana task [${createRes.status}]: ${await createRes.text()}`,
      );
    }

    const created = (await createRes.json()) as { data: { gid: string; permalink_url?: string } };
    const taskId = created.data.gid;

    if (data.pdfData) {
      try {
        await attachPdfToTask(taskId, data.pdfData, mom.client_name, meetingDate);
      } catch (error) {
        console.error("Error attaching PDF:", String(error));
      }
    }

    return {
      task_id: taskId,
      task_url: created.data.permalink_url ?? `https://app.asana.com/0/${projectId}/${taskId}`,
    };
  });

export const uploadMomToAsana = createServerFn({ method: "POST" })

  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      taskId: z.string().min(1),
      pdfData: z.string().optional(), // base64 encoded PDF (optional)
      clientName: z.string(),
      meetingDate: z.string(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<{ task_id: string; task_url: string }> => {
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const taskId = data.taskId;
    const description = formatAsanaTaskDescription(mom);

    // Update task description with MOM details
    const updateResponse = await fetch(`${ASANA_API_BASE}/tasks/${taskId}`, {
      method: "PUT",
      headers: await getAsanaHeaders(),
      body: JSON.stringify({
        data: {
          notes: description,
        },
      }),
    });

    if (!updateResponse.ok) {
      throw new Error("Failed to update task description");
    }

    // Attach PDF if provided
    if (data.pdfData) {
      try {
        const boundary = `----FormBoundary${Date.now()}`;
        const buffer = Buffer.from(data.pdfData, "base64");
        const safe = data.clientName.replace(/[^a-z0-9]+/gi, "_");
        const filename = `MOM_${safe}_${data.meetingDate}.pdf`;

        // Manually construct multipart/form-data
        const parts = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="file"; filename="${filename}"`,
          `Content-Type: application/pdf`,
          ``,
        ];

        const body = Buffer.concat([
          Buffer.from(parts.join("\r\n") + "\r\n"),
          buffer,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const token = await getValidToken();
        const attachResponse = await fetch(`${ASANA_API_BASE}/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
          },
          body,
        });

        if (!attachResponse.ok) {
          console.error(`PDF attach failed: ${attachResponse.status}`);
        }
      } catch (error) {
        console.error("Error attaching PDF:", String(error));
      }
    }

    return {
      task_id: taskId,
      task_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}/${taskId}`,
    };
  });

function formatAsanaTaskDescription(mom: MOM): string {
  const lines: string[] = [];

  lines.push(`📅 **Meeting Date:** ${new Date(mom.meeting_date).toLocaleDateString()}`);
  lines.push(`👤 **Recorded by:** ${mom.employee_name}`);
  lines.push(`📍 **Type:** ${mom.meeting_type === "online" ? "Online" : "On-site"}`);
  if (mom.location) lines.push(`**Location:** ${mom.location}`);

  if (mom.attendees.length > 0) {
    lines.push("\n**Attendees:**");
    const clientAttendees = mom.attendees.filter((a) => a.team === "client");
    const odAttendees = mom.attendees.filter((a) => a.team === "okie_dokie");

    if (clientAttendees.length > 0) {
      lines.push("Client:");
      clientAttendees.forEach((a) => {
        lines.push(`  • ${a.name} (${a.designation})`);
      });
    }

    if (odAttendees.length > 0) {
      lines.push("Okie Dokie:");
      odAttendees.forEach((a) => {
        lines.push(`  • ${a.name} (${a.designation})`);
      });
    }
  }

  if (mom.discussion_points.length > 0) {
    lines.push("\n**Discussion Points:**");
    mom.discussion_points.forEach((d) => {
      lines.push(`  • [${d.module}] ${d.details}`);
    });
  }

  if (mom.work_completed.length > 0) {
    lines.push("\n**Work Completed:**");
    mom.work_completed.forEach((w) => {
      lines.push(`  • [${w.module}] ${w.task}`);
    });
  }

  if ((mom.pending_points ?? []).length > 0) {
    const ours = mom.pending_points.filter((p) => p.pending_with === "okie_dokie");
    const theirs = mom.pending_points.filter((p) => p.pending_with === "client");

    if (ours.length > 0) {
      lines.push("\n**Pending (Okie Dokie):**");
      ours.forEach((p) => {
        lines.push(`  • [${p.module}] ${p.requirement}`);
      });
    }

    if (theirs.length > 0) {
      lines.push("\n**Pending (Client):**");
      theirs.forEach((p) => {
        lines.push(`  • [${p.module}] ${p.requirement}`);
      });
    }
  }

  if (mom.summary) {
    lines.push(`\n**Summary:**\n${mom.summary}`);
  }

  return lines.join("\n");
}
