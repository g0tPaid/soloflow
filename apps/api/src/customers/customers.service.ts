import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@flowbooks/database';
import { BALANCE_EXCLUDED_STATUSES, balanceGroupsFromSums } from '@flowbooks/shared';
import { newPortalLink } from './dropship-portal-token';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { normalizePagination } from '../common/pagination';
import { salesInvoiceWhere } from '../invoices/sales-invoice-where';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { organizationId, isActive: true },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where: { organizationId, isActive: true } }),
    ]);
    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Everything this customer still owes, grouped by currency, plus their quotes.
   * Cancelled, void, and draft invoices are not money due. Quotes are listed
   * separately and are not added into the balance.
   */
  async activity(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const invoiceWhere = {
      ...salesInvoiceWhere(organizationId),
      customerId: id,
      status: { notIn: [...BALANCE_EXCLUDED_STATUSES] as InvoiceStatus[] },
    };
    const [groups, quotes, quoteCount] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['currency'],
        where: invoiceWhere,
        _sum: { total: true, amountPaid: true },
        _count: { _all: true },
      }),
      this.prisma.quote.findMany({
        where: { organizationId, customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          currency: true,
          validUntil: true,
          issueDate: true,
        },
      }),
      this.prisma.quote.count({ where: { organizationId, customerId: id } }),
    ]);

    return {
      balances: balanceGroupsFromSums(
        groups.map((group) => ({
          currency: group.currency,
          total: group._sum.total,
          amountPaid: group._sum.amountPaid,
          count: group._count._all,
        })),
      ),
      quotes,
      quoteCount,
    };
  }

  async findOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async suggestDropshipperNumber(organizationId: string) {
    const assigned = await this.prisma.customer.findMany({
      where: { organizationId, dropshipperNumber: { not: null } },
      select: { dropshipperNumber: true },
    });
    const numbers = new Set(assigned.map((customer) => customer.dropshipperNumber));
    for (let index = 1; index <= 10000; index++) {
      const candidate = String(index % 10000).padStart(4, '0');
      if (!numbers.has(candidate)) return { number: candidate };
    }
    return { number: null };
  }

  private requireDropshipperNumber(number: string | null | undefined) {
    if (!number || !/^[0-9]{4}$/.test(number)) {
      throw new BadRequestException('Enter a four-digit dropshipper number.');
    }
  }

  private rethrowCustomerError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('That dropshipper number is already in use in your organization.');
    }
    throw error;
  }

  async create(organizationId: string, dto: CreateCustomerDto) {
    const { dropshipperNumber, dropshipperPrefix, ...fields } = dto;
    if (dto.isDropshipper) this.requireDropshipperNumber(dropshipperNumber);
    const { linkNonce, tokenHash } = dto.isDropshipper ? newPortalLink() : {};
    try {
      return await this.prisma.customer.create({
        data: {
          ...fields,
          organizationId,
          address: dto.address || {},
          isDropshipper: dto.isDropshipper === true,
          ...(linkNonce && tokenHash ? { dropshipPortal: { create: { linkNonce, tokenHash } } } : {}),
          dropshipperNumber: dto.isDropshipper ? dropshipperNumber : null,
          dropshipperPrefix: dto.isDropshipper ? dropshipperPrefix?.toUpperCase() || null : null,
        },
      });
    } catch (error) {
      this.rethrowCustomerError(error);
    }
  }

  async update(organizationId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(organizationId, id);
    const { dropshipperNumber, dropshipperPrefix, ...fields } = dto;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const result = await tx.$queryRaw<{
          isDropshipper: boolean;
          dropshipperNumber: string | null;
        }[]>`SELECT "isDropshipper", "dropshipperNumber" FROM "customers"
          WHERE "id" = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
        const existing = result[0];
        if (!existing) throw new NotFoundException('Customer not found');
        const isDropshipper = dto.isDropshipper ?? existing.isDropshipper;
        const number = dropshipperNumber ?? existing.dropshipperNumber;
        if (isDropshipper) this.requireDropshipperNumber(number);
        const customer = await tx.customer.update({
          where: { id },
          data: {
            ...fields,
            isDropshipper,
            dropshipperNumber: isDropshipper ? number : undefined,
            dropshipperPrefix: isDropshipper && dropshipperPrefix !== undefined
              ? dropshipperPrefix?.toUpperCase() || null : undefined,
          },
        });
        // A classification change changes the visible order scope; revoke the old link.
        // Normal customer edits (including an unchanged false checkbox) retain the existing link.
        if (existing.isDropshipper && !isDropshipper) await tx.dropshipPortal.deleteMany({ where: { customerId: id } });
        if (isDropshipper && !existing.isDropshipper) {
          const { linkNonce, tokenHash } = newPortalLink();
          await tx.dropshipPortal.upsert({ where: { customerId: id }, create: { customerId: id, linkNonce, tokenHash }, update: { linkNonce, tokenHash, createdAt: new Date() } });
        }
        return customer;
      });
    } catch (error) {
      this.rethrowCustomerError(error);
    }
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.update({ where: { id }, data: { isActive: false } });
      await tx.dropshipPortal.deleteMany({ where: { customerId: id } });
      return customer;
    });
  }
}
