import { jsPDF } from "jspdf";
import {
  exportRound,
  type ExporterOrderData,
  type ExporterProfileData,
  type ExporterPaymentData,
} from "@flowbooks/shared";

export type ExporterDoc = {
  id: string;
  number: string;
  kind: string;
  createdAt: string;
  snapshot: {
    order: ExporterOrderData;
    exporter: ExporterProfileData;
    customer: Record<string, string>;
    supplier: Record<string, string>;
    orderNumber: string;
    sample: boolean;
    completedAt?: string | null;
    payment: ExporterPaymentData | null;
    totals: {
      total: number;
      purchase: number;
      paid: number;
      outstanding: number;
      rmbEquivalent: number;
    };
  };
};
export const docNames: Record<string, string> = {
  PI: "Proforma Invoice",
  CI: "Commercial Invoice",
  PL: "Packing List",
  PURCHASE: "Purchase Record",
  RECEIPT: "Payment Receipt",
  SUMMARY: "Export Order Summary",
};

let latinFontPromise: Promise<[string, string] | null> | undefined;
function loadLatinFonts() {
  return (latinFontPromise ??= Promise.all(
    ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"].map(async (name) => {
      const response = await fetch(`/exporter-fonts/${name}`);
      if (!response.ok) throw new Error("Font unavailable");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(binary);
    }),
  )
    .then((fonts) => [fonts[0], fonts[1]] as [string, string])
    .catch(() => null));
}

