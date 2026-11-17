import { Matches, IsBoolean, IsString, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateCustomerDto {
  @IsOptional()
  @IsBoolean()
  isDropshipper?: boolean;

  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: 'Dropshipper number must be exactly four digits' })
  dropshipperNumber?: string;

  @IsOptional()
  @Matches(/^[a-z0-9]{0,12}$/i, { message: 'Use up to 12 letters or numbers for the prefix' })
  dropshipperPrefix?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
