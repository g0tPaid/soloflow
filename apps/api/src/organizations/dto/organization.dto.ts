import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AddressDto {
  @IsOptional()
  @IsString()
  line1?: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

class BrandingDto {
  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  invoiceBanner?: string;

  @IsOptional()
  @IsString()
  invoiceSignature?: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'acme-inc' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  slug!: string;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'America/New_York', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;
}

export class UpdateOrganizationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  logo?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;
}
