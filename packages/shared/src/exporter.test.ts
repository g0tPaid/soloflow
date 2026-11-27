import { describe, expect, it } from "vitest";
import {
  exporterOrderSchema,
  exporterPaymentSchema,
  exportCompletionIssues,
  exportTotals,
  exportCurrentDocumentKinds,
} from "./exporter";

const order = exporterOrderSchema.parse({
  customerId: "sample-overseas-customer",
  supplierId: "sample-domestic-factory",
  date: "2026-11-27",
  currency: "USD",
  purchaseCurrency: "CNY",
  lines: [
    {
      productId: "sample-motor",
      description: "SAMPLE: electric curtain motor",
      quantity: 1,
      purchasePrice: 250,
      salePrice: 100,
      packages: 1,
      netWeight: 1,
      grossWeight: 1.5,
      cbm: 0.01,
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
  shipment: { status: "PENDING" },
});
describe("isolated exporter transaction rules", () => {
  it("calculates partial and converted payments without mixing purchase currency", () => {
    const deposit = exporterPaymentSchema.parse({
      amount: 40,
      currency: "USD",
      rateToOrderCurrency: 1,
      date: "2026-11-27",
      method: "Bank transfer",
      type: "DEPOSIT",
    });
    const balance = exporterPaymentSchema.parse({
      amount: 420,
      currency: "CNY",
      rateToOrderCurrency: 1 / 7,
      date: "2026-11-27",
      method: "Bank transfer",
      type: "BALANCE",
    });
    expect(exportTotals(order, [deposit])).toEqual({
      total: 100,
      purchase: 250,
      paid: 40,
      outstanding: 60,
      rmbEquivalent: 700,
    });
    expect(exportTotals(order, [deposit, balance]).outstanding).toBe(0);
  });
  it("rejects negative prices, invalid dates, inconsistent weight and invalid rates", () => {
    expect(
      exporterOrderSchema.safeParse({
        ...order,
        lines: [{ ...order.lines[0], salePrice: -1 }],
      }).success,
    ).toBe(false);
    expect(
      exporterOrderSchema.safeParse({ ...order, date: "2026-02-31" }).success,
    ).toBe(false);
    expect(
      exporterOrderSchema.safeParse({
        ...order,
        lines: [{ ...order.lines[0], grossWeight: 0 }],
      }).success,
    ).toBe(false);
    expect(
      exporterOrderSchema.safeParse({
        ...order,
        tax: { ...order.tax, rmbRate: 0 },
      }).success,
    ).toBe(false);
  });
  it("never treats generated commercial documents as official customs or confirmed tax records", () => {
    const issues = exportCompletionIssues(order, [], ["PI", "CI", "PL"], []);
    expect(issues).toContain("Official customs declaration");
    expect(issues).toContain("Tax accountant confirmation");
    expect(issues).toContain("Factory payment and fapiao");
    expect(issues).toContain("Delivery and shipping documents");
  });
  it("preserves old documents but requires refreshed CI and PL after product changes", () => {
    const docs = ["PI", "CI", "PL"].map((kind) => ({
      kind,
      snapshot: { order },
    }));
    expect(exportCurrentDocumentKinds(order, docs)).toEqual(["PI", "CI", "PL"]);
    expect(
      exportCurrentDocumentKinds(
        { ...order, lines: [{ ...order.lines[0], quantity: 2 }] },
        docs,
      ),
    ).toEqual(["PI"]);
  });
});
