import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { normalizePagination } from '../common/pagination';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page?: number, limit?: number) {
    const { page: pageNum, limit: limitNum, skip } = normalizePagination(page, limit);
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where: { organizationId, isActive: true },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vendor.count({ where: { organizationId, isActive: true } }),
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
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, organizationId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  async create(organizationId: string, dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: { ...dto, organizationId, address: dto.address || {} },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateVendorDto) {
    await this.findOne(organizationId, id);
    return this.prisma.vendor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
