import { Controller, Get, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { UpdateExpenseCostsDto } from './dto/expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TENANT_HEADER } from '@flowbooks/shared';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.expensesService.findAll(orgId, page, limit);
  }

  @Get(':id')
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string) {
    return this.expensesService.findOne(orgId, id);
  }

  @Patch(':id')
  updateCosts(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCostsDto,
  ) {
    return this.expensesService.updateCosts(orgId, id, dto);
  }
}
