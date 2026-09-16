import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMom } from "./mom.functions";

const LOGO_B64 =
  "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";

function row(label: string, value: string, shade: boolean): string {
  const bg = shade ? "#EEF2FB" : "#ffffff";
  return `<tr style="background:${bg}">
    <td style="padding:10px 24px;text-align:right;width:38%;font-size:13px;color:#555;font-weight:600;border-bottom:1px solid #dde5f5">${label}</td>
    <td style="padding:10px 24px;font-size:13px;color:#111;border-bottom:1px solid #dde5f5">${value}</td>
  </tr>`;
}

function fmtHandoverDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate().toString().padStart(2, "0");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${day}-${mon}-${d.getFullYear()}`;
}

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

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const handoverDocs = (mom.photos ?? []).filter((p) => p.kind === "handover_doc");
    const modules = [...new Set(handoverDocs.map((d) => d.module).filter(Boolean))] as string[];
    const moduleStr = modules.length > 0 ? modules.join(" & ") : "ERP";
    const subject = `"${moduleStr}" Handover & Minutes of Meeting Document - Okie Dokie`;

    const clientAttendees = (mom.attendees ?? []).filter((a) => a.team === "client");
    const handoverTo = clientAttendees.map((a) => a.name).join(", ");

    const docNames = handoverDocs.map((d) => d.caption ?? "Document").join(", ");
    const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");

    let rowIdx = 0;
    const rows = [
      row("Client", mom.client_name, rowIdx++ % 2 === 0),
      row("Module:", moduleStr, rowIdx++ % 2 === 0),
      row("Date of Handover:", fmtHandoverDate(mom.meeting_date), rowIdx++ % 2 === 0),
      row("Mode of Handover:", mom.meeting_type === "offline" ? "Offline" : "Online", rowIdx++ % 2 === 0),
      ...(handoverTo ? [row("Handover To:", handoverTo, rowIdx++ % 2 === 0)] : []),
      ...(docNames ? [row("Document Attached:", docNames, rowIdx++ % 2 === 0)] : []),
      row("ERP Representative:", mom.employee_name, rowIdx++ % 2 === 0),
    ].join("\n");

    const htmlbody = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:4px;overflow:hidden">

  <!-- Logo -->
  <div style="background:#fff;padding:24px 0 16px;text-align:center;border-bottom:1px solid #f0f0f0">
    <img src="data:image/png;base64,${LOGO_B64}" alt="Okie Dokie" style="height:70px;width:auto" />
  </div>

  <!-- Dear banner -->
  <div style="background:#E88B1F;padding:14px 32px;text-align:center">
    <p style="margin:0;color:#fff;font-size:16px;font-weight:600">Dear ${mom.client_name} Team</p>
  </div>

  <!-- Intro -->
  <div style="background:#E88B1F;padding:4px 32px 18px;border-top:1px solid rgba(255,255,255,.2)">
    <p style="margin:0;color:#fff;font-size:14px;line-height:1.7;text-align:justify">
      We are pleased to confirm the successful handover of the <strong>${moduleStr}</strong> module to <strong>${mom.client_name}</strong>.<br/>
      Below are the handover details:
    </p>
  </div>

  <!-- Details table -->
  <table style="width:100%;border-collapse:collapse">
    ${rows}
  </table>

  <!-- Closing -->
  <div style="padding:20px 32px 24px;font-size:13px;color:#444;line-height:1.7;border-top:1px solid #eee">
    <p style="margin:0">We are committed to providing you with continued support to ensure the successful implementation and smooth functioning of ERP system.</p>
  </div>

  <!-- Footer -->
  <div style="background:#f8f8f8;padding:12px 24px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee">
    Sent via Okie Dokie MOM Portal &nbsp;·&nbsp;
    <a href="https://www.okiedokiepay.com" style="color:#999;text-decoration:none">okiedokiepay.com</a>
  </div>

</div>`;

    const body: Record<string, unknown> = {
      from: { address: fromAddress, name: "Okie Dokie" },
      to: data.to.map((address) => ({ email_address: { address } })),
      ...(data.cc?.length ? { cc: data.cc.map((address) => ({ email_address: { address } })) } : {}),
      subject,
      htmlbody,
    };

    if (data.pdfData) {
      body.attachments = [
        {
          name: `MOM_${safe}_${mom.meeting_date.slice(0, 10)}.pdf`,
          content: data.pdfData,
          mime_type: "application/pdf",
        },
      ];
    }

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
