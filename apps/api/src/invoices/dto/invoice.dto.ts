import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
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
}
