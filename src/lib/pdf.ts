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
  const margin = 50;
  const contentW = pageWidth - margin * 2;

  // Palette — clean formal document with maroon brand accent
  const MAROON: [number, number, number] = [124, 29, 19];
  const DARK: [number, number, number] = [25, 25, 25];
  const CHARCOAL: [number, number, number] = [55, 55, 55];
  const MID: [number, number, number] = [115, 115, 115];
  const RULE: [number, number, number] = [200, 200, 200];
  const ROW_ALT: [number, number, number] = [247, 247, 247];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GOLD_BG: [number, number, number] = [255, 243, 199];
  const GOLD_TX: [number, number, number] = [124, 86, 0];
  const CS_BG: [number, number, number] = [228, 240, 255];
  const CS_TX: [number, number, number] = [30, 60, 130];
  const CLIENT_BG: [number, number, number] = [235, 235, 235];
  const CLIENT_TX: [number, number, number] = [60, 60, 60];
  const ORANGE_LIGHT: [number, number, number] = [253, 238, 229];

  const logo = await loadLogo();
  const regularPhotos = mom.photos.filter((p) => p.kind !== "handover_doc");
  const handoverDocs = mom.photos.filter((p) => p.kind === "handover_doc");
  const loadedPhotos = await Promise.all(regularPhotos.map((p) => loadImage(p.url)));

  // ── RUNNING HEADER (every page) ───────────────────────────────────────
  const rHeaderH = 54;

  const drawHeader = () => {
    // Logo — vertically centered in header, no overlapping rule
    if (logo) {
      const lSize = 36;
      const lY = (rHeaderH - lSize) / 2;
      doc.setFillColor(...WHITE);
      doc.circle(margin + lSize / 2, lY + lSize / 2, lSize * 0.52, "F");
      doc.addImage(logo.dataUrl, "PNG", margin, lY, lSize, lSize);
    }

    // Company tag — right-aligned, two lines
    doc.setFont("times", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...CHARCOAL);
    doc.text("OKIE DOKIE  |  CAMPUS AUTOMATION PARTNER", pageWidth - margin, 20, { align: "right" });

    doc.setFont("times", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text("www.okiedokiepay.com  ·  services@okiedokiepay.com", pageWidth - margin, 32, { align: "right" });

    // Bottom rule
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, rHeaderH, pageWidth - margin, rHeaderH);
  };

  drawHeader();

  // ── TITLE BLOCK (first page) ──────────────────────────────────────────
  let y = rHeaderH + 24;

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  const titleText = "MINUTES OF MEETING";
  const tw = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setDrawColor(...MAROON);
  doc.setLineWidth(1.5);
  doc.line(pageWidth / 2 - tw / 2, y, pageWidth / 2 + tw / 2, y);
  y += 18;

  // ── MEETING INFO GRID ─────────────────────────────────────────────────
  const infoLabelW = 72;
  const col2X = pageWidth / 2 + 10;

  const infoRows: [string, string, string, string][] = [
    ["School", mom.client_name, "Employee", mom.employee_name],
    ["Date", formatDate(mom.meeting_date), "Meeting Type", mom.meeting_type === "online" ? "Online" : "On site"],
  ];

  infoRows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...CHARCOAL);
    doc.text(l1, margin, y);
    doc.text(l2, col2X, y);

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(v1, margin + infoLabelW, y);
    doc.text(v2, col2X + infoLabelW, y);

    y += 15;
  });

  y += 8;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  // ── PAGE / SECTION HELPERS ────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 60) {
      doc.addPage();
      y = 40;
    }
  };

  let sectionNo = 0;
  const section = (title: string) => {
    sectionNo++;
    ensureSpace(36);

    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);
    doc.text(`${sectionNo}.  ${title.toUpperCase()}`, margin, y);
    y += 5;

    doc.setDrawColor(...CHARCOAL);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
  };

  const tableTheme = {
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 6, bottom: 6, left: 7, right: 7 },
      textColor: DARK as [number, number, number],
      lineColor: RULE as [number, number, number],
      lineWidth: 0.5,
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: CHARCOAL as [number, number, number],
      textColor: WHITE as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 8.5,
      cellPadding: { top: 7, bottom: 7, left: 7, right: 7 },
    },
    alternateRowStyles: { fillColor: ROW_ALT as [number, number, number] },
    margin: { left: margin, right: margin },
  };

  // ── DISCUSSION POINTS ─────────────────────────────────────────────────
  if (mom.discussion_points.length) {
    section("Discussion Points");
    autoTable(doc, {
      startY: y,
      head: [["Module / Activity", "Details"]],
      body: mom.discussion_points.map((d) => [d.module, d.details]),
      columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" } },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 22;
  }

  // ── PENDING POINTS ────────────────────────────────────────────────────
  if (mom.pending_points.length) {
    section("Pending Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Requirement", "Responsibility", "Target Date"]],
      body: mom.pending_points.map((p) => {
        const badge =
          p.pending_with === "okie_dokie" ? "Tech Team"
          : p.pending_with === "cs" ? "CS Team"
          : "Client";
        const dueDate =
          p.pending_with === "okie_dokie"
            ? "TBD — after tech discussion"
            : p.due_date ? formatDate(p.due_date) : "—";
        return [p.module, p.requirement, badge, dueDate];
      }),
      columnStyles: {
        0: { cellWidth: 90, fontStyle: "bold" },
        2: { cellWidth: 90, halign: "center" },
        3: { cellWidth: 100 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const val = String(data.cell.raw);
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
          if (val === "Tech Team") {
            data.cell.styles.fillColor = GOLD_BG;
            data.cell.styles.textColor = GOLD_TX;
          } else if (val === "CS Team") {
            data.cell.styles.fillColor = CS_BG;
            data.cell.styles.textColor = CS_TX;
          } else {
            data.cell.styles.fillColor = CLIENT_BG;
            data.cell.styles.textColor = CLIENT_TX;
          }
        }
        if (data.section === "body" && data.column.index === 3 && String(data.cell.raw).startsWith("TBD")) {
          data.cell.styles.textColor = MID as [number, number, number];
          data.cell.styles.fontStyle = "italic";
          data.cell.styles.fontSize = 7.5;
        }
      },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 22;
  }

  // ── WORK COMPLETED ────────────────────────────────────────────────────
  if (mom.work_completed.length) {
    section("Work Completed");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Task Completed", "Form Signed"]],
      body: mom.work_completed.map((w) => {
        const formLabel =
          w.form_signed === "query_resolution" ? "Query Resolution Form"
          : w.form_signed === "handover" ? "Handover Document Form"
          : "—";
        return [w.module, w.task, formLabel];
      }),
      columnStyles: {
        0: { cellWidth: 110, fontStyle: "bold" },
        2: { cellWidth: 130, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2 && String(data.cell.raw) !== "—") {
          data.cell.styles.fillColor = ORANGE_LIGHT as [number, number, number];
          data.cell.styles.textColor = MAROON as [number, number, number];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
        }
      },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 22;
  }



  // ── PHOTOS ────────────────────────────────────────────────────────────
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

        doc.setFillColor(...ROW_ALT);
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.5);
        doc.rect(cx, rowY, boxW, boxH, "FD");

        if (loaded) {
          const { w, h } = fitInBox(loaded.width, loaded.height, boxW - pad * 2, boxH - pad * 2);
          const ix = cx + (boxW - w) / 2;
          const iy = rowY + (boxH - h) / 2;
          doc.addImage(loaded.dataUrl, imageFormat(loaded.dataUrl), ix, iy, w, h);
        } else {
          doc.setFont("times", "italic");
          doc.setFontSize(8.5);
          doc.setTextColor(...MID);
          doc.text("Image unavailable", cx + boxW / 2, rowY + boxH / 2, { align: "center" });
        }

        if (photo.caption?.trim()) {
          doc.setFont("times", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...MID);
          const capLines = doc.splitTextToSize(photo.caption.trim(), boxW);
          doc.text(capLines[0], cx + boxW / 2, rowY + boxH + captionGap, { align: "center" });
        }
      }

      y = rowY + boxH + captionGap + rowGap;
    }
  }

  // ── ATTENDEES (two-column, school vs Okie Dokie) ──────────────────────
  if (mom.attendees.length) {
    section("Attendees");

    const clientAttendees = mom.attendees.filter((a) => a.team === "client");
    const odAttendees = mom.attendees.filter((a) => a.team === "okie_dokie");

    const clientList =
      clientAttendees.map((a) => `• ${a.name}${a.designation ? `  (${a.designation})` : ""}`).join("\n") || "—";
    const odList =
      odAttendees.map((a) => `• ${a.name}${a.designation ? `  (${a.designation})` : ""}`).join("\n") || "—";

    const colHalf = contentW / 2;
    autoTable(doc, {
      startY: y,
      head: [["School / Client Representatives", "Okie Dokie Representatives"]],
      body: [[clientList, odList]],
      columnStyles: {
        0: { cellWidth: colHalf },
        1: { cellWidth: colHalf },
      },
      styles: {
        ...tableTheme.styles,
        cellPadding: { top: 10, bottom: 10, left: 10, right: 10 },
        fontSize: 8.5,
      },
      headStyles: tableTheme.headStyles,
      margin: tableTheme.margin,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── SIGNATURE BLOCK ───────────────────────────────────────────────────
  ensureSpace(100);
  y += 10;

  const sigW = (contentW - 40) / 2;
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + sigW, y);
  doc.line(margin + sigW + 40, y, margin + sigW + 40 + sigW, y);
  y += 14;

  doc.setFont("times", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  doc.text(mom.employee_name, margin, y);
  doc.text(mom.client_name, margin + sigW + 40, y);
  y += 11;

  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MID);
  doc.text("Okie Dokie Team", margin, y);
  doc.text("Client Representative", margin + sigW + 40, y);

  // ── FOOTER (every page) ───────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 24;
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MID);
    doc.text("Okie Dokie  ·  www.okiedokiepay.com", pageWidth / 2, footerY, { align: "center" });
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
