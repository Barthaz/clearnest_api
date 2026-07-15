import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ToggleCustomHolidayDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class ToggleFacilitySkipDto {
  @ApiProperty({ example: '2026-07-15' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty()
  @IsUUID()
  facilityId!: string;
}
