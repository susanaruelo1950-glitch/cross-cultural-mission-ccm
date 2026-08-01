/**
 * Professional PDF / DOCX exports for the missionary Master Records directory.
 * Both exports share the same grouped structure so the printed and shared
 * documents look identical in organisation.
 */

export type ExportRow = {
  name: string;
  subtitle: string;
  /** Optional portrait shown beside the name (any fetchable image URL). */
  photoUrl?: string;
  sections: { title: string; rows: { label: string; value: string }[] }[];
};

export type ExportGroup = {
  title: string;
  rows: ExportRow[];
};

export type ExportMeta = {
  title: string;
  subtitle: string;
  groupedBy: string;
  total: number;
  /** Optional line listing the fields the user chose to include. */
  fieldsNote?: string;
};

function filledSections(r: ExportRow) {
  return r.sections
    .map((s) => ({ title: s.title, rows: s.rows.filter((x) => x.value && x.value.trim()) }))
    .filter((s) => s.rows.length > 0);
}

function today() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type LoadedImage = { dataUrl: string; type: "PNG" | "JPEG"; width: number; height: number };

/** Fetch + decode an image once so it can be embedded in PDF and DOCX. */
async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("read failed"));
      fr.readAsDataURL(blob);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = dataUrl;
    });
    const type: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
    return { dataUrl, type, ...size };
  } catch {
    return null;
  }
}

async function loadPhotos(groups: ExportGroup[]) {
  const urls = new Set<string>();
  for (const g of groups) for (const r of g.rows) if (r.photoUrl) urls.add(r.photoUrl);
  const entries = await Promise.all(
    [...urls].map(async (u) => [u, await loadImage(u)] as const),
  );
  const map = new Map<string, LoadedImage>();
  for (const [u, img] of entries) if (img) map.set(u, img);
  return map;
}

function dataUrlToBytes(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function download(blob: Blob, filename: string) {

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


/* ------------------------------------------------------------------ PDF */

export async function exportDirectoryPdf(groups: ExportGroup[], meta: ExportMeta) {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as unknown as { default: (doc: unknown, opts: unknown) => void })
    .default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48;
  const NAVY: [number, number, number] = [15, 27, 61];

  // Cover header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(meta.title, M, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(meta.subtitle, M, 72);
  doc.text(`Grouped by ${meta.groupedBy}  ·  ${meta.total} records  ·  Generated ${today()}`, M, 90);
  doc.setTextColor(30, 30, 30);

  const photos = await loadPhotos(groups);

  let y = 140;

  if (meta.fieldsNote) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 96, 110);
    const lines = doc.splitTextToSize(`Included fields: ${meta.fieldsNote}`, pageW - M * 2) as string[];
    doc.text(lines, M, y);
    y += lines.length * 11 + 12;
    doc.setTextColor(30, 30, 30);
  }

  function ensure(space: number) {
    if (y + space > pageH - 60) {
      doc.addPage();
      y = 60;
    }
  }

  for (const group of groups) {
    ensure(70);
    doc.setFillColor(240, 243, 250);
    doc.rect(M - 8, y - 16, pageW - (M - 8) * 2, 26, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...NAVY);
    doc.text(`${group.title}  (${group.rows.length})`, M, y + 2);
    doc.setTextColor(30, 30, 30);
    y += 30;

    for (const row of group.rows) {
      const img = row.photoUrl ? photos.get(row.photoUrl) : undefined;
      const PH = 78;
      ensure(img ? PH + 40 : 90);
      const textX = img ? M + PH * 0.8 + 12 : M;
      const top = y;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(row.name, textX, y);
      y += 14;
      if (row.subtitle) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(90, 96, 110);
        const sub = doc.splitTextToSize(row.subtitle, pageW - textX - M) as string[];
        doc.text(sub, textX, y);
        doc.setTextColor(30, 30, 30);
        y += sub.length * 11 + 2;
      }
      if (img) {
        const w = PH * 0.8;
        try {
          doc.addImage(img.dataUrl, img.type, M, top - 11, w, PH);
        } catch {
          /* skip unreadable image */
        }
        y = Math.max(y, top - 11 + PH + 6);
      }

      const body: string[][] = [];
      for (const s of filledSections(row)) {
        body.push([`§ ${s.title}`, ""]);
        for (const f of s.rows) body.push([f.label, f.value]);
      }
      if (body.length === 0) continue;


      autoTable(doc, {
        startY: y + 4,
        margin: { left: M, right: M },
        body,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 4,
          overflow: "linebreak",
          lineColor: [220, 224, 232],
          lineWidth: 0.5,
          textColor: [30, 30, 30],
        },
        columnStyles: { 0: { cellWidth: 130, textColor: [70, 76, 92] }, 1: { cellWidth: "auto" } },
        didParseCell: (data: {
          cell: { text: string[]; styles: Record<string, unknown> };
          column: { index: number };
          row: { raw: unknown };
        }) => {
          const raw = data.row.raw as string[];
          if (raw && typeof raw[0] === "string" && raw[0].startsWith("§ ")) {
            data.cell.styles.fillColor = [246, 248, 252];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = NAVY;
            if (data.column.index === 0) data.cell.text = [raw[0].replace("§ ", "")];
          }
        },
      });
      y = ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY ?? y) + 18;
    }
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 126, 140);
    doc.text(meta.title, M, pageH - 28);
    doc.text(`Page ${i} of ${pages}`, pageW - M, pageH - 28, { align: "right" });
  }

  download(doc.output("blob"), "missionary-directory.pdf");
}

