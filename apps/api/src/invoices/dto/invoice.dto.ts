import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsDateString, IsNotEmpty, IsIn, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsString()
  customerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiProperty({ required: false, description: 'VAT percent (5 = 5%). 0 = off.' })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ required: false, enum: ['AIR', 'SEA', 'LOCAL'] })
  @IsOptional()
  @IsIn(['AIR', 'SEA', 'LOCAL'])
  shippingMethod?: 'AIR' | 'SEA' | 'LOCAL';

  @ApiProperty({ required: false, enum: ['DDP', 'LCL', 'LOCAL'] })
  @IsOptional()
  @IsIn(['DDP', 'LCL', 'LOCAL'])
  shippingTerms?: 'DDP' | 'LCL' | 'LOCAL';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingFromCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingToCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  number?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  shipping?: number;

  @ApiProperty({ required: false, description: 'VAT percent (5 = 5%). 0 = off.' })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiProperty({ required: false, enum: ['AIR', 'SEA', 'LOCAL'] })
  @IsOptional()
  @IsIn(['AIR', 'SEA', 'LOCAL'])
  shippingMethod?: 'AIR' | 'SEA' | 'LOCAL';

  @ApiProperty({ required: false, enum: ['DDP', 'LCL', 'LOCAL'] })
  @IsOptional()
  @IsIn(['DDP', 'LCL', 'LOCAL'])
  shippingTerms?: 'DDP' | 'LCL' | 'LOCAL';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingFromCountry?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  shippingToCountry?: string;

  @ApiProperty({ type: [InvoiceItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}
