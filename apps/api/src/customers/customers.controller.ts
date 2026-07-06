import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers' })
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findAll(orgId, page, limit);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.customersService.findOne(orgId, id);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(orgId, dto);
  }

  @Patch(':id')
  update(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.customersService.remove(orgId, id);
  }
}
