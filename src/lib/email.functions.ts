import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMom } from "./mom.functions";
import { formatDay } from "./format";

const DIVIDER = `<hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb" />`;

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;font-size:13px;color:#555;font-weight:600;width:40%;vertical-align:top">${label}</td>
    <td style="padding:9px 0;font-size:13px;color:#111;vertical-align:top">${value}</td>
  </tr>`;
}

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
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    zip: "application/zip",
    txt: "text/plain",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
};

export const sendHandoverEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.array(z.string().email()).min(1, "At least one recipient is required"),
        cc: z.array(z.string().email()).optional(),
        pdfData: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const token = process.env.ZEPTOMAIL_TOKEN;
    if (!token) throw new Error("Email not configured — add ZEPTOMAIL_TOKEN to your .env");

    const zeptoUrl = process.env.ZEPTOMAIL_URL ?? "https://api.zeptomail.in/v1.1/email";
    const fromAddress = process.env.ZEPTOMAIL_SENDER ?? "noreply@okiedokiepay.com";
    const fromName = "MOM Portal";

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const handoverDocs = (mom.photos ?? []).filter((p) => p.kind === "handover_doc");
    const hasHandover = handoverDocs.length > 0;

    const modules = [...new Set(handoverDocs.map((d) => d.module).filter(Boolean))] as string[];
    const moduleStr = modules.length > 0 ? modules.join(" & ") : "ERP";

    const odAttendees = (mom.attendees ?? [])
      .filter((a) => a.team === "okie_dokie")
      .map((a) => a.name)
      .join(", ");
    const erpRep = odAttendees || mom.employee_name;

    // ── Subject ────────────────────────────────────────────────────────────────
    const subject = hasHandover
      ? `"${moduleStr}" Handover & Minutes of Meeting Document - Okie Dokie`
      : `Minutes of Meeting — ${mom.client_name} — ${formatDay(mom.meeting_date)}`;

    // ── Shared wrapper helpers ─────────────────────────────────────────────────
    const wrap = (inner: string) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
  <div style="background:#7C1D13;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">MOM Portal</p>
    <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.7)">Okie Dokie Campus Automation</p>
  </div>
  <div style="padding:28px 32px">
    ${inner}
  </div>
  <div style="background:#f9fafb;padding:12px 32px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Sent via Okie Dokie MOM Portal &nbsp;·&nbsp;
    <a href="https://www.okiedokiepay.com" style="color:#9ca3af;text-decoration:none">okiedokiepay.com</a>
  </div>
</div>`;

    // ── MOM intro block ────────────────────────────────────────────────────────
    const momBlock = `
<p style="margin:0 0 16px;font-size:14px;color:#111;line-height:1.6">Dear Team,</p>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7">
  Please find attached Minutes of Meeting (MOM) on <strong>${formatDay(mom.meeting_date)}</strong> for today's client visit.
</p>`;

    // ── Handover block ─────────────────────────────────────────────────────────
    const handoverBlock = hasHandover ? `
${DIVIDER}
<p style="margin:0 0 16px;font-size:14px;color:#111;line-height:1.6">Dear <strong>${mom.client_name}</strong> Team,</p>
<p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7">
  We are pleased to confirm the successful handover of the <strong>${moduleStr}</strong> module to <strong>${mom.client_name}</strong>.
</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  ${detailRow("Module", moduleStr)}
  ${detailRow("Date of Handover", formatDay(mom.meeting_date))}
  ${erpRep ? detailRow("ERP Representative", erpRep) : ""}
</table>
<p style="margin:0;font-size:14px;color:#374151;line-height:1.7">
  We are committed to providing you with continued support to ensure the successful implementation and smooth functioning of ERP system.
</p>` : "";

    const htmlbody = wrap(`${momBlock}${handoverBlock}`);

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
        const b64 = Buffer.from(buf).toString("base64");
        const name = doc.caption ?? "document";
        attachments.push({ name, content: b64, mime_type: mimeOf(name) });
      } catch {
        // skip if a doc can't be fetched
      }
    }

    const body: Record<string, unknown> = {
      from: { address: fromAddress, name: fromName },
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
