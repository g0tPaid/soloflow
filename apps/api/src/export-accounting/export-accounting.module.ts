import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, Module, Put, Req, UseGuards } from '@nestjs/common';
import { TENANT_HEADER } from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantMemberGuard } from '../common/tenant-member.guard';

type Actor = { user: { sub: string } };
type Snapshot = { revision: number; data: unknown };
const empty = () => ({ entries: [], customers: [], suppliers: [], products: [], deals: [], roadmap: [], gates: [], defaultRate: 7.15 });
const categories = ['self_export','entrusted_export','vat_refund','procurement','customs_freight','operating'];
const currencies = ['CNY','USD','EUR','GBP','AED'];

function validate(data: unknown) {
  const bad = () => { throw new BadRequestException('Invalid or oversized Module 2 workspace'); };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return bad();
  const d = data as Record<string, unknown>;
  const keys = ['entries','customers','suppliers','products','deals','roadmap','gates','defaultRate'];
  if (Object.keys(d).some(k => !keys.includes(k)) || JSON.stringify(d).length > 2_000_000) return bad();
  const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1e12;
  const text = (v: unknown, max = 2000) => typeof v === 'string' && v.length <= max;
  if (!positive(d.defaultRate)) return bad();
  for (const k of ['entries','customers','suppliers','products','deals']) {
    const list = d[k];
    if (!Array.isArray(list) || list.length > 5000) return bad();
    const ids = new Set<string>();
    for (const item of list) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !text(item.id, 80) || !item.id || ids.has(item.id)) return bad();
      ids.add(item.id);
      if (Object.keys(item).length > 50 || Object.values(item).some(v => !(text(v) || (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12) || typeof v === 'boolean'))) return bad();
      if (k === 'entries' && (!categories.includes(item.category) || !currencies.includes(item.currency) || !positive(item.amount) || !positive(item.rate) || (item.currency === 'CNY' && item.rate !== 1) || !text(item.description) || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))) return bad();
      if (['customers','suppliers','products'].includes(k) && (!text(item.name) || !item.name.trim())) return bad();
      if (k === 'deals' && (!Number.isInteger(item.step) || item.step < 1 || item.step > 6 || !text(item.number, 80))) return bad();
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

