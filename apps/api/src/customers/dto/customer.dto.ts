import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateCustomerDto {
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
