import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMom } from "./mom.functions";
import { formatDay } from "./format";

const LOCKED_CC = "odteam@okiedokiepay.com";
const RESEND_API = "https://api.resend.com/emails";

export const sendHandoverEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.array(z.string().email()).min(1, "At least one recipient is required"),
        pdfData: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("Email not configured — add RESEND_API_KEY to your .env");

    const from = process.env.RESEND_FROM_EMAIL ?? "MOM Portal <noreply@okiedokiepay.com>";

    const mom = await getMom({ data: { id: data.id } });
    if (!mom) throw new Error("MOM not found");

    const handoverDocs = (mom.photos ?? []).filter((p) => p.kind === "handover_doc");

    const docsHtml =
      handoverDocs.length > 0
        ? `<ul style="padding-left:20px">${handoverDocs
            .map(
              (d) =>
                `<li style="margin:6px 0"><a href="${d.url}" style="color:#7C1D13">${d.caption ?? "Document"}</a></li>`,
            )
            .join("")}</ul>`
        : `<p style="color:#888;font-size:13px">No documents attached.</p>`;

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:auto;background:#fff">
        <div style="background:#7C1D13;color:#fff;padding:28px 32px;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:20px;font-weight:700">Handover — ${mom.client_name}</h1>
          <p style="margin:6px 0 0;opacity:.75;font-size:13px">${formatDay(mom.meeting_date)} &nbsp;·&nbsp; Recorded by ${mom.employee_name}</p>
        </div>
        <div style="border:1px solid #eee;border-top:none;padding:28px 32px;border-radius:0 0 8px 8px">
          <p style="margin-top:0">Please find the handover documents for <strong>${mom.client_name}</strong> attached below.</p>

          <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#7C1D13;margin-bottom:8px">Handover Documents</h2>
          ${docsHtml}

          <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
          <p style="font-size:12px;color:#aaa;margin:0">
            Sent via Okie Dokie MOM Portal &nbsp;·&nbsp; <a href="https://www.okiedokiepay.com" style="color:#aaa">okiedokiepay.com</a>
          </p>
        </div>
      </div>
    `;

    const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
    const body: Record<string, unknown> = {
      from,
      to: data.to,
      cc: [LOCKED_CC],
      subject: `Handover — ${mom.client_name} — ${formatDay(mom.meeting_date)}`,
      html,
    };

    if (data.pdfData) {
      body.attachments = [
        {
          filename: `MOM_${safe}_${mom.meeting_date.slice(0, 10)}.pdf`,
          content: data.pdfData,
          content_type: "application/pdf",
        },
      ];
    }

    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to send email [${res.status}]: ${text}`);
    }

    return { ok: true };
  });
