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

// Format an ISO/Date-ish string into "12 Jan 2026"
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export async function downloadMomPdf(mom: MOM) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentW = pageWidth - margin * 2;

  // ── Palette ────────────────────────────────────────────────────────────
  const NAVY: [number, number, number] = [17, 28, 51];
  const NAVY_SOFT: [number, number, number] = [30, 45, 74];
  const ORANGE: [number, number, number] = [234, 112, 24];
  const ORANGE_LIGHT: [number, number, number] = [253, 233, 217];
  const WHITE: [number, number, number] = [255, 255, 255];
  const SLATE: [number, number, number] = [110, 122, 142];
  const SLATE_LIGHT: [number, number, number] = [148, 159, 176];
  const INK: [number, number, number] = [28, 31, 38];
  const LINE: [number, number, number] = [228, 231, 237];
  const ROW_TINT: [number, number, number] = [247, 248, 251];
  const GREEN_BG: [number, number, number] = [223, 242, 230];
  const GREEN_TX: [number, number, number] = [22, 121, 73];
  const BLUE_BG: [number, number, number] = [222, 233, 250];
  const BLUE_TX: [number, number, number] = [27, 86, 168];

  const logo = await loadLogo();
  const docId = `MOM-${(mom.id || "").slice(0, 8).toUpperCase() || "DRAFT"}`;

  // ── HEADER (drawn on every page) ─────────────────────────────────────
  const headerH = 96;

  const drawHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, headerH, "F");

    doc.setFillColor(...NAVY_SOFT);
    doc.rect(0, headerH - 8, pageWidth, 8, "F");

    doc.setFillColor(...ORANGE);
    doc.rect(pageWidth - 130, 0, 130, 4, "F");

    const logoSize = 40;
    const logoX = margin;
    const logoY = (headerH - logoSize) / 2 - 2;
    if (logo) {
      // The source PNG has a transparent (not white) background outside its
      // colored strokes, so on the navy header those "white" areas show navy
      // through them. Paint a white backing disc sized to the badge's visible
      // ring (~39% of the image box) before placing the logo to restore it.
      const cx = logoX + logoSize / 2;
      const cy = logoY + logoSize / 2;
      doc.setFillColor(...WHITE);
      doc.circle(cx, cy, logoSize * 0.41, "F");
      doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    }

    const textX = logo ? logoX + logoSize + 14 : margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...WHITE);
    doc.text("OKIE DOKIE SOLUTIONS", textX, headerH / 2 - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_LIGHT);
    doc.text("www.okiedokiepay.com   ·   services@okiedokiepay.com", textX, headerH / 2 + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ORANGE);
    doc.text("MINUTES OF MEETING", pageWidth - margin, headerH / 2 - 6, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...SLATE_LIGHT);
    doc.text(docId, pageWidth - margin, headerH / 2 + 10, { align: "right" });
  };

  drawHeader();

  // ── Title strip ───────────────────────────────────────────────────────
  let y = headerH + 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(`Meeting with ${mom.client_name}`, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(formatDate(mom.meeting_date), pageWidth - margin, y, { align: "right" });

  y += 8;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 46, y);
  y += 26;

  // ── Section helper ────────────────────────────────────────────────────
  let sectionNo = 0;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      drawHeader();
      y = headerH + 34;
    }
  };

  const section = (title: string) => {
    sectionNo += 1;
    ensureSpace(34);

    const chipSize = 18;
    doc.setFillColor(...NAVY);
    doc.roundedRect(margin, y - 13, chipSize, chipSize, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text(String(sectionNo).padStart(2, "0"), margin + chipSize / 2, y - 13 + chipSize / 2 + 3, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), margin + chipSize + 10, y);

    y += 8;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
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
      fillColor: NAVY as [number, number, number],
      textColor: WHITE as [number, number, number],
      fontStyle: "bold" as const,
      fontSize: 8.5,
      cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
    },
    alternateRowStyles: { fillColor: ROW_TINT as [number, number, number] },
    margin: { left: margin, right: margin },
  };

  const teamBadge = (team: "okie_dokie" | "client") => (team === "okie_dokie" ? "Okie Dokie Team" : "Client");

  // ── Meeting Information ───────────────────────────────────────────────
  section("Meeting Information");

  const infoBoxH = 78;
  ensureSpace(infoBoxH + 10);
  doc.setFillColor(...ROW_TINT);
  doc.roundedRect(margin, y - 4, contentW, infoBoxH, 4, 4, "F");

  const colGap = 20;
  const colW = (contentW - colGap) / 2;
  const c1 = margin + 18;
  const c2 = margin + colW + colGap + 18;
  let ry = y + 18;

  const infoRows: [string, string, string, string][] = [
    ["CLIENT / INSTITUTE", mom.client_name, "EMPLOYEE", mom.employee_name],
    ["MEETING DATE", formatDate(mom.meeting_date), "LOCATION", mom.location || "—"],
    [
      "MEETING TYPE",
      mom.meeting_type === "online" ? "Online" : "Offline",
      "ATTENDEES",
      String(mom.attendees.length || 0),
    ],
  ];

  for (const [l1, v1, l2, v2] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(l1, c1, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(v1, c1, ry + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(l2, c2, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(v2, c2, ry + 13);

    ry += 21;
  }
  y += infoBoxH + 20;

  // ── Attendees ──────────────────────────────────────────────────────────
  if (mom.attendees.length) {
    section("Attendees");
    autoTable(doc, {
      startY: y,
      head: [["Name", "Designation", "Mobile", "Team"]],
      body: mom.attendees.map((a) => [a.name, a.designation, a.mobile || "—", teamBadge(a.team)]),
      columnStyles: { 3: { halign: "center" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const isOdc = String(data.cell.raw) === "Okie Dokie Team";
          data.cell.styles.fillColor = isOdc ? BLUE_BG : ORANGE_LIGHT;
          data.cell.styles.textColor = isOdc ? BLUE_TX : [180, 83, 9];
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
        }
      },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── Discussion Points ───────────────────────────────────────────────────
  if (mom.discussion_points.length) {
    section("Discussion Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Details"]],
      body: mom.discussion_points.map((d) => [d.module, d.details]),
      columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" } },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── Work Completed ──────────────────────────────────────────────────────
  if (mom.work_completed.length) {
    section("Work Completed");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Task Completed"]],
      body: mom.work_completed.map((w) => [w.module, w.task]),
      columnStyles: { 0: { cellWidth: 110, fontStyle: "bold" } },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── Pending Points ──────────────────────────────────────────────────────
  if (mom.pending_points.length) {
    section("Pending Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Requirement", "Pending With"]],
      body: mom.pending_points.map((p) => [p.module, p.requirement, teamBadge(p.pending_with)]),
      columnStyles: {
        0: { cellWidth: 100, fontStyle: "bold" },
        2: { cellWidth: 110, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const isOdc = String(data.cell.raw) === "Okie Dokie Team";
          data.cell.styles.fillColor = isOdc ? BLUE_BG : GREEN_BG;
          data.cell.styles.textColor = isOdc ? BLUE_TX : GREEN_TX;
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
        }
      },
      ...tableTheme,
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 24;
  }

  // ── Conclusion ───────────────────────────────────────────────────────────
  if (mom.summary) {
    section("Conclusion");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(mom.summary, contentW - 8);
    ensureSpace(lines.length * 14 + 10);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 10;
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
  doc.text(mom.employee_name, margin, sigY + 60);
  doc.text("Client Representative", margin + sigW + 30, sigY + 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text("Prepared by — Okie Dokie Solutions", margin, sigY + 72);
  doc.text(mom.client_name, margin + sigW + 30, sigY + 72);

  // ── Footer (every page) ──────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 28;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(docId, margin, footerY);
    doc.text("www.okiedokiepay.com  ·  services@okiedokiepay.com", pageWidth / 2, footerY, {
      align: "center",
    });
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`MOM_${safe}_${mom.meeting_date}.pdf`);
}