/* ----------------------------------------------------------------- DOCX */

export async function exportDirectoryDocx(groups: ExportGroup[], meta: ExportMeta) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    ShadingType,
    HeadingLevel,
    AlignmentType,
    Header,
    Footer,
    PageNumber,
    PageOrientation,
  } = await import("docx");

  const border = { style: BorderStyle.SINGLE, size: 1, color: "DCE0E8" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const CONTENT = 9360;
  const LABEL_W = 2800;
  const VALUE_W = CONTENT - LABEL_W;
  const NAVY = "0F1B3D";

  const photos = await loadPhotos(groups);

  const children: (typeof Paragraph.prototype | typeof Table.prototype)[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: meta.title, bold: true, size: 40, color: NAVY })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: meta.subtitle, size: 22, color: "4A5060" })],
    }),
    new Paragraph({
      spacing: { after: meta.fieldsNote ? 120 : 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY, space: 6 } },
      children: [
        new TextRun({
          text: `Grouped by ${meta.groupedBy}  ·  ${meta.total} records  ·  Generated ${today()}`,
          size: 18,
          color: "6B7280",
        }),
      ],
    }),
  );

  if (meta.fieldsNote) {
    children.push(
      new Paragraph({
        spacing: { after: 320 },
        children: [
          new TextRun({ text: "Included fields: ", bold: true, size: 18, color: "6B7280" }),
          new TextRun({ text: meta.fieldsNote, size: 18, color: "6B7280" }),
        ],
      }),
    );
  }


  for (const group of groups) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
        children: [
          new TextRun({
            text: `${group.title} (${group.rows.length})`,
            bold: true,
            size: 30,
            color: NAVY,
          }),
        ],
      }),
    );

    for (const row of group.rows) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 220, after: 60 },
          children: [new TextRun({ text: row.name, bold: true, size: 26 })],
        }),
      );
      if (row.subtitle) {
        children.push(
          new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: row.subtitle, italics: true, size: 20, color: "5A6070" })],
          }),
        );
      }

      const img = row.photoUrl ? photos.get(row.photoUrl) : undefined;
      if (img) {
        const h = 130;
        const w = Math.max(60, Math.round((img.width / Math.max(1, img.height)) * h));
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new ImageRun({
                type: img.type === "PNG" ? "png" : "jpg",
                data: dataUrlToBytes(img.dataUrl),
                transformation: { width: Math.min(w, 200), height: h },
                altText: { title: row.name, description: `Photo of ${row.name}`, name: row.name },
              }),
            ],
          }),
        );
      }



      const tableRows: (typeof TableRow.prototype)[] = [];
      for (const s of filledSections(row)) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: CONTENT, type: WidthType.DXA },
                columnSpan: 2,
                shading: { fill: "EEF2FA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: s.title.toUpperCase(), bold: true, size: 18, color: NAVY }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        );
        for (const f of s.rows) {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: LABEL_W, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: f.label, size: 19, color: "4A5060" })],
                    }),
                  ],
                }),
                new TableCell({
                  borders,
                  width: { size: VALUE_W, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: f.value, size: 19 })] })],
                }),
              ],
            }),
          );
        }
      }

      if (tableRows.length > 0) {
        children.push(
          new Table({
            width: { size: CONTENT, type: WidthType.DXA },
            columnWidths: [LABEL_W, VALUE_W],
            rows: tableRows,
          }),
        );
      }

    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: meta.title, size: 16, color: "8A90A0" })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: "Page ", size: 16, color: "8A90A0" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8A90A0" }),
                  new TextRun({ text: " of ", size: 16, color: "8A90A0" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "8A90A0" }),
                ],
              }),
            ],
          }),
        },
        children: children as never,
      },
    ],
  });

  download(await Packer.toBlob(doc), "missionary-directory.docx");
}
