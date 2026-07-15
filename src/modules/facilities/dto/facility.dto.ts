import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { Weekday } from '../../../domain/types';

export class CreateFacilityDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  address!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  areaM2!: number;

  @ApiProperty({ type: [Number], example: [0, 2, 4] })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  cleaningDays!: Weekday[];

  @ApiProperty()
  @IsNumber()
  @Min(0.1)
  hoursPerVisit!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlyRateGross!: number;
}

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}
