import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MOM } from "./mom-types";
import logoUrl from '../logo.png';

type LoadedLogo = { dataUrl: string; width: number; height: number };

// Loads the bundled company logo and converts it to a data URL so jsPDF can
// embed it. Since the logo is bundled with the app (not fetched from S3),
// there's no cross-origin restriction reading its pixel data into a canvas.
// Still falls back to null (text-only header) if loading unexpectedly fails.
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
  const margin = 40;

  const logo = await loadLogo();

  // ── Header ──────────────────────────────────────────────────────────────
  const headerHeight = 90;

  // Navy top bar (full width)
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // White inner card (inset 6 pt on each side, 6 pt from top, fills rest)
  const cardX = 6;
  const cardY = 6;
  const cardW = pageWidth - 12;
  const cardH = headerHeight - 12;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");

  // Logo inside white card
  let textX = margin;
  if (logo) {
    const logoH = 44;
    const logoW = (logo.width / logo.height) * logoH;
    const logoX = cardX + 14;
    const logoY = cardY + (cardH - logoH) / 2;
    doc.addImage(logo.dataUrl, "PNG", logoX, logoY, logoW, logoH);
    textX = logoX + logoW + 14;
  } else {
    textX = cardX + 18;
  }

  // Title
  const titleY = cardY + cardH / 2 - 5;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Minutes of Meeting", textX, titleY);

  // Thin navy accent line between title and subtitle
  const titleWidth = doc.getTextWidth("Minutes of Meeting");
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);

  // Subtitle / tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("Okie Dokie Solutions", textX, titleY + 13);

  // Right-aligned "MOM" badge on navy bar (top right)
  const badgeW = 52;
  const badgeH = 18;
  const badgeX = pageWidth - cardX - 14 - badgeW;
  const badgeY = cardY + (cardH - badgeH) / 2;
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MOM", badgeX + badgeW / 2, badgeY + badgeH / 2 + 3, { align: "center" });

  doc.setTextColor(20, 20, 20);
  let y = headerHeight + 22;

  // Meeting Information block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Meeting Information", margin, y);
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    body: [
      ["Client / Institute", mom.client_name],
      ["Meeting Date", mom.meeting_date],
      ["Meeting Type", mom.meeting_type === "online" ? "Online" : "Offline"],
      ["Employee", mom.employee_name],
      ["Location", mom.location || "—"],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 130, textColor: [80, 80, 80] },
    },
    margin: { left: margin, right: margin },
  });
  // @ts-expect-error autotable adds lastAutoTable
  y = doc.lastAutoTable.finalY + 18;

  const section = (title: string) => {
    if (y > 760) {
      doc.addPage();
      y = 60;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    doc.setTextColor(20, 20, 20);
    y += 6;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

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
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 14;
  }

  if (mom.discussion_points.length) {
    section("Discussion Points");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Details"]],
      body: mom.discussion_points.map((d) => [d.module, d.details]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
      columnStyles: { 0: { cellWidth: 100 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 14;
  }

  if (mom.work_completed.length) {
    section("Work Completed");
    autoTable(doc, {
      startY: y,
      head: [["Module", "Task Completed"]],
      body: mom.work_completed.map((w) => [w.module, w.task]),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
      columnStyles: { 0: { cellWidth: 100 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 14;
  }

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
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
      columnStyles: { 0: { cellWidth: 100 }, 2: { cellWidth: 100 } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 14;
  }

  if (mom.summary) {
    section("Conclusion");
    const lines = doc.splitTextToSize(mom.summary, pageWidth - margin * 2);
    if (y + lines.length * 13 > 780) {
      doc.addPage();
      y = 60;
    }
    doc.text(lines, margin, y);
    y += lines.length * 13;
  }

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Okie Dokie Solutions  •  Client Visit MOM Portal  •  Page ${i} of ${pages}`,
      pageWidth / 2,
      820,
      { align: "center" },
    );
  }

  const safe = mom.client_name.replace(/[^a-z0-9]+/gi, "_");
  doc.save(`MOM_${safe}_${mom.meeting_date}.pdf`);
}
