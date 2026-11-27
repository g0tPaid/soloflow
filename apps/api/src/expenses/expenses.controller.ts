import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseCostsDto, CreateOperatingExpenseDto } from './dto/expense.dto';
import { TenantMemberGuard } from '../common/tenant-member.guard';
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
    @Query('search') search?: string,
  ) {
    return this.expensesService.findAll(orgId, page, limit, search);
  }

  @Post()
  create(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(orgId, dto);
  }

  @Get('operating')
  listOperating(@Headers(TENANT_HEADER) orgId: string, @Query('page') page?: number, @Query('limit') limit?: number, @Query('category') category?: string, @Query('search') search?: string) {
    return this.expensesService.listOperating(orgId, page, limit, category, search);
  }

  @Post('operating')
  createOperating(@Headers(TENANT_HEADER) orgId: string, @Body() dto: CreateOperatingExpenseDto) {
    return this.expensesService.createOperating(orgId, dto);
  }

  @Patch('operating/:id')
  @UseGuards(TenantMemberGuard)
  updateOperating(@Headers(TENANT_HEADER) orgId: string, @Param('id') id: string, @Body() dto: CreateOperatingExpenseDto) {
    return this.expensesService.updateOperating(orgId, id, dto);
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
