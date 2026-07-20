import { Injectable, BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '@flowbooks/database';
import { PrismaService } from '../prisma/prisma.service';
import { fromUsd, parseFxRates, roundMoney, toUsd } from '@flowbooks/shared';

type TaxConfig = {
  vatRegistered?: boolean;
  filingFrequency?: 'quarterly' | 'monthly';
  defaultEmirate?: string;
};

/** Paid sale invoices are excluded from VAT revenue / taxable (Box 1) output. */
const EXCLUDED_FROM_OUTPUT_VAT: InvoiceStatus[] = [
  InvoiceStatus.PAID,
  InvoiceStatus.DRAFT,
  InvoiceStatus.CANCELLED,
  InvoiceStatus.VOID,
];

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getVatReturn(organizationId: string, from?: string, to?: string) {
    const { fromDate, toDate, fromIso, toIso } = this.parsePeriod(from, to);

    const settings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
    const rates = parseFxRates(settings?.fxRates);
    const fxEnabled = settings?.fxEnabled !== false;
    const taxConfig = this.parseTaxConfig(settings?.taxConfig);
    const branding =
      settings?.branding && typeof settings.branding === 'object'
        ? (settings.branding as Record<string, unknown>)
        : {};
    const companyTrn =
      typeof branding.trn === 'string' && branding.trn.trim() ? branding.trn.trim() : null;

    const toAed = (amount: number, currency: string) => {
      const code = (currency || 'USD').toUpperCase();
      if (!fxEnabled) {
        return code === 'AED' ? amount : 0;
      }
      return fromUsd(toUsd(amount, code, rates), 'AED', rates);
    };

    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        issueDate: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        number: true,
        issueDate: true,
        currency: true,
        status: true,
        customerId: true,
        vendorId: true,
        subtotal: true,
        shipping: true,
        discount: true,
        taxAmount: true,
        taxRate: true,
        inputTaxAmount: true,
        inputTaxRate: true,
        total: true,
        totalCost: true,
        customer: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true, taxId: true } },
      },
      orderBy: { issueDate: 'asc' },
    });

    const sales = invoices.filter(
      (row) => row.customerId && !EXCLUDED_FROM_OUTPUT_VAT.includes(row.status),
    );
    const purchases = invoices.filter((row) => row.vendorId);

    let standardRatedSuppliesAed = 0;
    let outputVatAed = 0;
    const outputLines = sales.map((row) => {
      const currency = row.currency || 'USD';
      const net = Math.max(
        0,
        Number(row.subtotal) + Number(row.shipping) - Number(row.discount),
      );
      const tax = Number(row.taxAmount) || 0;
      const netAed = roundMoney(toAed(net, currency));
      const taxAed = roundMoney(toAed(tax, currency));
      standardRatedSuppliesAed += netAed;
      outputVatAed += taxAed;
      return {
        id: row.id,
        number: row.number,
        issueDate: row.issueDate,
        status: row.status,
        currency,
        partyName: row.customer?.name ?? 'Customer',
        taxRate: Number(row.taxRate) || 0,
        netAmount: roundMoney(net),
        vatAmount: roundMoney(tax),
        netAmountAed: netAed,
        vatAmountAed: taxAed,
        href: `/invoices/${row.id}`,
      };
    });

    let recoverableInputVatAed = 0;
    let nonRecoverableInputVatAed = 0;
    const inputLines = purchases.map((row) => {
      const currency = row.currency || 'USD';
      const inputVat = Number(row.inputTaxAmount) || 0;
      const inputVatAed = roundMoney(toAed(inputVat, currency));
      const hasTrn = Boolean(row.vendor?.taxId?.trim());
      if (hasTrn) recoverableInputVatAed += inputVatAed;
      else nonRecoverableInputVatAed += inputVatAed;
      return {
        id: row.id,
        number: row.number,
        issueDate: row.issueDate,
        status: row.status,
        currency,
        partyName: row.vendor?.name ?? 'Vendor',
        vendorTrn: row.vendor?.taxId?.trim() || null,
        recoverable: hasTrn,
        taxRate: Number(row.inputTaxRate) || 0,
        purchaseCost: roundMoney(Number(row.totalCost) || 0),
        vatAmount: roundMoney(inputVat),
        vatAmountAed: inputVatAed,
        href: `/expenses/${row.id}`,
      };
    });

    standardRatedSuppliesAed = roundMoney(standardRatedSuppliesAed);
    outputVatAed = roundMoney(outputVatAed);
    recoverableInputVatAed = roundMoney(recoverableInputVatAed);
    nonRecoverableInputVatAed = roundMoney(nonRecoverableInputVatAed);
    const netVatAed = roundMoney(outputVatAed - recoverableInputVatAed);
    const filingDueDate = this.addDays(toDate, 28);

    return {
      currency: 'AED',
      companyTrn,
      taxConfig,
      period: {
        from: fromIso,
        to: toIso,
        filingDueDate: filingDueDate.toISOString().slice(0, 10),
      },
      boxes: {
        box1: {
          label: 'Standard rated supplies (Box 1 summary)',
          emirate: taxConfig.defaultEmirate || null,
          amountExVat: standardRatedSuppliesAed,
          vatAmount: outputVatAed,
        },
        box9: {
          label: 'Recoverable input VAT (Box 9)',
          vatAmount: recoverableInputVatAed,
          nonRecoverableVatAmount: nonRecoverableInputVatAed,
        },
        box12: {
          label: 'Total output VAT for the period',
          vatAmount: outputVatAed,
        },
        box13: {
          label: 'Total recoverable input VAT',
          vatAmount: recoverableInputVatAed,
        },
        box14: {
          label: netVatAed >= 0 ? 'Net VAT due (payable)' : 'Net VAT refundable',
          vatAmount: Math.abs(netVatAed),
          payable: netVatAed >= 0,
          netVat: netVatAed,
        },
      },
      totals: {
        standardRatedSuppliesAed,
        outputVatAed,
        recoverableInputVatAed,
        nonRecoverableInputVatAed,
        netVatAed,
      },
      counts: {
        salesInvoices: sales.length,
        purchaseExpenses: purchases.length,
      },
      outputLines,
      inputLines,
      emaraTaxUrl: 'https://eservices.tax.gov.ae',
      notes: [
        'Figures are converted to AED for EmaraTax entry. Verify against tax invoices before filing.',
        'File and pay within 28 days after the tax period ends.',
        'Input VAT is recoverable only when the vendor has a TRN on file.',
        'Paid sale invoices are excluded from Box 1 revenue / taxable output VAT (also excludes Draft, Cancelled, and Void).',
      ],
    };
  }

  private parseTaxConfig(raw: unknown): TaxConfig {
    if (!raw || typeof raw !== 'object') {
      return { vatRegistered: false, filingFrequency: 'quarterly' };
    }
    const cfg = raw as TaxConfig;
    return {
      vatRegistered: Boolean(cfg.vatRegistered),
      filingFrequency: cfg.filingFrequency === 'monthly' ? 'monthly' : 'quarterly',
      defaultEmirate: typeof cfg.defaultEmirate === 'string' ? cfg.defaultEmirate : undefined,
    };
  }

  private parsePeriod(from?: string, to?: string) {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (from && to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        throw new BadRequestException('from and to must be YYYY-MM-DD');
      }
      fromDate = new Date(`${from}T00:00:00.000Z`);
      toDate = new Date(`${to}T23:59:59.999Z`);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
        throw new BadRequestException('Invalid date range');
      }
    } else {
      // Default: current calendar quarter (UTC)
      const month = now.getUTCMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      fromDate = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth, 1, 0, 0, 0, 0));
      toDate = new Date(Date.UTC(now.getUTCFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999));
    }

    return {
      fromDate,
      toDate,
      fromIso: fromDate.toISOString().slice(0, 10),
      toIso: toDate.toISOString().slice(0, 10),
    };
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }
}
