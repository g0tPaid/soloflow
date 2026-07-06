import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoicesService.findAll(orgId, page, limit);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(orgId, id);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(orgId, id, dto);
  }
}
