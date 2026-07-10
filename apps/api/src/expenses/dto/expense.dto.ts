import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExpenseLineItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCostCny?: number;
}

export class UpdateExpenseCostsDto {
  @ApiProperty({ type: [ExpenseLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseLineItemDto)
  items!: ExpenseLineItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCostCny?: number;
}

export class CreateExpenseItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ description: 'Cost each in org cost-entry currency', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCostCny?: number;
}

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  customerId!: string;

  @ApiProperty({ description: 'Original invoice number from outside the app' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  number!: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  issueDate!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Shipping charged to customer (sale currency)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  @ApiProperty({ required: false, description: 'Actual shipping cost in org cost currency' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCostCny?: number;

  @ApiProperty({ required: false, enum: ['AIR', 'SEA'] })
  @IsOptional()
  @IsIn(['AIR', 'SEA'])
  shippingMethod?: 'AIR' | 'SEA';

  @ApiProperty({ required: false, enum: ['DDP', 'LCL'] })
  @IsOptional()
  @IsIn(['DDP', 'LCL'])
  shippingTerms?: 'DDP' | 'LCL';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingFromCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingToCountry?: string;

  @ApiProperty({ type: [CreateExpenseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items!: CreateExpenseItemDto[];
}
