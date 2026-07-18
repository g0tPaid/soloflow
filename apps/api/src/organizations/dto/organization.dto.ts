import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  ValidateNested,
  IsObject,
  IsBoolean,
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

  @IsOptional()
  @IsString()
  invoiceOffer1?: string;

  @IsOptional()
  @IsString()
  invoiceOffer2?: string;

  @IsOptional()
  @IsString()
  invoiceOffer3?: string;

  @IsOptional()
  @IsString()
  invoiceOffer4?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'invoiceAccent must be a hex color like #DC2626' })
  invoiceAccent?: string;

  @IsOptional()
  @IsBoolean()
  showInvoiceLogo?: boolean;
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

  @ApiProperty({
    required: false,
    description: 'Units of each currency per 1 USD, e.g. { CNY: 7.25, EUR: 0.92 }',
  })
  @IsOptional()
  @IsObject()
  fxRates?: Record<string, number>;

  @ApiProperty({
    required: false,
    description: 'Currency used when entering purchase/shipping costs on expenses',
    example: 'CNY',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  costCurrency?: string;
}
