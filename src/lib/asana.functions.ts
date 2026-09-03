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
      existingTaskId: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<{ task_id: string; task_url: string }> => {
    if (!ASANA_OAUTH_TOKEN) throw new Error("Asana OAuth token not configured");
    if (!ASANA_PROJECT_ID) throw new Error("Asana project ID not configured");

    const mom = await getMom({ data: { id: data.id } });

    if (!mom) throw new Error("MOM not found");

    // Format the task title with DD/MM/YYYY format
    const meetingDate = new Date(mom.meeting_date);
    const day = String(meetingDate.getDate()).padStart(2, '0');
    const month = String(meetingDate.getMonth() + 1).padStart(2, '0');
    const year = meetingDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    const taskTitle = `${mom.client_name} - ${formattedDate}`;

    // Format the description with MOM details
    const description = formatAsanaTaskDescription(mom);

    let taskId: string;

    if (data.existingTaskId) {
      // Use existing task
      taskId = data.existingTaskId;
      console.log("Attaching PDF to existing task:", taskId);
    } else {
      // Create new task
      const endpoint = `${ASANA_API_BASE}/tasks`;
      console.log("Creating Asana task at:", endpoint);
      console.log("Task title:", taskTitle);

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

      if (!taskResponse.ok) {
        throw new Error(`Failed to create Asana task (${taskResponse.status}): ${responseText}`);
      }

      const taskData = JSON.parse(responseText) as { data: { gid: string } };
      taskId = taskData.data.gid;
    }

    // Attach PDF to the task
    try {
      await attachPdfToAsana(taskId, mom, taskTitle);
    } catch (e) {
      console.error("Failed to attach PDF:", e);
      // Continue anyway - task was created/found successfully
    }

    return {
      task_id: taskId,
      task_url: `https://app.asana.com/0/${ASANA_PROJECT_ID}/${taskId}`,
    };
  });

async function attachPdfToAsana(
  taskId: string,
  mom: MOM,
  taskTitle: string,
): Promise<void> {
  // Generate a simple text-based PDF content
  const pdfContent = generateSimplePdf(mom, taskTitle);

  const formData = new FormData();
  const blob = new Blob([pdfContent], { type: "application/pdf" });
  formData.append("file", blob, `MOM_${mom.client_name}.pdf`);

  const uploadResponse = await fetch(
    `${ASANA_API_BASE}/tasks/${taskId}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ASANA_OAUTH_TOKEN}`,
      },
      body: formData,
    },
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Failed to attach PDF to Asana task: ${error}`);
  }
}

function generateSimplePdf(mom: MOM, taskTitle: string): string {
  // Create a simple PDF-like structure with text content
  // This is a basic implementation - for production, use a proper PDF library
  const meetingDate = new Date(mom.meeting_date);
  const day = String(meetingDate.getDate()).padStart(2, '0');
  const month = String(meetingDate.getMonth() + 1).padStart(2, '0');
  const year = meetingDate.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources 4 0 R /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
endobj
5 0 obj
<< /Length 1200 >>
stream
BT
/F1 12 Tf
50 750 Td
(MINUTES OF MEETING) Tj
0 -20 Td
(${taskTitle}) Tj
0 -30 Td
(Date: ${formattedDate}) Tj
0 -15 Td
(Recorded by: ${mom.employee_name}) Tj
0 -15 Td
(Type: ${mom.meeting_type === "online" ? "Online" : "On-site"}) Tj
${mom.location ? `0 -15 Td\n(Location: ${mom.location}) Tj\n` : ""}
0 -30 Td
(ATTENDEES) Tj
${mom.attendees.map((a) => `0 -15 Td\n(${a.name} - ${a.designation} (${a.team})) Tj\n`).join("")}
0 -30 Td
(DISCUSSION POINTS) Tj
${mom.discussion_points.map((d) => `0 -15 Td\n([${d.module}] ${d.details.substring(0, 50)}) Tj\n`).join("")}
0 -30 Td
(WORK COMPLETED) Tj
${mom.work_completed.map((w) => `0 -15 Td\n([${w.module}] ${w.task.substring(0, 50)}) Tj\n`).join("")}
0 -30 Td
(PENDING POINTS) Tj
${(mom.pending_points ?? []).map((p) => `0 -15 Td\n([${p.module}] ${p.requirement.substring(0, 50)} - ${p.pending_with}) Tj\n`).join("")}
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
0000000313 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
1563
%%EOF`;

  return content;
}

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
