import { z } from "zod";

const text = z.string().trim().max(4000);
const required = text.min(1);
const optional = text.default("");
const currency = z.string().regex(/^[A-Z]{3}$/);
const money = z
  .number()
  .finite()
  .min(0)
  .max(1e9)
  .refine(
    (x) => Math.abs(x * 100 - Math.round(x * 100)) < 0.0001,
    "Maximum two decimal places",
  );
const positive = z.number().finite().gt(0).max(1e9);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (x) =>
      !Number.isNaN(Date.parse(x)) &&
      new Date(x).toISOString().slice(0, 10) === x,
  );
const optionalDate = z.union([date, z.literal("")]).default("");
const party = z
  .object({
    name: required,
    address: optional,
    contact: optional,
    phone: optional,
    email: optional,
    taxId: optional,
    country: optional,
  })
  .strict();
export const exporterDirectorySchemas = {
  customers: party,
  suppliers: party,
  products: z
    .object({
      name: required,
      description: optional,
      hsCode: optional,
      origin: optional,
      unit: optional,
    })
    .strict(),
};
export const exporterProfileSchema = z
  .object({
    englishName: required,
    chineseName: optional,
    creditCode: optional,
    address: required,
    contact: optional,
    phone: optional,
    email: optional,
    bankName: optional,
    bankAccount: optional,
    swift: optional,
    logo: z
      .string()
      .max(1_000_000)
      .regex(/^(|data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+)$/)
      .default(""),
    currency,
    paymentTerms: optional,
    incoterms: optional,
    numberingPrefix: z
      .string()
      .regex(/^[A-Z0-9-]{0,12}$/)
      .default("EXP"),
    numberFormat: z
      .enum([
        "PREFIX_TYPE_SEQUENCE",
        "PREFIX_YEAR_TYPE_SEQUENCE",
        "TYPE_PREFIX_SEQUENCE",
      ])
      .default("PREFIX_TYPE_SEQUENCE"),
    numberWidth: z.number().int().min(3).max(10).default(6),
  })
  .strict();
const line = z
  .object({
    productId: required,
    description: required,
    hsCode: optional,
    origin: optional,
    unit: z.string().trim().max(30).default("pcs"),
    quantity: positive,
    purchasePrice: money,
    salePrice: money,
    packages: z.number().int().min(0).max(1e7),
    packageType: optional,
    netWeight: z.number().finite().min(0),
    grossWeight: z.number().finite().min(0),
    dimensions: optional,
    cbm: z.number().finite().min(0),
    marks: optional,
  })
  .strict()
  .refine(
    (x) => x.grossWeight >= x.netWeight,
    "Gross weight must be at least net weight",
  );
