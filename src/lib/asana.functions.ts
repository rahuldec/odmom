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

export const uploadMomToAsana = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<{ task_id: string; task_url: string }> => {
    if (!ASANA_OAUTH_TOKEN) throw new Error("Asana OAuth token not configured");
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const mom = await getMom({ data: { id: data.id } });

    if (!mom) throw new Error("MOM not found");

    // Format the task title
    const taskTitle = `${mom.client_name} - ${new Date(mom.meeting_date).toLocaleDateString()}`;

    // Format the description with MOM details
    const description = formatAsanaTaskDescription(mom);

    const endpoint = `${ASANA_API_BASE}/tasks`;
    console.log("Creating Asana task at:", endpoint);
    console.log("Task title:", taskTitle);

    // Create the Asana task
    const taskResponse = await fetch(endpoint, {
      method: "POST",
      headers: getAsanaHeaders(),
      body: JSON.stringify({
        data: {
          name: taskTitle,
          notes: description,
          projects: [ASANA_PROJECT_ID],
        },
      }),
    });

    const responseText = await taskResponse.text();
    console.log("Asana API response status:", taskResponse.status);
    console.log("Asana API response:", responseText);

    if (!taskResponse.ok) {
      throw new Error(`Failed to create Asana task (${taskResponse.status}): ${responseText}`);
    }

    const taskData = JSON.parse(responseText) as { data: { gid: string } };
    const taskId = taskData.data.gid;

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
