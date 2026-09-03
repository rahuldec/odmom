import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { MOM } from "./mom-types";
import { getMom } from "./mom.functions";

const ASANA_API_BASE = "https://app.asana.com/api/1.0";
const ASANA_OAUTH_TOKEN = process.env.ASANA_OAUTH_TOKEN;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID;

function getAsanaHeaders() {
  return {
    Authorization: `Bearer ${ASANA_OAUTH_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export const getTodaysTasks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({}).parse(input ?? {}),
  )
  .handler(async (): Promise<{ gid: string; name: string }[]> => {
    if (!ASANA_OAUTH_TOKEN) throw new Error("Asana OAuth token not configured");
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const response = await fetch(
      `${ASANA_API_BASE}/projects/${ASANA_PROJECT_ID}/tasks?opt_fields=gid,name,created_at`,
      {
        headers: {
          Authorization: `Bearer ${ASANA_OAUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) throw new Error("Failed to fetch Asana tasks");

    const data = (await response.json()) as { data: { gid: string; name: string; created_at: string }[] };

    // Filter tasks created today
    return data.data
      .filter((task) => task.created_at.startsWith(todayStr))
      .map((task) => ({ gid: task.gid, name: task.name }));
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
    if (!ASANA_OAUTH_TOKEN) throw new Error("Asana OAuth token not configured");
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const taskId = data.taskId;
    const description = formatAsanaTaskDescription(mom);

    // Update task description with MOM details
    const updateResponse = await fetch(`${ASANA_API_BASE}/tasks/${taskId}`, {
      method: "PUT",
      headers: getAsanaHeaders(),
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
        const buffer = Buffer.from(data.pdfData, "base64");
        const formData = new FormData();
        const safe = data.clientName.replace(/[^a-z0-9]+/gi, "_");

        // Create a Blob-like object for FormData
        const file = new File([buffer], `MOM_${safe}_${data.meetingDate}.pdf`, { type: "application/pdf" });
        formData.append("file", file);

        const attachResponse = await fetch(`${ASANA_API_BASE}/tasks/${taskId}/attachments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ASANA_OAUTH_TOKEN}`,
          },
          body: formData,
        });

        if (!attachResponse.ok) {
          const attachError = await attachResponse.text();
          console.error("Failed to attach PDF to Asana task:", attachResponse.status, attachError);
        }
      } catch (error) {
        console.error("Error attaching PDF:", error);
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
