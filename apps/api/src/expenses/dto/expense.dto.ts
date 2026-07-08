import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExpenseLineItemDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitCost!: number;
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
}
