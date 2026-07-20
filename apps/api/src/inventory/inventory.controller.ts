import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TENANT_HEADER } from '@flowbooks/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { AdjustStockDto, UpdateInventoryItemDto } from './dto/inventory.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiHeader({ name: TENANT_HEADER, required: true })
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Inventory summary cards' })
  summary(@Headers(TENANT_HEADER) orgId: string) {
    return this.inventoryService.summary(orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory levels' })
  findAll(
    @Headers(TENANT_HEADER) orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('q') q?: string,
  ) {
    return this.inventoryService.findAll(orgId, {
      page,
      limit,
      lowStockOnly: lowStockOnly === 'true' || lowStockOnly === '1',
      q,
    });
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Product inventory detail + recent movements' })
  findOne(@Headers(TENANT_HEADER) orgId: string, @Param('productId') productId: string) {
    return this.inventoryService.findOne(orgId, productId);
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Update inventory settings for a product' })
  updateItem(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.updateItem(orgId, productId, dto);
  }

  @Post(':productId/adjust')
  @ApiOperation({ summary: 'Adjust on-hand quantity' })
  adjust(
    @Headers(TENANT_HEADER) orgId: string,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(orgId, productId, dto);
  }
}
