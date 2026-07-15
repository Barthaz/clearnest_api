import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class GenerateShiftsDto {
  @ApiProperty({ example: '2026-07' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}

export class AssignShiftDto {
  @ApiPropertyOptional({ description: 'Brak = właściciel / unassigned' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class UpdateShiftHoursDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  hours!: number;
}

export class MonthQueryDto {
  @ApiProperty({ example: '2026-07' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}
