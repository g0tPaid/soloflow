// @vitest-environment node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exporterOrderSchema,
  exporterProfileSchema,
  exportTotals,
} from "@flowbooks/shared";
import { renderExporterPdf, zipFiles, type ExporterDoc } from "./documents";

const order = exporterOrderSchema.parse({
  customerId: "test-customer",
  supplierId: "test-supplier",
  date: "2026-11-27",
  currency: "USD",
  purchaseCurrency: "CNY",
  lines: [
    {
      productId: "test-motor",
      description: "Sample electric curtain motor",
      quantity: 1,
      purchasePrice: 250,
      salePrice: 100,
      hsCode: "SAMPLE-NOT-CLASSIFIED",
      origin: "China",
      packages: 1,
      packageType: "Carton",
      netWeight: 1,
      grossWeight: 1.5,
      dimensions: "40x20x10 cm",
      cbm: 0.008,
    },
  ],
  purchase: {},
  customs: { declaredQuantity: 0, declaredValue: 0, currency: "USD" },
  tax: {
    vatInvoiceAmount: 0,
    vatAmount: 0,
    rmbRate: 7,
    treatment: "UNCONFIRMED",
  },
  shipment: { status: "PENDING", destination: "UAE" },
});
const exporter = exporterProfileSchema.parse({
  englishName: "SAMPLE Exporter",
  address: "Xiamen, China",
  currency: "USD",
});
const encoder = new TextDecoder();
afterEach(() => vi.unstubAllGlobals());

describe("exporter document downloads", () => {
  it("generates real PDF bytes for PI, CI and PL from the immutable sample snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      async (name: string) =>
        new Response(
          new Uint8Array(
            await readFile(
              resolve(process.cwd(), "public", name.replace(/^\//, "")),
            ),
          ),
        ),
    );
    vi.stubGlobal("document", {
      createElement: () => ({ getContext: () => ({}) }),
    });
    for (const kind of ["PI", "CI", "PL"]) {
      const doc: ExporterDoc = {
        id: kind,
        kind,
        number: `TEST-${kind}-000001`,
        createdAt: "2026-11-27T00:00:00Z",
        snapshot: {
          order,
          exporter,
          customer: { name: "SAMPLE Overseas Buyer" },
          supplier: { name: "SAMPLE Factory" },
          orderNumber: "TEST-ORDER-000001",
          sample: true,
          payment: null,
          totals: exportTotals(order, []),
        },
      };
      const bytes = new Uint8Array(
        await (await renderExporterPdf(doc)).arrayBuffer(),
      );
      expect(encoder.decode(bytes.slice(0, 5))).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(2000);
    }
  });
  it("creates a valid stored ZIP with UTF-8 names, local headers, central directory and file counts", async () => {
    const zip = await zipFiles([
      { name: "PI.pdf", blob: new Blob(["example PDF"]) },
      { name: "originals/记录.txt", blob: new Blob(["sample record"]) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(bytes.length - 12, true)).toBe(2);
    expect(encoder.decode(bytes)).toContain("originals/记录.txt");
  });
});
