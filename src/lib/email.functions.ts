import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getMom } from "./mom.functions";
import { formatDay } from "./format";


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

    const docsHtml =
      handoverDocs.length > 0
        ? `<ul style="padding-left:20px">${handoverDocs
            .map(
              (d) =>
                `<li style="margin:6px 0"><a href="${d.url}" style="color:#7C1D13">${d.caption ?? "Document"}</a></li>`,
            )
            .join("")}</ul>`
        : `<p style="color:#888;font-size:13px">No documents attached.</p>`;

    const htmlbody = `
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
      from: { address: fromAddress, name: fromName },
      to: data.to.map((address) => ({ email_address: { address } })),
      ...(data.cc?.length ? { cc: data.cc.map((address) => ({ email_address: { address } })) } : {}),
      subject: `Handover — ${mom.client_name} — ${formatDay(mom.meeting_date)}`,
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
        Authorization: token,
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
