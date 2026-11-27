import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@flowbooks/database";
import {
  exporterDirectorySchemas,
  exporterProfileSchema,
  exporterOrderSchema,
  exporterPaymentSchema,
  exporterDocumentKinds,
  exporterAttachmentKinds,
  exportTotals,
  exportCompletionIssues,
  exportCurrentDocumentKinds,
  TENANT_HEADER,
} from "@flowbooks/shared";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantMemberGuard } from "../common/tenant-member.guard";

type Actor = { user: { sub: string } };
type Tx = Prisma.TransactionClient;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
function parse<T>(
  schema: {
    safeParse: (
      v: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { message: string } };
  },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException(result.error.message);
  return result.data;
}
const attachmentSelect = {
  id: true,
  category: true,
  filename: true,
  contentType: true,
  createdAt: true,
} as const;
const include = {
  payments: true,
  documents: true,
  attachments: { select: attachmentSelect },
} as const;

@Controller("exporter")
@UseGuards(JwtAuthGuard, TenantMemberGuard)
export class ExporterController {
  constructor(private readonly db: PrismaService) {}
  private async authorize(org: string, actor: Actor, settings = false) {
    const member = await this.db.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: org, userId: actor.user.sub },
      },
      select: { role: true, user: { select: { suspendedAt: true } } },
    });
    if (
      !member ||
      member.user?.suspendedAt ||
      !(
        settings
          ? ["OWNER", "ADMIN"]
          : ["OWNER", "ADMIN", "ACCOUNTANT", "MANAGER"]
      ).includes(member.role)
    )
      throw new ForbiddenException(
        settings
          ? "Only owners and administrators can change exporter settings"
          : "Exporter access restricted to owners, administrators, managers and accountants",
      );
  }
  private async audit(
    tx: Tx,
    org: string,
    actor: Actor,
    action: string,
    recordId: string,
    data: unknown,
  ) {
    await tx.exporterAudit.create({
      data: {
        organizationId: org,
        actorId: actor.user.sub,
        action,
        recordId,
        data: json(data),
      },
    });
  }
  private async number(tx: Tx, org: string, kind: string) {
    const profile = await tx.exporterProfile.findUnique({
      where: { organizationId: org },
    });
    const config = profile ? exporterProfileSchema.parse(profile.data) : null;
    const prefix = config?.numberingPrefix || "EXP";
    const seq = await tx.exporterSequence.upsert({
      where: { organizationId_kind: { organizationId: org, kind } },
      create: { organizationId: org, kind, next: 2 },
      update: { next: { increment: 1 } },
    });
    const number = String(seq.next - 1).padStart(config?.numberWidth ?? 6, "0");
    if (config?.numberFormat === "PREFIX_YEAR_TYPE_SEQUENCE")
      return `${prefix}-${new Date().getFullYear()}-${kind}-${number}`;
    if (config?.numberFormat === "TYPE_PREFIX_SEQUENCE")
      return `${kind}-${prefix}-${number}`;
    return `${prefix}-${kind}-${number}`;
  }
  private async order(tx: Tx, org: string, id: string, lock = false) {
    if (lock)
      await tx.$queryRaw`SELECT id FROM exporter_orders WHERE id = ${id} AND "organizationId" = ${org} FOR UPDATE`;
    const row = await tx.exporterOrder.findUnique({
      where: { organizationId_id: { organizationId: org, id } },
      include,
    });
    if (!row) throw new NotFoundException("Export order not found");
    if (lock && row.completedAt)
      throw new BadRequestException(
        "Completed orders are archived and read-only",
      );
    return row;
  }
  @Get("workspace") async workspace(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
  ) {
    await this.authorize(org, actor);
    const [profile, directory, orders] = await Promise.all([
      this.db.exporterProfile.findUnique({ where: { organizationId: org } }),
      this.db.exporterDirectory.findMany({
        where: { organizationId: org },
        orderBy: { name: "asc" },
      }),
      this.db.exporterOrder.findMany({
        where: { organizationId: org },
        include,
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { profile: profile?.data ?? null, directory, orders };
  }
  @Post("profile") async profile(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Body() body: unknown,
  ) {
    await this.authorize(org, actor, true);
    const data = json(parse(exporterProfileSchema, body));
    return this.db.$transaction(async (tx) => {
      const old = await tx.exporterProfile.findUnique({
        where: { organizationId: org },
      });
      const result = await tx.exporterProfile.upsert({
        where: { organizationId: org },
        create: { organizationId: org, data },
        update: { data },
      });
      await this.audit(tx, org, actor, "PROFILE_SAVED", org, {
        previous: old?.data ?? null,
        next: data,
      });
      return result;
    });
  }
  @Post("directory/:kind") async directory(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("kind") kind: string,
    @Body() body: unknown,
  ) {
    await this.authorize(org, actor);
    if (!Object.prototype.hasOwnProperty.call(exporterDirectorySchemas, kind))
      throw new BadRequestException("Invalid directory");
    const schema =
      exporterDirectorySchemas[kind as keyof typeof exporterDirectorySchemas];
    const result = schema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.message);
    return this.db.$transaction(async (tx) => {
      const row = await tx.exporterDirectory.create({
        data: {
          organizationId: org,
          kind,
          name: result.data.name,
          data: json(result.data),
        },
      });
      await this.audit(tx, org, actor, "DIRECTORY_CREATED", row.id, row.data);
      return row;
    });
  }
  @Patch("directory/:kind/:id") async editDirectory(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("kind") kind: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    await this.authorize(org, actor);
    if (!Object.prototype.hasOwnProperty.call(exporterDirectorySchemas, kind))
      throw new BadRequestException("Invalid directory");
    const result =
      exporterDirectorySchemas[
        kind as keyof typeof exporterDirectorySchemas
      ].safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.message);
    return this.db.$transaction(async (tx) => {
      const previous = await tx.exporterDirectory.findFirst({
        where: { organizationId: org, kind, id },
      });
      if (!previous) throw new NotFoundException();
      const row = await tx.exporterDirectory.update({
        where: { id },
        data: { name: result.data.name, data: json(result.data) },
      });
      await this.audit(tx, org, actor, "DIRECTORY_UPDATED", id, {
        previous: previous.data,
        next: row.data,
      });
      return row;
    });
  }
  private async verifyParties(
    tx: Tx,
    org: string,
    data: ReturnType<typeof exporterOrderSchema.parse>,
  ) {
    const customer = await tx.exporterDirectory.findFirst({
      where: { id: data.customerId, organizationId: org, kind: "customers" },
    });
    const supplier = await tx.exporterDirectory.findFirst({
      where: { id: data.supplierId, organizationId: org, kind: "suppliers" },
    });
    const ids = [...new Set(data.lines.map((l) => l.productId))];
    const products = await tx.exporterDirectory.count({
      where: { organizationId: org, kind: "products", id: { in: ids } },
    });
    if (!customer || !supplier || products !== ids.length)
      throw new BadRequestException(
        "Select exporter directory records from this organization",
      );
    return { customer: customer.data, supplier: supplier.data };
  }
  @Post("orders") async createOrder(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Body() body: { data?: unknown; sample?: unknown },
  ) {
    await this.authorize(org, actor);
    const data = parse(exporterOrderSchema, body?.data);
    return this.db.$transaction(async (tx) => {
      const parties = await this.verifyParties(tx, org, data);
      const row = await tx.exporterOrder.create({
        data: {
          organizationId: org,
          number: await this.number(tx, org, "ORDER"),
          data: json(data),
          parties: json(parties),
          sample: body.sample === true,
        },
      });
      await this.audit(tx, org, actor, "ORDER_CREATED", row.id, data);
      return row;
    });
  }
  @Patch("orders/:id") async updateOrder(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    await this.authorize(org, actor);
    const data = parse(exporterOrderSchema, body);
    return this.db.$transaction(async (tx) => {
      const old = await this.order(tx, org, id, true);
      const parties = await this.verifyParties(tx, org, data);
      const payments = old.payments.map((p) =>
        exporterPaymentSchema.parse(p.data),
      );
      const totals = exportTotals(data, payments);
      if (
        payments.length &&
        (data.currency !== exporterOrderSchema.parse(old.data).currency ||
          totals.paid > totals.total)
      )
        throw new BadRequestException(
          "Cannot change payment currency or reduce total below received payments",
        );
      const row = await tx.exporterOrder.update({
        where: { id },
        data: { data: json(data), parties: json(parties) },
      });
      await this.audit(tx, org, actor, "ORDER_UPDATED", id, {
        previous: old.data,
        next: data,
      });
      return row;
    });
  }
  @Post("orders/:id/payments") async payment(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    await this.authorize(org, actor);
    const data = parse(exporterPaymentSchema, body);
    return this.db.$transaction(async (tx) => {
      const row = await this.order(tx, org, id, true);
      const order = exporterOrderSchema.parse(row.data);
      const totals = exportTotals(order, [
        ...row.payments.map((p) => exporterPaymentSchema.parse(p.data)),
        data,
      ]);
      if (
        (data.currency === order.currency && data.rateToOrderCurrency !== 1) ||
        totals.paid > totals.total
      )
        throw new BadRequestException(
          "Invalid exchange rate or payment exceeds amount due",
        );
      const payment = await tx.exporterPayment.create({
        data: { organizationId: org, orderId: id, data: json(data) },
      });
      await this.audit(tx, org, actor, "PAYMENT_RECORDED", id, {
        paymentId: payment.id,
        data,
      });
      return payment;
    });
  }
  @Post("orders/:id/documents/:kind") async document(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
    @Param("kind") kind: string,
    @Body() body: { paymentId?: string },
  ) {
    await this.authorize(org, actor);
    if (!(exporterDocumentKinds as readonly string[]).includes(kind))
      throw new BadRequestException("Unsupported document type");
    return this.db.$transaction(async (tx) => {
      const row = await this.order(tx, org, id, true);
      const order = exporterOrderSchema.parse(row.data);
      const parties = row.parties as unknown as {
        customer: Prisma.JsonValue;
        supplier: Prisma.JsonValue;
      };
      const profile = await tx.exporterProfile.findUnique({
        where: { organizationId: org },
      });
      if (!profile)
        throw new BadRequestException(
          "Configure your exporter company profile first",
        );
      const payment = row.payments.find((p) => p.id === body?.paymentId);
      if (kind === "RECEIPT" && !payment)
        throw new BadRequestException("Select a recorded payment");
      if (
        kind === "CI" &&
        order.lines.some(
          (l) =>
            !l.hsCode ||
            !l.origin ||
            (!row.sample && !/^\d{6,10}$/.test(l.hsCode)),
        )
      )
        throw new BadRequestException(
          "Provide confirmed HS codes and country of origin for every commercial invoice line",
        );
      if (
        kind === "PL" &&
        order.lines.some(
          (l) =>
            !l.packages ||
            !l.packageType ||
            !l.dimensions ||
            !l.grossWeight ||
            !l.cbm,
        )
      )
        throw new BadRequestException(
          "Provide package counts, types, dimensions, gross weight and CBM before issuing a packing list",
        );
      const totals = exportTotals(
        order,
        row.payments.map((p) => exporterPaymentSchema.parse(p.data)),
      );
      const snapshot = {
        order,
        ...parties,
        exporter: profile.data,
        orderNumber: row.number,
        sample: row.sample,
        totals,
        payment: payment?.data ?? null,
      };
      const doc = await tx.exporterDocument.create({
        data: {
          organizationId: org,
          orderId: id,
          kind,
          number: await this.number(tx, org, kind),
          snapshot: json(snapshot),
        },
      });
      await this.audit(tx, org, actor, "DOCUMENT_ISSUED", id, {
        documentId: doc.id,
        number: doc.number,
        kind,
      });
      return doc;
    });
  }
  @Post("orders/:id/attachments") async attachment(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
    @Body()
    body: {
      category?: string;
      filename?: string;
      contentType?: string;
      base64?: string;
    },
  ) {
    await this.authorize(org, actor);
    const { category, filename, contentType, base64 } = body ?? {};
    if (
      typeof category !== "string" ||
      typeof filename !== "string" ||
      typeof contentType !== "string" ||
      typeof base64 !== "string" ||
      !category ||
      !(exporterAttachmentKinds as readonly string[]).includes(category) ||
      !filename ||
      !/^[^/\\\x00-\x1f]{1,180}$/.test(filename) ||
      !base64 ||
      base64.length > 14_000_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) ||
      !contentType ||
      !["application/pdf", "image/png", "image/jpeg"].includes(contentType)
    )
      throw new BadRequestException("Upload a PDF, PNG or JPEG up to 10 MB");
    const content = Buffer.from(base64, "base64");
    if (
      content.length > 10_000_000 ||
      (contentType === "application/pdf" &&
        content.subarray(0, 5).toString() !== "%PDF-") ||
      (contentType === "image/png" &&
        content.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") ||
      (contentType === "image/jpeg" &&
        content.subarray(0, 3).toString("hex") !== "ffd8ff")
    )
      throw new BadRequestException("Invalid attachment content");
    return this.db.$transaction(async (tx) => {
      await this.order(tx, org, id, true);
      const row = await tx.exporterAttachment.create({
        data: {
          organizationId: org,
          orderId: id,
          category,
          filename,
          contentType,
          content,
        },
        select: attachmentSelect,
      });
      await this.audit(tx, org, actor, "ATTACHMENT_ADDED", id, row);
      return row;
    });
  }
  @Get("orders/:id/attachments/:attachmentId") async file(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    await this.authorize(org, actor);
    const row = await this.db.exporterAttachment.findFirst({
      where: { organizationId: org, orderId: id, id: attachmentId },
    });
    if (!row) throw new NotFoundException();
    return {
      filename: row.filename,
      contentType: row.contentType,
      base64: Buffer.from(row.content).toString("base64"),
    };
  }
  @Get("orders/:id/history") async history(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
  ) {
    await this.authorize(org, actor);
    await this.order(this.db, org, id);
    return this.db.exporterAudit.findMany({
      where: { organizationId: org, recordId: id },
      orderBy: { createdAt: "desc" },
    });
  }
  @Post("orders/:id/complete") async complete(
    @Headers(TENANT_HEADER) org: string,
    @Req() actor: Actor,
    @Param("id") id: string,
  ) {
    await this.authorize(org, actor);
    return this.db.$transaction(async (tx) => {
      const row = await this.order(tx, org, id, true);
      const data = exporterOrderSchema.parse(row.data);
      const issues = exportCompletionIssues(
        data,
        row.payments.map((p) => exporterPaymentSchema.parse(p.data)),
        exportCurrentDocumentKinds(data, row.documents),
        row.attachments.map((a) => a.category),
      );
      if (issues.length)
        throw new BadRequestException(`Incomplete: ${issues.join(", ")}`);
      const result = await tx.exporterOrder.update({
        where: { id },
        data: { completedAt: new Date() },
      });
      const profile = await tx.exporterProfile.findUnique({
        where: { organizationId: org },
      });
      if (!profile) throw new BadRequestException("Exporter profile required");
      const parties = row.parties as unknown as {
        customer: Prisma.JsonValue;
        supplier: Prisma.JsonValue;
      };
      const summary = await tx.exporterDocument.create({
        data: {
          organizationId: org,
          orderId: id,
          kind: "SUMMARY",
          number: await this.number(tx, org, "SUMMARY"),
          snapshot: json({
            order: data,
            ...parties,
            exporter: profile.data,
            orderNumber: row.number,
            sample: row.sample,
            totals: exportTotals(
              data,
              row.payments.map((p) => exporterPaymentSchema.parse(p.data)),
            ),
            payment: null,
            completedAt: result.completedAt,
          }),
        },
      });
      await this.audit(tx, org, actor, "DOCUMENT_ISSUED", id, {
        documentId: summary.id,
        number: summary.number,
        kind: "SUMMARY",
      });
      await this.audit(tx, org, actor, "ORDER_COMPLETED", id, {});
      return result;
    });
  }
}

@Module({ controllers: [ExporterController], providers: [TenantMemberGuard] })
export class ExporterModule {}
