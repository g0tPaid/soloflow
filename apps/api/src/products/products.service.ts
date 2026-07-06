import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { organizationId, isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { organizationId, isActive: true } }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, organizationId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: { ...dto, organizationId },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(organizationId, id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