export async function renderExporterPdf(doc: ExporterDoc): Promise<Blob> {
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const embedded = await loadLatinFonts();
  if (embedded) {
    pdf.addFileToVFS("NotoSans-Regular.ttf", embedded[0]);
    pdf.addFileToVFS("NotoSans-Bold.ttf", embedded[1]);
    pdf.addFont("NotoSans-Regular.ttf", "ExporterSans", "normal");
    pdf.addFont("NotoSans-Bold.ttf", "ExporterSans", "bold");
  }
  const unicode = [
    ...new Set(
      Array.from(JSON.stringify(doc.snapshot)).filter(
        (c) => c.codePointAt(0)! > 127,
      ),
    ),
  ].join("");
  if (unicode && document.fonts)
    await document.fonts
      .load('12px "Noto Sans SC"', unicode)
      .catch(() => undefined);
  const { order, exporter, customer, supplier, totals, sample, payment } =
    doc.snapshot;
  let y = 20;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const line = (value: string, size = 10, bold = false) => {
    // Keep Latin text selectable and use canvas only for Unicode company names
    // and other text not supported by jsPDF's built-in fonts.
    if (/^[\x20-\x7e\n\r]*$/.test(value)) {
      pdf.setFont(
        embedded ? "ExporterSans" : "helvetica",
        bold ? "bold" : "normal",
      );
      pdf.setFontSize(size);
      pdf.setTextColor(23, 32, 51);
      for (const row of pdf.splitTextToSize(value, 178) as string[]) {
        const height = size * 0.45 + 2;
        if (y + height > 278) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(row, 16, y + size * 0.35);
        y += height;
      }
      return;
    }
    const scale = 4;
    ctx.font = `${bold ? "bold" : "normal"} ${size * 1.333 * scale}px "Exporter CJK", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif`;
    const max = 178 * 3.78 * scale;
    const rows: string[] = [];
    let current = "";
    for (const char of String(value)) {
      if (char === "\n" || ctx.measureText(current + char).width > max) {
        rows.push(current);
        current = char === "\n" ? "" : char;
      } else current += char;
    }
    rows.push(current);
    for (const row of rows) {
      const height = size * 0.48;
      if (y + height > 278) {
        pdf.addPage();
        y = 20;
      }
      canvas.width = Math.max(1, Math.ceil(ctx.measureText(row).width + 8));
      canvas.height = Math.ceil(height * 3.78 * scale + 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${bold ? "bold" : "normal"} ${size * 1.333 * scale}px "Exporter CJK", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif`;
      ctx.fillStyle = "#172033";
      ctx.textBaseline = "middle";
      ctx.fillText(row, 3, canvas.height / 2);
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        16,
        y,
        canvas.width / (3.78 * scale),
        canvas.height / (3.78 * scale),
      );
      y += height + 2;
    }
  };
  const heading = (value: string) => {
    y += 3;
    pdf.setDrawColor(220, 225, 230);
    pdf.line(16, y, 194, y);
    y += 4;
    line(value, 12, true);
  };
  if (exporter.logo) {
    try {
      pdf.addImage(
        exporter.logo,
        exporter.logo.startsWith("data:image/png") ? "PNG" : "JPEG",
        16,
        10,
        21,
        14,
      );
      y = 29;
    } catch {
      /* invalid logo */
    }
  }
  line(exporter.englishName, 15, true);
  if (exporter.chineseName) line(exporter.chineseName);
  line(`${exporter.address}  |  ${exporter.phone}  ${exporter.email}`);
  if (exporter.creditCode)
    line(`Unified Social Credit Code: ${exporter.creditCode}`);
  line(docNames[doc.kind] ?? doc.kind, 22, true);
  if (sample) line("SAMPLE / TEST ONLY - NOT A VALID TRANSACTION", 12, true);
  line(
    `${doc.number}  |  Issued ${doc.createdAt.slice(0, 10)}  |  Order ${doc.snapshot.orderNumber}`,
  );
  heading(
    doc.kind === "PURCHASE" ? "Domestic supplier / factory" : "Overseas buyer",
  );
  const party = doc.kind === "PURCHASE" ? supplier : customer;
  for (const key of [
    "name",
    "address",
    "country",
    "contact",
    "phone",
    "email",
    "taxId",
  ])
    if (party[key]) line(party[key]);
  if (doc.kind === "RECEIPT" && payment) {
    heading("Payment received");
    line(`${payment.currency} ${payment.amount.toFixed(2)} | ${payment.type}`);
    line(
      `${payment.date} | ${payment.method} | Reference: ${payment.bankReference}`,
    );
    line(`Exchange rate to ${order.currency}: ${payment.rateToOrderCurrency}`);
  } else {
    heading("Product details");
    order.lines.forEach((item, i) => {
      line(`${i + 1}. ${item.description}`, 11, true);
      line(
        `Quantity: ${item.quantity} ${item.unit} | HS: ${item.hsCode || "Not recorded"} | Origin: ${item.origin || "Not recorded"}`,
      );
      if (doc.kind === "PL") {
        line(
          `${item.packages} ${item.packageType} | Net ${item.netWeight} kg | Gross ${item.grossWeight} kg`,
        );
        line(
          `Dimensions: ${item.dimensions} | CBM: ${item.cbm} | Marks: ${item.marks}`,
        );
      } else {
        const purchase = doc.kind === "PURCHASE";
        const price = purchase ? item.purchasePrice : item.salePrice;
        line(
          `${purchase ? order.purchaseCurrency : order.currency} ${price.toFixed(2)} each | Line total: ${exportRound(item.quantity * price).toFixed(2)}`,
        );
      }
    });
    if (doc.kind === "PL")
      line(
        `TOTAL: ${order.lines.reduce((s, l) => s + l.packages, 0)} packages | ${order.lines.reduce((s, l) => s + l.netWeight, 0)} kg net | ${order.lines.reduce((s, l) => s + l.grossWeight, 0)} kg gross | ${order.lines.reduce((s, l) => s + l.cbm, 0).toFixed(3)} CBM`,
        12,
        true,
      );
    else
      line(
        `TOTAL: ${doc.kind === "PURCHASE" ? `${order.purchaseCurrency} ${totals.purchase.toFixed(2)}` : `${order.currency} ${totals.total.toFixed(2)}`}`,
        14,
        true,
      );
  }
  if (doc.kind === "PI" || doc.kind === "CI") {
    heading("Terms");
    line(`Payment: ${order.paymentTerms} | Incoterms: ${order.incoterms}`);
    line(
      `Bank: ${exporter.bankName} | Account: ${exporter.bankAccount} | SWIFT: ${exporter.swift}`,
    );
  }
  if (doc.kind === "CI" || doc.kind === "PL" || doc.kind === "SUMMARY") {
    heading("Shipment");
    line(
      `${order.shipment.method} | ${order.shipment.destination} | AWB/B/L: ${order.shipment.awb} | Departure: ${order.shipment.departure}`,
    );
  }
  if (doc.kind === "PURCHASE") {
    heading("Factory fapiao reference");
    line(
      `${order.purchase.fapiaoNumber} | ${order.purchase.fapiaoDate} | Paid: ${order.purchase.supplierPaidDate}`,
    );
    line("Internal purchase record only — not a Chinese VAT fapiao.");
  }
  if (doc.kind === "SUMMARY") {
    heading("Internal transaction summary");
    line(
      `Order completion: ${doc.snapshot.completedAt?.slice(0, 10) || "Open at time of issue"}`,
    );
    line(
      `Paid: ${order.currency} ${totals.paid.toFixed(2)} | Outstanding: ${totals.outstanding.toFixed(2)} | RMB equivalent: ${totals.rmbEquivalent.toFixed(2)}`,
    );
    line(
      `Customs reference: ${order.customs.declarationNumber || "Not recorded"} | Tax treatment: ${order.tax.treatment}`,
    );
    line(
      `Factory fapiao reference: ${order.purchase.fapiaoNumber || "Not recorded"} | Purchase: ${order.purchaseCurrency} ${totals.purchase.toFixed(2)}`,
    );
    line(
      `Shipment status: ${order.shipment.status} | Tracking: ${order.shipment.trackingNumber || "Not recorded"}`,
    );
  }
  if (order.notes) {
    heading("Notes");
    line(order.notes);
  }
  heading("Document status");
  line(
    "Generated by SoloFlow Exporter Module. Not an official customs declaration or tax certificate.",
  );
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setFillColor(220, 38, 38);
    pdf.rect(0, 0, 210, 3, "F");
    pdf.setDrawColor(220, 225, 230);
    pdf.line(16, 285, 194, 285);
    pdf.setFont(embedded ? "ExporterSans" : "helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(doc.number, 16, 290);
    pdf.text(`${page} / ${pdf.getNumberOfPages()}`, 194, 290, {
      align: "right",
    });
  }
  return pdf.output("blob");
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function decodeAttachment(base64: string, type: string) {
  return new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], {
    type,
  });
}

// Standard uncompressed ZIP (UTF-8 filenames, CRC32). No external upload or service.
export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const chunks: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0,
    centralSize = 0;
  const crc = (bytes: Uint8Array) => {
    let n = 0xffffffff;
    for (const b of bytes) {
      n ^= b;
      for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (0xedb88320 & -(n & 1));
    }
    return (n ^ 0xffffffff) >>> 0;
  };
  for (const file of files) {
    const name = new TextEncoder().encode(file.name),
      data = new Uint8Array(await file.blob.arrayBuffer()),
      checksum = crc(data);
    const local = new Uint8Array(30 + name.length),
      l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(6, 0x800, true);
    l.setUint32(14, checksum, true);
    l.setUint32(18, data.length, true);
    l.setUint32(22, data.length, true);
    l.setUint16(26, name.length, true);
    local.set(name, 30);
    const cd = new Uint8Array(46 + name.length),
      c = new DataView(cd.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint32(16, checksum, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    cd.set(name, 46);
    chunks.push(local, data);
    central.push(cd);
    offset += local.length + data.length;
    centralSize += cd.length;
  }
  const end = new Uint8Array(22),
    e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, centralSize, true);
  e.setUint32(16, offset, true);
  return new Blob(
    [...chunks, ...central, end].map(
      (a) =>
        a.buffer.slice(
          a.byteOffset,
          a.byteOffset + a.byteLength,
        ) as ArrayBuffer,
    ),
    { type: "application/zip" },
  );
}
