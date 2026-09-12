import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { INVITABLE_ROLES } from '@flowbooks/shared';

function normalizeEmail({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

const INVITABLE = [...INVITABLE_ROLES];

export class InviteMemberDto {
  @ApiProperty({ example: 'staff@company.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false, example: 'Asha Kumar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ enum: INVITABLE, example: 'EMPLOYEE' })
  @IsIn(INVITABLE)
  role!: (typeof INVITABLE_ROLES)[number];
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: INVITABLE, example: 'MANAGER' })
  @IsIn(INVITABLE)
  role!: (typeof INVITABLE_ROLES)[number];
}

export class AcceptInviteDto {
  @ApiProperty({ description: 'Raw invite token from the email or shared link' })
  @IsString()
  @MinLength(20)
  token!: string;
}