export const exporterOrderSchema = z
  .object({
    customerId: required,
    supplierId: required,
    date,
    currency,
    purchaseCurrency: currency,
    lines: z.array(line).min(1).max(100),
    paymentTerms: optional,
    incoterms: optional,
    notes: optional,
    purchase: z
      .object({
        fapiaoNumber: optional,
        fapiaoDate: optionalDate,
        supplierPaidDate: optionalDate,
        supplierBankReference: optional,
        notes: optional,
      })
      .strict(),
    customs: z
      .object({
        declarationNumber: optional,
        clearanceDate: optionalDate,
        broker: optional,
        declaredQuantity: z.number().finite().min(0),
        declaredValue: money,
        currency,
        hsCodes: optional,
        notes: optional,
      })
      .strict(),
    tax: z
      .object({
        vatInvoiceAmount: money,
        vatAmount: money,
        rmbRate: positive,
        treatment: z.enum([
          "UNCONFIRMED",
          "REFUND",
          "EXEMPTION",
          "OTHER",
          "NOT_APPLICABLE",
        ]),
        confirmedBy: optional,
        refundStatus: z
          .enum([
            "NOT_REVIEWED",
            "PENDING",
            "APPROVED",
            "REJECTED",
            "NOT_APPLICABLE",
          ])
          .default("NOT_REVIEWED"),
        notes: optional,
      })
      .strict(),
    shipment: z
      .object({
        forwarder: optional,
        method: optional,
        trackingNumber: optional,
        awb: optional,
        departure: optionalDate,
        destination: optional,
        estimatedArrival: optionalDate,
        actualArrival: optionalDate,
        status: z.enum(["PENDING", "IN_TRANSIT", "DELIVERED"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((o, ctx) => {
    const reject = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    if (o.tax.vatAmount > o.tax.vatInvoiceAmount)
      reject(["tax", "vatAmount"], "VAT cannot exceed VAT invoice amount");
    if (o.tax.treatment !== "UNCONFIRMED" && !o.tax.confirmedBy)
      reject(["tax", "confirmedBy"], "Accountant confirmation is required");
    if (
      o.tax.treatment === "UNCONFIRMED" &&
      o.tax.refundStatus !== "NOT_REVIEWED"
    )
      reject(
        ["tax", "refundStatus"],
        "Confirm tax treatment before recording refund or exemption status",
      );
    if (o.currency === "CNY" && o.tax.rmbRate !== 1)
      reject(["tax", "rmbRate"], "CNY conversion rate must be 1");
    if (o.shipment.status === "DELIVERED" && !o.shipment.actualArrival)
      reject(
        ["shipment", "actualArrival"],
        "Actual arrival is required for delivered shipments",
      );
    if (
      o.shipment.departure &&
      o.shipment.actualArrival &&
      o.shipment.actualArrival < o.shipment.departure
    )
      reject(["shipment", "actualArrival"], "Arrival cannot precede departure");
    if (
      o.lines.reduce((s, l) => s + l.quantity * l.salePrice, 0) > 1e9 ||
      o.lines.reduce((s, l) => s + l.quantity * l.purchasePrice, 0) > 1e9
    )
      reject(["lines"], "Transaction total exceeds supported amount");
  });
export const exporterPaymentSchema = z
  .object({
    amount: money.refine((x) => x > 0),
    currency,
    rateToOrderCurrency: positive,
    date,
    method: required,
    bankReference: optional,
    type: z.enum(["DEPOSIT", "BALANCE", "OTHER"]),
  })
  .strict();
export type ExporterOrderData = z.infer<typeof exporterOrderSchema>;
export type ExporterProfileData = z.infer<typeof exporterProfileSchema>;
export type ExporterPaymentData = z.infer<typeof exporterPaymentSchema>;
export const exporterDocumentKinds = [
  "PI",
  "CI",
  "PL",
  "PURCHASE",
  "RECEIPT",
  "SUMMARY",
] as const;
export const exporterAttachmentKinds = [
  "FACTORY_FAPIAO",
  "PURCHASE",
  "CUSTOMS_OFFICIAL",
  "TAX",
  "SHIPPING",
  "PAYMENT",
  "OTHER",
] as const;
export const exportRound = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function exportTotals(
  order: ExporterOrderData,
  payments: ExporterPaymentData[],
) {
  const total = exportRound(
    order.lines.reduce((s, l) => s + exportRound(l.quantity * l.salePrice), 0),
  );
  const purchase = exportRound(
    order.lines.reduce(
      (s, l) => s + exportRound(l.quantity * l.purchasePrice),
      0,
    ),
  );
  const paid = exportRound(
    payments.reduce(
      (s, p) => s + exportRound(p.amount * p.rateToOrderCurrency),
      0,
    ),
  );
  return {
    total,
    purchase,
    paid,
    outstanding: exportRound(Math.max(0, total - paid)),
    rmbEquivalent: exportRound(total * order.tax.rmbRate),
  };
}
export function exportCompletionIssues(
  order: ExporterOrderData,
  payments: ExporterPaymentData[],
  documents: string[],
  attachments: string[],
) {
  const issues: string[] = [];
  if (
    !order.purchase.supplierPaidDate ||
    !order.purchase.fapiaoNumber ||
    !attachments.includes("FACTORY_FAPIAO")
  )
    issues.push("Factory payment and fapiao");
  if (exportTotals(order, payments).outstanding > 0)
    issues.push("Customer payment");
  for (const kind of ["PI", "CI", "PL"])
    if (!documents.includes(kind)) issues.push(kind);
  if (
    !order.customs.declarationNumber ||
    !order.customs.clearanceDate ||
    !attachments.includes("CUSTOMS_OFFICIAL")
  )
    issues.push("Official customs declaration");
  if (order.tax.treatment === "UNCONFIRMED" || !order.tax.confirmedBy)
    issues.push("Tax accountant confirmation");
  if (
    order.shipment.status !== "DELIVERED" ||
    !order.shipment.actualArrival ||
    !attachments.includes("SHIPPING")
  )
    issues.push("Delivery and shipping documents");
  return issues;
}

/** Historic documents remain downloadable, but cannot complete a changed transaction. */
export function exportCurrentDocumentKinds(
  order: ExporterOrderData,
  documents: { kind: string; snapshot: unknown }[],
) {
  const signature = (o: ExporterOrderData, kind: string) =>
    JSON.stringify({
      customer: o.customerId,
      currency: o.currency,
      incoterms: o.incoterms,
      paymentTerms: o.paymentTerms,
      lines: o.lines.map((l) =>
        kind === "PL"
          ? [
              l.description,
              l.quantity,
              l.unit,
              l.packages,
              l.packageType,
              l.netWeight,
              l.grossWeight,
              l.dimensions,
              l.cbm,
              l.marks,
            ]
          : [
              l.description,
              l.quantity,
              l.unit,
              l.hsCode,
              l.origin,
              l.salePrice,
            ],
      ),
    });
  return documents
    .filter((d) => {
      if (!["CI", "PL"].includes(d.kind)) return true;
      const original = exporterOrderSchema.safeParse(
        (d.snapshot as { order?: unknown } | null)?.order,
      );
      return (
        original.success &&
        signature(original.data, d.kind) === signature(order, d.kind)
      );
    })
    .map((d) => d.kind);
}
