import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { normalizePagination } from '../common/pagination';

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
