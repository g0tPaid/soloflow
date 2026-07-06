import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll(orgId, page, limit);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.productsService.remove(orgId, id);
  }
}
