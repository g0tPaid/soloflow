import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@flowbooks/database';
import { BALANCE_EXCLUDED_STATUSES, balanceGroupsFromSums } from '@flowbooks/shared';
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

  async create(organizationId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...dto, organizationId, address: dto.address || {} },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(organizationId, id);
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
