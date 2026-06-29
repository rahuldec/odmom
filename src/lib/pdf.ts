import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MOM } from "./mom-types";
import logoUrl from '../logo.png';

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

export async function downloadMomPdf(mom: MOM) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  // Colours
  const NAVY: [number, number, number] = [22, 34, 60];
  const ORANGE: [number, number, number] = [234, 112, 24];
  const WHITE: [number, number, number] = [255, 255, 255];
  const SLATE: [number, number, number] = [100, 116, 139];
  const DARK: [number, number, number] = [20, 20, 20];

  const logo = await loadLogo();

  // ── HEADER ──────────────────────────────────────────────────────────────
  const headerH = 110;

  // Navy background
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Orange wave accent — bottom-right decorative shape
  doc.setFillColor(...ORANGE);
  // Large arc shape (simulate wave with a filled polygon)
  const wx = pageWidth - 130;
  const wy = headerH - 50;
  doc.triangle(wx + 60, headerH, pageWidth, wy, pageWidth, headerH, "F");
  doc.setFillColor(234, 140, 60); // lighter orange layer
  doc.triangle(wx + 110, headerH, pageWidth, wy + 28, pageWidth, headerH, "F");

  // Logo circle — left side
  const logoSize = 64;
  const logoX = margin;
  const logoY = (headerH - logoSize) / 2;
  if (logo) {
    doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logoSize, logoSize);
  }

  // Vertical divider after logo
  const divX = logoX + logoSize + 14;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.line(divX, 18, divX, headerH - 22);

  // Title & subtitle
  const titleX = divX + 16;
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MINUTES OF MEETING", titleX, 46);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ORANGE);
  doc.text("Okie Dokie Solutions", titleX, 64);

  // Thin white line under subtitle
  doc.setDrawColor(...WHITE);
  doc.setLineWidth(0.4);
  doc.line(titleX, 70, titleX + 180, 70);

  // Contact info row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text("\u{1F310}  www.okiedokiepay.com", titleX, 85);
  doc.text("\u2709  services@okiedokiepay.com", titleX + 140, 85);

  // MOM badge — top right (white card with navy text)
  const badgeW = 80;
  const badgeH = 36;
  const badgeX = pageWidth - margin - badgeW;
  const badgeY = (headerH - badgeH) / 2;
  doc.setFillColor(...WHITE);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MOM", badgeX + badgeW / 2, badgeY + badgeH / 2 + 5, { align: "center" });

  // ── BODY ────────────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  let y = headerH + 28;

  // Section helper — navy bold title with orange left accent bar + divider
  const section = (title: string) => {
    if (y > 750) {
      doc.addPage();
      y = 48;
    }
    // Left accent bar
    doc.setFillColor(...NAVY);
    doc.rect(margin, y - 11, 3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), margin + 10, y);
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setTextColor(...DARK);
  };

  // ── Meeting Information (2-column grid layout) ──
  section("Meeting Information");

  const col1X = margin + 10;
  const col2X = pageWidth / 2 + 10;
  const labelColor: [number, number, number] = [80, 96, 120];
  const rowGap = 20;

  const infoRows: [string, string, string, string][] = [
    ["Client / Institute", mom.client_name, "Employee", mom.employee_name],
    ["Meeting Date", mom.meeting_date, "Location", mom.location || "—"],
    ["Meeting Type", mom.meeting_type === "online" ? "Online" : "Offline", "", ""],
  ];

  for (const [l1, v1, l2, v2] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...labelColor);
    doc.text(l1, col1X + 18, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(`: ${v1}`, col1X + 100, y);

    if (l2) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...labelColor);
      doc.text(l2, col2X + 18, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK);
      doc.text(`: ${v2}`, col2X + 100, y);
    }
    y += rowGap;
  }
  y += 6;

  // ── Attendees ──
  if (mom.attendees.length) {
    section("Attendees");
    autoTable(doc, {
      startY: y,
      head: [["Name", "Designation", "Mobile", "Team"]],
      body: mom.attendees.map((a) => [
        a.name,
        a.designation,
        a.mobile || "—",
        a.team === "okie_dokie" ? "Okie Dokie Team" : "Client",
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Discussion Points ──
  if (mom.discussion_points.length) {
    section("Discussion Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Details"]],
      body: mom.discussion_points.map((d) => [d.module, d.details]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Work Completed ──
  if (mom.work_completed.length) {
    section("Work Completed");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Task Completed"]],
      body: mom.work_completed.map((w) => [w.module, w.task]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Pending Points ──
  if (mom.pending_points.length) {
    section("Pending Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Requirement", "Pending With"]],
      body: mom.pending_points.map((p) => [
        p.module,
        p.requirement,
        p.pending_with === "okie_dokie" ? "Okie Dokie Team" : "Client",
      ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 110 }, 2: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 16;
  }

  // ── Conclusion ──
  if (mom.summary) {
    section("Conclusion");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    const lines = doc.splitTextToSize(mom.summary, pageWidth - margin * 2 - 10);
    if (y + lines.length * 14 > 780) {
      doc.addPage();
      y = 48;
    }
    doc.text(lines, margin + 10, y);
    y += lines.length * 14 + 10;
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    doc.setFontSize(8);
    doc.setTextColor(...SLATE);
    doc.text("www.okiedokiepay.com  |  services@okiedokiepay.com", margin, footerY);
    doc.text(`Page ${i} of ${pages}`, pageWidth - margin, footerY, { align: "right" });
  }

  const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`MOM_${safe}_${mom.meeting_date}.pdf`);
}
