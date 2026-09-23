import { Injectable } from '@nestjs/common';
import { Prisma } from '@flowbooks/database';
import {
  WORKSPACE_SEARCH_RESULT_LIMIT,
  normalizeWorkspaceSearchQuery,
  workspaceSearchHref,
  workspaceSearchSubtitle,
} from '@flowbooks/shared';
import { PrismaService } from '../prisma/prisma.service';

function contains(query: string): Prisma.StringFilter {
  return { contains: query, mode: 'insensitive' };
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(organizationId: string | undefined, rawQuery?: unknown) {
    const query = normalizeWorkspaceSearchQuery(rawQuery);
    if (!organizationId || !query) {
      return { query: query ?? '', customers: [], invoices: [] };
    }

    const [customers, invoices] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          organizationId,
          isActive: true,
          OR: [{ name: contains(query) }, { email: contains(query) }, { phone: contains(query) }],
        },
        take: WORKSPACE_SEARCH_RESULT_LIMIT,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, email: true, phone: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          organizationId,
          OR: [
            { number: contains(query) },
            { customer: { name: contains(query) } },
            { customer: { email: contains(query) } },
          ],
        },
        take: WORKSPACE_SEARCH_RESULT_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          currency: true,
          customer: { select: { name: true } },
        },
      }),
    ]);

    return {
      query,
      customers: customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        subtitle: workspaceSearchSubtitle({
          kind: 'customer',
          email: customer.email,
          phone: customer.phone,
        }),
        href: workspaceSearchHref('customer', customer.id),
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        customerName: invoice.customer?.name ?? null,
        total: Number(invoice.total),
        currency: invoice.currency,
        subtitle: workspaceSearchSubtitle({
          kind: 'invoice',
          customerName: invoice.customer?.name,
          status: invoice.status,
        }),
        href: workspaceSearchHref('invoice', invoice.id),
      })),
    };
  }
}
