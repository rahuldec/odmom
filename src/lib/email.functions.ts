import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMom } from "./mom.functions";

const ACCENT = "#B5501C";

const STYLE = `
  * { margin:0; padding:0; box-sizing:border-box;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif; }
  body { background:#F5F4F1; padding:40px 16px; color:#1D1D1F; }
  .wrap { max-width:600px; width:100%; margin:0 auto; background:#FFFFFF;
    border:1px solid #E5E3DE; border-radius:12px; padding:36px 32px; }
  .eyebrow { font-size:11px; font-weight:600; letter-spacing:.12em; text-transform:uppercase;
    color:${ACCENT}; margin:0 0 8px; }
  h1 { font-size:22px; font-weight:600; letter-spacing:-.01em; color:#1D1D1F; margin:0 0 4px; }
  .subtitle { font-size:13px; color:#6E6E73; margin:0 0 28px; }
  .divider { border:none; border-top:1px solid #E5E3DE; margin:24px 0; }
  p { font-size:14px; color:#374151; line-height:1.7; margin:0 0 16px; }
  p:last-child { margin-bottom:0; }
  .detail-table { width:100%; border-collapse:collapse; margin:16px 0 20px; font-size:14px; }
  .detail-table td { padding:9px 0; border-bottom:1px solid #EFEDE8; vertical-align:top; }
  .detail-table tr:last-child td { border-bottom:none; }
  .detail-table .label { color:#6E6E73; font-weight:600; width:42%; }
  .detail-table .value { color:#1D1D1F; }
  .sign-off { margin-top:28px; padding-top:24px; border-top:1px solid #E5E3DE; }
  .sign-off p { font-size:13px; color:#6E6E73; margin:0; line-height:1.8; }
  .sign-off strong { color:#1D1D1F; }
  .footer { margin-top:28px; font-size:11px; color:#9ca3af; text-align:center; }
  .footer a { color:${ACCENT}; text-decoration:none; }
  @media (max-width:480px) { .wrap { padding:28px 20px; } h1 { font-size:19px; } }
`;

const mimeOf = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    zip: "application/zip", txt: "text/plain", csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
};

function longDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export const sendHandoverEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      to: z.array(z.string().email()).min(1, "At least one recipient is required"),
      cc: z.array(z.string().email()).optional(),
      pdfData: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const token = process.env.ZEPTOMAIL_TOKEN;
    if (!token) throw new Error("Email not configured — add ZEPTOMAIL_TOKEN to your .env");

    const zeptoUrl = process.env.ZEPTOMAIL_URL ?? "https://api.zeptomail.in/v1.1/email";
    const fromAddress = process.env.ZEPTOMAIL_SENDER ?? "noreply@okiedokiepay.com";

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const handoverDocs = (mom.photos ?? []).filter((p) => p.kind === "handover_doc");
    const hasHandover = handoverDocs.length > 0;

    const modules = [...new Set(handoverDocs.map((d) => d.module).filter(Boolean))] as string[];
    const moduleStr = modules.length > 0 ? modules.join(" & ") : "ERP";

    const odAttendees = (mom.attendees ?? [])
      .filter((a) => a.team === "okie_dokie")
      .map((a) => a.name);
    const erpReps = odAttendees.length > 0 ? odAttendees.join(" & ") : mom.employee_name;

    const meetingDate = longDate(mom.meeting_date);

    // ── Subject ────────────────────────────────────────────────────────────────
    const subject = hasHandover
      ? `${moduleStr} Handover & Minutes of Meeting – ${mom.client_name}`
      : `Minutes of Meeting – ${mom.client_name} | ${meetingDate}`;

    // ── Sign-off block (shared) ────────────────────────────────────────────────
    const signOff = `
<div class="sign-off">
  <p>Warm Regards,<br/>
  <strong>Team Okie Dokie</strong><br/>
  Okie Dokie Campus Automation</p>
</div>`;

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footer = `
<div class="footer">
  <a href="https://www.okiedokiepay.com">okiedokiepay.com</a>
</div>`;

    // ── Scenario 1: MOM only ───────────────────────────────────────────────────
    const momOnlyBody = `
<!doctype html><html><head><meta charset="utf-8"/><style>${STYLE}</style></head>
<body><div class="wrap">
  <p class="eyebrow">Okie Dokie Campus Automation</p>
  <h1>Minutes of Meeting</h1>
  <p class="subtitle">${mom.client_name} &nbsp;&middot;&nbsp; ${meetingDate}</p>

  <p>Dear <strong>${mom.client_name}</strong> Team,</p>
  <p>Greetings from Okie Dokie.</p>
  <p>Please find attached the Minutes of Meeting (MOM) for the meeting held on <strong>${meetingDate}</strong>.</p>
  <p>The MOM captures the key points discussed and any action items identified during the meeting.</p>
  <p>Please feel free to reach out to us for any clarification or assistance.</p>
  ${signOff}
  ${footer}
</div></body></html>`;

    // ── Scenario 2: MOM + Handover ─────────────────────────────────────────────
    const combinedBody = `
<!doctype html><html><head><meta charset="utf-8"/><style>${STYLE}</style></head>
<body><div class="wrap">
  <p class="eyebrow">Okie Dokie Campus Automation</p>
  <h1>${moduleStr} Handover &amp; Minutes of Meeting</h1>
  <p class="subtitle">${mom.client_name} &nbsp;&middot;&nbsp; ${meetingDate}</p>

  <p>Dear <strong>${mom.client_name}</strong> Team,</p>
  <p>Greetings from Okie Dokie.</p>
  <p>Please find attached the Minutes of Meeting (MOM) and ${moduleStr} Module Handover Document for the meeting held on <strong>${meetingDate}</strong>.</p>
  <p>We are pleased to confirm the successful handover of the <strong>${moduleStr} Module</strong> to <strong>${mom.client_name}</strong>.</p>

  <p style="font-size:13px;font-weight:600;color:#6E6E73;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Handover Details</p>
  <table class="detail-table">
    <tr><td class="label">Module</td><td class="value">${moduleStr}</td></tr>
    <tr><td class="label">Date of Handover</td><td class="value">${meetingDate}</td></tr>
    <tr><td class="label">ERP Representatives</td><td class="value">${erpReps}</td></tr>
  </table>

  <p>The MOM captures the key points discussed, along with the relevant handover details and action points, if any.</p>
  <p>Our team will continue to provide the required support to ensure a smooth implementation and effective utilization of the ERP system.</p>
  <p>Please feel free to reach out to us for any clarification or assistance.</p>
  ${signOff}
  ${footer}
</div></body></html>`;

    const htmlbody = hasHandover ? combinedBody : momOnlyBody;

    // ── Attachments ────────────────────────────────────────────────────────────
    const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
    const attachments: Array<{ name: string; content: string; mime_type: string }> = [];

    if (data.pdfData) {
      attachments.push({
        name: `MOM_${safe}_${mom.meeting_date.slice(0, 10)}.pdf`,
        content: data.pdfData,
        mime_type: "application/pdf",
      });
    }

    for (const doc of handoverDocs) {
      try {
        const res = await fetch(doc.url);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        attachments.push({
          name: doc.caption ?? "document",
          content: Buffer.from(buf).toString("base64"),
          mime_type: mimeOf(doc.caption ?? ""),
        });
      } catch { /* skip */ }
    }

    const body: Record<string, unknown> = {
      from: { address: fromAddress, name: "Okie Dokie" },
      to: data.to.map((address) => ({ email_address: { address } })),
      ...(data.cc?.length ? { cc: data.cc.map((address) => ({ email_address: { address } })) } : {}),
      subject,
      htmlbody,
      ...(attachments.length ? { attachments } : {}),
    };

    const res = await fetch(zeptoUrl, {
      method: "POST",
      headers: {
        Authorization: token.startsWith("Zoho-enczapikey") ? token : `Zoho-enczapikey ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send email [${res.status}]: ${text}`);
    }

    return { ok: true };
  });
