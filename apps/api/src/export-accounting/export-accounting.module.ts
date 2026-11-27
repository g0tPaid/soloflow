import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, Module, Put, Req, UseGuards } from '@nestjs/common';
import { TENANT_HEADER } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantMemberGuard } from '../common/tenant-member.guard';

type Actor = { user: { sub: string } };
type Snapshot = { revision: number; data: unknown };
const empty = () => ({ entries: [], customers: [], suppliers: [], products: [], deals: [], imports: [], roadmap: [], gates: [], defaultRate: 7.15 });
const categories = ['self_export','entrusted_export','vat_refund','procurement','customs_freight','operating'];
const currencies = ['CNY','USD','EUR','GBP','AED'];

function validate(data: unknown) {
  const bad = () => { throw new BadRequestException('Invalid or oversized Module 2 workspace'); };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return bad();
  const d = data as Record<string, unknown>;
  const keys = ['entries','customers','suppliers','products','deals','imports','roadmap','gates','defaultRate','profile'];
  if (Object.keys(d).some(k => !keys.includes(k)) || JSON.stringify(d).length > 2_000_000) return bad();
  const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1e12;
  const percentage = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
  const text = (v: unknown, max = 2000) => typeof v === 'string' && v.length <= max;
  if (!positive(d.defaultRate)) return bad();
  if (d.profile !== undefined && (!d.profile || typeof d.profile !== 'object' || Array.isArray(d.profile) || Object.keys(d.profile).length > 30 || Object.values(d.profile).some(v => !text(v)))) return bad();
  for (const k of ['entries','customers','suppliers','products','deals']) {
    const list = d[k];
    if (!Array.isArray(list) || list.length > 5000) return bad();
    const ids = new Set<string>();
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !text(item.id, 80) || !item.id || ids.has(item.id)) return bad();
      ids.add(item.id);
      if (Object.keys(item).length > 100 || Object.entries(item).some(([f,v]) => !(text(v, f === 'extraItems' && k === 'deals' ? 30_000 : 2000) || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12) || typeof v === 'boolean'))) return bad();
      if (k === 'deals' && item.extraItems !== undefined) {
        try {
          if (typeof item.extraItems !== 'string') return bad();
          const lines = JSON.parse(item.extraItems);
          if (!Array.isArray(lines) || lines.length > 30) return bad();
          const lineIds = new Set<string>();
          for (const line of lines) {
            if (!line || typeof line !== 'object' || Array.isArray(line) || !text(line.id, 80) || !line.id || lineIds.has(line.id)) return bad();
            lineIds.add(line.id);
            if (['description','model','hsCode','origin','unit'].some(f => !text(line[f], 500)) || ['qty','unitPrice','unitCost'].some(f => typeof line[f] !== 'number' || !Number.isFinite(line[f]) || line[f] < 0 || line[f] > 1e12)) return bad();
          }
        } catch { return bad(); }
      }
      if (k === 'entries' && (!categories.includes(item.category) || !currencies.includes(item.currency) || !positive(item.amount) || !positive(item.rate) || (item.currency === 'CNY' && item.rate !== 1) || !text(item.description) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))) return bad();
      if (['entries','suppliers','products','deals'].includes(k) && ['vatRate','refundRate'].some(f => item[f] !== undefined && !percentage(item[f]))) return bad();
      if (['customers','suppliers','products'].includes(k) && (!text(item.name) || !item.name.trim())) return bad();
      if (k === 'deals' && (!Number.isInteger(item.step) || item.step < 1 || item.step > 6 || !text(item.number, 80))) return bad();
    }
  }
  if (d.imports !== undefined) {
    if (!Array.isArray(d.imports) || d.imports.length > 5000) return bad();
    const ids = new Set<string>();
    const numeric = ['qty','unitCost','rate','freightCny','insuranceCny','dutyCny','importVatCny','otherCny','paidCny','receivedQty'];
    for (const item of d.imports) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !text(item.id,80) || !item.id || ids.has(item.id)) return bad();
      ids.add(item.id);
      if (Object.keys(item).length > 40 || Object.values(item).some(v => !(text(v) || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e12)))) return bad();
      if (!text(item.number,80) || !item.number || !text(item.date,10) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !text(item.supplier) || !item.supplier.trim() || !text(item.product) || !item.product.trim() || !currencies.includes(item.currency) || !['Draft','Ordered','In transit','Customs clearance','Received'].includes(item.status)) return bad();
      if (numeric.some(k => typeof item[k] !== 'number' || !Number.isFinite(item[k]) || item[k] < 0 || item[k] > 1e12) || !positive(item.qty) || !positive(item.unitCost) || !positive(item.rate) || (item.currency === 'CNY' && item.rate !== 1)) return bad();
      const landed = item.qty * item.unitCost * item.rate + item.freightCny + item.insuranceCny + item.dutyCny + item.importVatCny + item.otherCny;
      if (!Number.isFinite(landed) || landed > 1e12 || item.paidCny > landed || item.receivedQty > item.qty || (item.status === 'Received' && item.receivedQty !== item.qty)) return bad();
    }
  }
  for (const k of ['roadmap','gates']) { const list = d[k]; if (!Array.isArray(list) || list.length > 100 || list.some(v => !text(v, 100))) return bad(); }
  return d;
}

@Controller('export-accounting')
@UseGuards(JwtAuthGuard, TenantMemberGuard)
export class ExportAccountingController {
  constructor(private readonly db: PrismaService) {}
  private async authorize(org: string, actor: Actor) {
    const member = await this.db.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: org, userId: actor.user.sub } }, select: { role: true, user: { select: { suspendedAt: true } } } });
    if (!member || member.user?.suspendedAt || !['OWNER','ADMIN','ACCOUNTANT','MANAGER'].includes(member.role)) throw new ForbiddenException('Module 2 access restricted to owners, administrators, managers and accountants');
  }
  @Get('workspace') async get(@Headers(TENANT_HEADER) org: string, @Req() actor: Actor) {
    await this.authorize(org, actor);
    const rows = await this.db.$queryRaw<Snapshot[]>`SELECT revision, data FROM export_accounting_workspaces WHERE "organizationId" = ${org}`;
    return rows[0] ?? { revision: 0, data: empty() };
  }
  @Put('workspace') async save(@Headers(TENANT_HEADER) org: string, @Req() actor: Actor, @Body() body: { revision?: unknown; data?: unknown }) {
    await this.authorize(org, actor);
    if (typeof body?.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 0) throw new BadRequestException('Invalid workspace revision');
    const data = JSON.stringify(validate(body.data));
    const expected = body.revision;
    return this.db.$transaction(async tx => {
      const result = expected === 0
        ? await tx.$queryRaw<Snapshot[]>`INSERT INTO export_accounting_workspaces ("organizationId", revision, data) VALUES (${org}, 1, ${data}::jsonb) ON CONFLICT ("organizationId") DO NOTHING RETURNING revision, data`
        : await tx.$queryRaw<Snapshot[]>`UPDATE export_accounting_workspaces SET revision = revision + 1, data = ${data}::jsonb, "updatedAt" = CURRENT_TIMESTAMP WHERE "organizationId" = ${org} AND revision = ${expected} RETURNING revision, data`;
      if (!result.length) throw new ConflictException('Another staff member saved this workspace. Reload the latest version before saving again.');
      await tx.$executeRaw`INSERT INTO export_accounting_history ("organizationId", revision, "actorId", data) VALUES (${org}, ${result[0].revision}, ${actor.user.sub}, ${data}::jsonb)`;
      return result[0];
    });
  }
}

@Module({ controllers: [ExportAccountingController] })
export class ExportAccountingModule {}

