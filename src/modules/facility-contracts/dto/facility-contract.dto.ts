import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import type { Weekday } from '../../../domain/types';

export class CreateFacilityContractDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlyRateGross!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0.1)
  hoursPerVisit!: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '11:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ type: [Number], example: [0, 2, 4] })
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  cleaningDays!: Weekday[];
}

export class UpdateFacilityContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31', nullable: true })
  @ValidateIf((_o, v) => v !== null)
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRateGross?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  hoursPerVisit?: number;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '11:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ type: [Number], example: [0, 2, 4] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn([0, 1, 2, 3, 4, 5, 6], { each: true })
  cleaningDays?: Weekday[];
}
