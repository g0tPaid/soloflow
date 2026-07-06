import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false, example: 0.1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
