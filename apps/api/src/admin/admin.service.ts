import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceStatus } from '@flowbooks/database';
import { normalizePagination } from '../common/pagination';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

function groupByDay<T extends { createdAt: Date }>(rows: T[], days = 30) {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = daysAgo(i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const today = startOfDay(new Date());
    const since30 = daysAgo(29);

    const [
      totalUsers,
      newUsersToday,
      activeUsersToday,
      totalCompanies,
      totalInvoices,
      totalCustomers,
      totalProducts,
      totalReceipts,
      latestSignups,
      latestInvoices,
      latestExpenses,
      latestReceipts,
      usersForChart,
      invoicesForChart,
      expensesForChart,
      revenueAgg,
      expenseAgg,
      outstandingAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.user.count({
        where: { OR: [{ lastActiveAt: { gte: today } }, { updatedAt: { gte: today } }] },
      }),
      this.prisma.organization.count(),
      this.prisma.invoice.count(),
      this.prisma.customer.count(),
      this.prisma.product.count(),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          memberships: {
            take: 1,
            orderBy: { joinedAt: 'asc' },
            include: { organization: { select: { name: true } } },
          },
        },
      }),
      this.prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          organization: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          organization: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.PAID },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: {
          organization: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since30 } },
        select: { createdAt: true },
      }),
      this.prisma.invoice.findMany({
        where: { createdAt: { gte: since30 } },
        select: { createdAt: true },
      }),
      this.prisma.invoice.findMany({
        where: { createdAt: { gte: since30 }, totalCost: { gt: 0 } },
        select: { createdAt: true },
      }),
      this.prisma.invoice.aggregate({ _sum: { total: true } }),
      this.prisma.invoice.aggregate({ _sum: { totalCost: true } }),
      this.prisma.invoice.aggregate({
        where: {
          status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
        },
        _sum: { total: true },
      }),
    ]);

    const totalInvoiceAmount = Number(revenueAgg._sum.total ?? 0);
    const totalExpenseAmount = Number(expenseAgg._sum.totalCost ?? 0);

    return {
      totals: {
        users: totalUsers,
        newUsersToday,
        activeUsersToday,
        companies: totalCompanies,
        invoices: totalInvoices,
        expenses: totalInvoices,
        receipts: totalReceipts,
        customers: totalCustomers,
        products: totalProducts,
        totalInvoiceAmount,
        totalExpenseAmount,
        outstandingAmount: Number(outstandingAgg._sum.total ?? 0),
        profit: totalInvoiceAmount - totalExpenseAmount,
      },
      latest: {
        signups: latestSignups.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          company: u.memberships[0]?.organization.name ?? '—',
          createdAt: u.createdAt,
        })),
        invoices: latestInvoices.map((i) => this.mapInvoiceRow(i)),
        expenses: latestExpenses.map((i) => this.mapExpenseRow(i)),
        receipts: latestReceipts.map((i) => this.mapReceiptRow(i)),
      },
      charts: {
        userRegistrations: groupByDay(usersForChart),
        invoicesCreated: groupByDay(invoicesForChart),
        expensesCreated: groupByDay(expensesForChart),
      },
    };
  }

  async listUsers(page?: number, limit?: number, search?: string) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          lastActiveAt: true,
          updatedAt: true,
          suspendedAt: true,
          isSuperAdmin: true,
          memberships: {
            take: 1,
            orderBy: { joinedAt: 'asc' },
            include: { organization: { select: { name: true } } },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name ?? '—',
        email: u.email,
        company: u.memberships[0]?.organization.name ?? '—',
        joinedDate: u.createdAt,
        lastActive: u.lastActiveAt ?? u.updatedAt,
        status: u.suspendedAt ? 'suspended' : 'active',
        isSuperAdmin: u.isSuperAdmin,
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        lastActiveAt: true,
        updatedAt: true,
        suspendedAt: true,
        isSuperAdmin: true,
        memberships: {
          include: {
            organization: {
              include: { settings: true },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const orgIds = user.memberships.map((m) => m.organizationId);

    const [customerCount, productCount, invoiceCount, receiptCount, invoices, customers, products, metrics, outstanding] =
      await Promise.all([
        this.prisma.customer.count({ where: { organizationId: { in: orgIds } } }),
        this.prisma.product.count({ where: { organizationId: { in: orgIds } } }),
        this.prisma.invoice.count({ where: { organizationId: { in: orgIds } } }),
        this.prisma.invoice.count({
          where: { organizationId: { in: orgIds }, status: InvoiceStatus.PAID },
        }),
        this.prisma.invoice.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            organization: { select: { name: true } },
            customer: { select: { name: true } },
          },
        }),
        this.prisma.customer.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { organization: { select: { name: true } } },
        }),
        this.prisma.product.findMany({
          where: { organizationId: { in: orgIds } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { organization: { select: { name: true } } },
        }),
        this.prisma.invoice.aggregate({
          where: { organizationId: { in: orgIds } },
          _sum: { total: true, totalCost: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            organizationId: { in: orgIds },
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] },
          },
          _sum: { total: true },
        }),
      ]);

    const totalRevenue = Number(metrics._sum.total ?? 0);
    const totalExpense = Number(metrics._sum.totalCost ?? 0);
    const primaryOrg = user.memberships[0]?.organization;
    const branding = (primaryOrg?.settings?.branding ?? {}) as Record<string, string>;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        lastActive: user.lastActiveAt ?? user.updatedAt,
        status: user.suspendedAt ? 'suspended' : 'active',
        isSuperAdmin: user.isSuperAdmin,
      },
      company: primaryOrg
        ? {
            id: primaryOrg.id,
            name: primaryOrg.name,
            address: branding.address ?? null,
            phone: branding.phone ?? null,
            email: branding.email ?? null,
            currency: primaryOrg.settings?.currency ?? 'USD',
          }
        : null,
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        currency: m.organization.settings?.currency ?? 'USD',
        createdAt: m.organization.createdAt,
      })),
      statistics: {
        customers: customerCount,
        products: productCount,
        invoices: invoiceCount,
        expenses: invoiceCount,
        receipts: receiptCount,
        revenue: totalRevenue,
        totalInvoiceAmount: totalRevenue,
        totalExpenseAmount: totalExpense,
        outstandingAmount: Number(outstanding._sum.total ?? 0),
        profit: totalRevenue - totalExpense,
      },
      recent: {
        invoices: invoices.map((i) => this.mapInvoiceRow(i)),
        expenses: invoices.map((i) => this.mapExpenseRow(i)),
        receipts: invoices
          .filter((i) => i.status === InvoiceStatus.PAID)
          .map((i) => this.mapReceiptRow(i)),
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          company: c.organization.name,
          email: c.email,
          phone: c.phone,
          createdAt: c.createdAt,
        })),
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          company: p.organization.name,
          price: Number(p.unitPrice),
          currency: p.currency,
          createdAt: p.createdAt,
        })),
      },
    };
  }

  async suspendUser(userId: string, actorId: string) {
    if (userId === actorId) throw new BadRequestException('Cannot suspend your own account');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin) throw new ForbiddenException('Cannot suspend a super admin');
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: new Date() },
      select: { id: true, suspendedAt: true },
    });
  }

  async activateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null },
      select: { id: true, suspendedAt: true },
    });
  }

  async deleteUser(userId: string, actorId: string) {
    if (userId === actorId) throw new BadRequestException('Cannot delete your own account');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin) throw new ForbiddenException('Cannot delete a super admin');
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  async listInvoices(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = {};

    if (params.status) where.status = params.status;
    if (params.from || params.to) {
      where.issueDate = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }
    if (params.userId) {
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId: params.userId },
        select: { organizationId: true },
      });
      where.organizationId = { in: memberships.map((m) => m.organizationId) };
    }
    if (params.search) {
      where.OR = [
        { number: { contains: params.search, mode: 'insensitive' } },
        { customer: { name: { contains: params.search, mode: 'insensitive' } } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { name: true } },
          customer: { select: { name: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: rows.map((i) => this.mapInvoiceRow(i)),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async listExpenses(params: { page?: number; limit?: number; search?: string }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { number: { contains: params.search, mode: 'insensitive' } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              name: true,
              members: { take: 1, include: { user: { select: { name: true, email: true } } } },
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: rows.map((i) => this.mapExpenseRow(i)),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async listReceipts(params: { page?: number; limit?: number; search?: string }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = { status: InvoiceStatus.PAID };
    if (params.search) {
      where.OR = [
        { number: { contains: params.search, mode: 'insensitive' } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          organization: {
            select: {
              name: true,
              logo: true,
              members: { take: 1, include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          items: { take: 1, select: { imageUrl: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: rows.map((i) => this.mapReceiptRow(i)),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async listCustomers(params: { page?: number; limit?: number; search?: string }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              name: true,
              members: { take: 1, include: { user: { select: { name: true, email: true } } } },
            },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: rows.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.organization.name,
        user: c.organization.members[0]?.user.name ?? c.organization.members[0]?.user.email ?? '—',
        phone: c.phone,
        email: c.email,
        createdAt: c.createdAt,
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async listProducts(params: { page?: number; limit?: number; search?: string }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { organization: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              name: true,
              members: { take: 1, include: { user: { select: { name: true, email: true } } } },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: rows.map((p) => ({
        id: p.id,
        name: p.name,
        company: p.organization.name,
        price: Number(p.unitPrice),
        currency: p.currency,
        user: p.organization.members[0]?.user.name ?? p.organization.members[0]?.user.email ?? '—',
        createdAt: p.createdAt,
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async listCompanies(params: { page?: number; limit?: number; search?: string }) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(params.page, params.limit);
    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [{ name: { contains: params.search, mode: 'insensitive' } }];
    }

    const [rows, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          settings: { select: { currency: true } },
          members: {
            where: { role: 'OWNER' },
            take: 1,
            include: { user: { select: { name: true, email: true } } },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: rows.map((o) => ({
        id: o.id,
        name: o.name,
        owner: o.members[0]?.user.name ?? '—',
        email: o.members[0]?.user.email ?? '—',
        createdDate: o.createdAt,
        currency: o.settings?.currency ?? 'USD',
      })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async globalSearch(query: string) {
    const q = query.trim();
    if (!q) {
      return { users: [], companies: [], invoices: [], expenses: [], customers: [], products: [] };
    }

    const [users, companies, invoices, customers, products] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 8,
        select: { id: true, name: true, email: true },
      }),
      this.prisma.organization.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 8,
        select: { id: true, name: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          OR: [
            { number: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 8,
        include: { organization: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      this.prisma.customer.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 8,
        include: { organization: { select: { name: true } } },
      }),
      this.prisma.product.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        take: 8,
        include: { organization: { select: { name: true } } },
      }),
    ]);

    return {
      users: users.map((u) => ({ id: u.id, label: u.name ?? u.email, sub: u.email, href: `/admin/users/${u.id}` })),
      companies: companies.map((c) => ({
        id: c.id,
        label: c.name,
        sub: 'Company',
        href: `/admin/companies?q=${encodeURIComponent(c.name)}`,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        label: i.number,
        sub: `${i.organization.name} · ${i.customer.name}`,
        href: `/admin/invoices?q=${encodeURIComponent(i.number)}`,
      })),
      expenses: invoices.map((i) => ({
        id: i.id,
        label: i.number,
        sub: `Expense · ${i.organization.name}`,
        href: `/admin/expenses?q=${encodeURIComponent(i.number)}`,
      })),
      customers: customers.map((c) => ({
        id: c.id,
        label: c.name,
        sub: c.organization.name,
        href: `/admin/customers?q=${encodeURIComponent(c.name)}`,
      })),
      products: products.map((p) => ({
        id: p.id,
        label: p.name,
        sub: p.organization.name,
        href: `/admin/products?q=${encodeURIComponent(p.name)}`,
      })),
    };
  }

  private mapInvoiceRow(i: {
    id: string;
    number: string;
    status: string;
    total: unknown;
    currency: string;
    issueDate: Date;
    createdAt: Date;
    organization: { name: string };
    customer: { name: string };
  }) {
    return {
      id: i.id,
      number: i.number,
      company: i.organization.name,
      customer: i.customer.name,
      amount: Number(i.total),
      currency: i.currency,
      status: i.status,
      date: i.issueDate,
      createdAt: i.createdAt,
    };
  }

  private mapExpenseRow(i: {
    id: string;
    number: string;
    totalCost: unknown;
    currency: string;
    shippingMethod?: string | null;
    createdAt: Date;
    organization: { name: string; members?: { user: { name: string | null; email: string } }[] };
  }) {
    return {
      id: i.id,
      user: i.organization.members?.[0]?.user.name ?? i.organization.members?.[0]?.user.email ?? '—',
      category: i.shippingMethod ? `Shipping (${i.shippingMethod})` : 'Invoice costs',
      amount: Number(i.totalCost),
      currency: i.currency,
      date: i.createdAt,
      company: i.organization.name,
      number: i.number,
    };
  }

  private mapReceiptRow(i: {
    id: string;
    number: string;
    updatedAt: Date;
    createdAt: Date;
    organization: {
      name: string;
      logo?: string | null;
      members?: { user: { id: string; name: string | null; email: string } }[];
    };
    items?: { imageUrl: string | null }[];
  }) {
    const imageUrl = i.items?.[0]?.imageUrl ?? i.organization.logo ?? null;
    return {
      id: i.id,
      number: i.number,
      imageUrl,
      user: i.organization.members?.[0]?.user.name ?? i.organization.members?.[0]?.user.email ?? '—',
      userId: i.organization.members?.[0]?.user.id,
      company: i.organization.name,
      date: i.updatedAt,
      ocrStatus: 'not_available',
    };
  }
}

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub as string | undefined;
    if (!userId) throw new ForbiddenException('Authentication required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, suspendedAt: true },
    });
    if (!user?.isSuperAdmin || user.suspendedAt) {
      throw new ForbiddenException('Super admin access required');
    }
    return true;
  }
}
