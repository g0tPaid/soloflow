import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class VendorsController {
  constructor(private vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List vendors' })
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.vendorsService.findAll(orgId, page, limit);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.vendorsService.findOne(orgId, id);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.vendorsService.remove(orgId, id);
  }
}
