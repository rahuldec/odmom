import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MOM } from "./mom-types";
import logoUrl from "../logo.png";

type LoadedLogo = { dataUrl: string; width: number; height: number };

function loadLogo(): Promise<LoadedLogo | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL("image/png"),
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    } catch {
      resolve(null);
    }
  });
}

type LoadedImage = { dataUrl: string; width: number; height: number };

// Fetch a (possibly remote/signed-URL) image and convert it to a base64
// data URL jsPDF can embed, along with its natural pixel dimensions.
function loadImage(url: string): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return resolve(null);
        const blob = await res.blob();

        // Phone photos carry EXIF orientation. jsPDF ignores it, so bake the
        // rotation into the pixels by decoding with `from-image` orientation
        // and re-encoding through a canvas.
        if (typeof createImageBitmap === "function") {
          try {
            const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
              bitmap.close?.();
              return resolve({
                dataUrl: canvas.toDataURL("image/jpeg", 0.92),
                width: canvas.width,
                height: canvas.height,
              });
            }
            bitmap.close?.();
          } catch {
            /* fall through to the plain decode below */
          }
        }

        const dataUrl = await new Promise<string>((res2, rej2) => {
          const reader = new FileReader();
          reader.onload = () => res2(reader.result as string);
          reader.onerror = () => rej2(new Error("read failed"));
          reader.readAsDataURL(blob);
        });
        const dims = await new Promise<{ width: number; height: number }>((res3, rej3) => {
          const img = new Image();
          img.onload = () => res3({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => rej3(new Error("decode failed"));
          img.src = dataUrl;
        });
        resolve({ dataUrl, ...dims });
      } catch {
        resolve(null);
      }
    })();
  });
}


// Scale (imgW, imgH) down to fit inside (boxW, boxH) while preserving aspect ratio.
function fitInBox(imgW: number, imgH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}

function imageFormat(dataUrl: string): "PNG" | "WEBP" | "JPEG" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

