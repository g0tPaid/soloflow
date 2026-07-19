import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quotesService.findAll(orgId, page, limit);
  }

  @Get('next-number')
  nextNumber(@Headers(TENANT_HEADER) orgId: string) {
    return this.quotesService.getNextNumber(orgId);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.quotesService.findOne(orgId, id);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(orgId, id, dto);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convert quote into a draft invoice' })
  convert(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.quotesService.convertToInvoice(orgId, id);
  }
}