// Format an ISO/Date-ish string into "12 Jan 2026"
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Core PDF generation — used by both download and Asana upload
async function generateMomPdf(mom: MOM) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentW = pageWidth - margin * 2;

  // ── Palette ────────────────────────────────────────────────────────────
  // A formal monochrome layout follows the uploaded meeting-record example.
  const WHITE: [number, number, number] = [255, 255, 255];
  const SLATE: [number, number, number] = [95, 95, 95];
  const INK: [number, number, number] = [25, 25, 25];
  const LINE: [number, number, number] = [185, 185, 185];
  const ROW_TINT: [number, number, number] = [247, 247, 247];

  const logo = await loadLogo();
  const regularPhotos = mom.photos.filter((p) => p.kind !== "handover_doc");
  const handoverDocs = mom.photos.filter((p) => p.kind === "handover_doc");
  const loadedPhotos = await Promise.all(regularPhotos.map((p) => loadImage(p.url)));

  // ── HEADER (repeated on every page) ───────────────────────────────────
  const headerH = 62;

  const drawHeader = () => {
    if (logo) {
      const logoSize = 34;
      doc.addImage(logo.dataUrl, "PNG", margin, 10, logoSize, logoSize);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text("OKIE DOKIE  |  YOUR CAMPUS AUTOMATION PARTNER", pageWidth / 2, 24, {
      align: "center",
    });

    doc.setDrawColor(...INK);
    doc.setLineWidth(0.8);
    doc.line(margin, 52, pageWidth - margin, 52);
  };

  // ── Title and meeting information ─────────────────────────────────────
  let y = headerH + 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.text("MINUTES OF MEETING", pageWidth / 2, y, { align: "center" });
  y += 19;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text("Client Visit & Action Plan", pageWidth / 2, y, { align: "center" });
  y += 22;

  const dateLabel = formatDate(mom.meeting_date);
  const meetingType = mom.meeting_type === "online" ? "Online Meeting" : "Physical Visit";
  autoTable(doc, {
    startY: y,
    body: [
      [
        { content: "School", styles: { fontStyle: "bold" } },
        mom.client_name,
        { content: "Date", styles: { fontStyle: "bold" } },
        dateLabel,
      ],
      [
        { content: "Meeting Type", styles: { fontStyle: "bold" } },
        meetingType,
        { content: "Prepared by", styles: { fontStyle: "bold" } },
        mom.employee_name,
      ],
    ],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: { top: 5, bottom: 5, left: 0, right: 4 },
      textColor: INK,
      overflow: "linebreak",
      valign: "top",
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 190 },
      2: { cellWidth: 58 },
      3: { cellWidth: 205 },
    },
    margin: { left: margin, right: margin, top: headerH + 20, bottom: 48 },
  });
  // @ts-expect-error autotable
  y = doc.lastAutoTable.finalY + 7;

  if (mom.location?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text("Venue:", margin, y);
    doc.setFont("helvetica", "normal");
    const venueLines: string[] = doc.splitTextToSize(mom.location.trim(), contentW - 42);
    doc.text(venueLines, margin + 42, y);
    y += Math.max(13, venueLines.length * 12) + 8;
  } else {
    y += 5;
  }

  // ── Section helper ────────────────────────────────────────────────────
  let sectionNo = 0;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      y = headerH + 28;
    }
  };

  const section = (title: string) => {
    sectionNo += 1;
    ensureSpace(34);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(`${sectionNo}. ${title.toUpperCase()}`, margin, y);

    y += 7;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.65);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.setTextColor(...INK);
  };

  const tableTheme = {
    styles: {
      fontSize: 9,
      cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      textColor: INK as [number, number, number],
      lineColor: LINE as [number, number, number],
      lineWidth: 0.5,
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: [35, 35, 35] as [number, number, number],
      textColor: WHITE as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 8.5,
      cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
    },
    alternateRowStyles: { fillColor: ROW_TINT as [number, number, number] },
    margin: { top: headerH + 20, bottom: 50, left: margin, right: margin },
  };

  // ── Attendees ───────────────────────────────────────────────────────────
  if (mom.attendees.length) {
    section("Attendees");
    const attendeesFor = (team: "client" | "okie_dokie") =>
      mom.attendees
        .filter((attendee) => attendee.team === team)
        .map((attendee) =>
          attendee.designation
            ? `${attendee.name} — ${attendee.designation}`
            : attendee.name,
        )
        .join("\n") || "—";

    autoTable(doc, {
      startY: y,
      head: [["School Representatives", "Okie Dokie Representatives"]],
      body: [[attendeesFor("client"), attendeesFor("okie_dokie")]],
      columnStyles: {
        0: { cellWidth: contentW / 2 },
        1: { cellWidth: contentW / 2 },
      },
      styles: {
        ...tableTheme.styles,
        fontSize: 9,
        cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
        valign: "top",
      },
      headStyles: {
        ...tableTheme.headStyles,
        fontSize: 8.5,
        cellPadding: { top: 7, bottom: 7, left: 8, right: 8 },
      },
      margin: tableTheme.margin,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 22;
  }

  // ── Discussion Points & Action Plan ────────────────────────────────────
  const actionRows = [
    ...mom.discussion_points.map((point) => [
      point.module,
      `Discussion — ${point.details}`,
      "—",
      "—",
    ]),
    ...mom.work_completed.map((work) => [
      work.module,
      `Completed — ${work.task}`,
      mom.employee_name || "Okie Dokie Team",
      "—",
    ]),
    ...mom.pending_points.map((point) => [
      point.module,
      `Pending — ${point.requirement}`,
      point.pending_with === "okie_dokie"
        ? "Okie Dokie Team"
        : point.pending_with === "cs"
          ? "CS Team"
          : "Client",
      point.due_date ? formatDate(point.due_date) : "—",
    ]),
  ];

  if (actionRows.length) {
    section("Discussion Points & Action Plan");
    autoTable(doc, {
      startY: y,
      head: [["Module / Activity", "Action Item", "Responsibility", "Target Date"]],
      body: actionRows,
      columnStyles: {
        0: { cellWidth: 92, fontStyle: "bold" },
        2: { cellWidth: 92 },
        3: { cellWidth: 68 },
      },
      ...tableTheme,
      styles: { ...tableTheme.styles, fontSize: 8.5 },
      headStyles: { ...tableTheme.headStyles, fontSize: 8 },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 22;
  }

  // ── Handover Documents ───────────────────────────────────────────────────
  if (handoverDocs.length) {
    section("Handover Documents");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Document"]],
      body: handoverDocs.map((d) => [d.module ?? "—", d.caption ?? "Document"]),
      columnStyles: { 0: { cellWidth: 50 }, 1: { fontStyle: "bold" } },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── Photos ───────────────────────────────────────────────────────────────
  if (regularPhotos.length) {
    section("Photos");

    const cols = 2;
    const gap = 14;
    const boxW = (contentW - gap * (cols - 1)) / cols;
    const boxH = 170;
    const pad = 8;
    const captionGap = 12;
    const rowGap = 16;

    for (let i = 0; i < regularPhotos.length; i += cols) {
      ensureSpace(boxH + captionGap + rowGap);
      const rowY = y;

      for (let c = 0; c < cols; c++) {
        const idx = i + c;
        if (idx >= regularPhotos.length) break;
        const photo = regularPhotos[idx];
        const loaded = loadedPhotos[idx];
        const cx = margin + c * (boxW + gap);

        doc.setFillColor(...ROW_TINT);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.75);
        doc.roundedRect(cx, rowY, boxW, boxH, 4, 4, "FD");

        if (loaded) {
          const { w, h } = fitInBox(loaded.width, loaded.height, boxW - pad * 2, boxH - pad * 2);
          const ix = cx + (boxW - w) / 2;
          const iy = rowY + (boxH - h) / 2;
          doc.addImage(loaded.dataUrl, imageFormat(loaded.dataUrl), ix, iy, w, h);
        } else {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(...SLATE);
          doc.text("Image unavailable", cx + boxW / 2, rowY + boxH / 2, { align: "center" });
        }

        if (photo.caption?.trim()) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...SLATE);
          const capLines = doc.splitTextToSize(photo.caption.trim(), boxW);
          doc.text(capLines[0], cx + boxW / 2, rowY + boxH + captionGap, { align: "center" });
        }
      }

      y = rowY + boxH + captionGap + rowGap;
    }
  }

  // ── Signature block ──────────────────────────────────────────────────────
  ensureSpace(90);
  y += 14;
  const sigW = (contentW - 30) / 2;
  const sigY = y;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.75);
  doc.line(margin, sigY + 46, margin + sigW, sigY + 46);
  doc.line(margin + sigW + 30, sigY + 46, margin + sigW + 30 + sigW, sigY + 46);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(mom.employee_name, margin, sigY + 62);
  doc.text(mom.client_name, margin + sigW + 30, sigY + 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("Okie Dokie Representative", margin, sigY + 75);
  doc.text("School Representative", margin + sigW + 30, sigY + 75);

  // ── Footer (every page) ──────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    drawHeader();
    const footerY = pageHeight - 28;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text("www.okiedokiepay.com  |  services@okiedokiepay.com", pageWidth / 2, footerY, {
      align: "center",
    });
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, footerY, { align: "right" });
  }

  return doc;
}

// Download the PDF to user's computer
export async function downloadMomPdf(mom: MOM) {
  const doc = await generateMomPdf(mom);
  const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`MOM_${safe}_${mom.meeting_date}.pdf`);
}

// Get PDF as Uint8Array for server attachment (Asana upload)
// Uses the same generateMomPdf as downloadMomPdf for consistency
export async function getPdfBuffer(mom: MOM): Promise<Uint8Array> {
  const doc = await generateMomPdf(mom);
  const pdfArrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(pdfArrayBuffer);
}
