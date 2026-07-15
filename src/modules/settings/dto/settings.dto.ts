import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: ['active', 'exempt'] })
  @IsOptional()
  @IsEnum(['active', 'exempt'])
  vatStatus?: 'active' | 'exempt';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  zusMonthly?: number;

  @ApiPropertyOptional({ enum: ['preferencyjny', 'standardowy', 'maly'] })
  @IsOptional()
  @IsEnum(['preferencyjny', 'standardowy', 'maly'])
  zusType?: 'preferencyjny' | 'standardowy' | 'maly';

  @ApiPropertyOptional({ enum: ['auto', 'manual'] })
  @IsOptional()
  @IsEnum(['auto', 'manual'])
  healthContributionMode?: 'auto' | 'manual';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  healthContributionManualMonthly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  healthRateOverrideEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  healthRateOverride?: number;

  @ApiPropertyOptional({ enum: ['ryczalt', 'skala', 'liniowy'] })
  @IsOptional()
  @IsEnum(['ryczalt', 'skala', 'liniowy'])
  taxForm?: 'ryczalt' | 'skala' | 'liniowy';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  ryczaltRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  additionalCosts?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  vatExemptionThreshold?: number;
}
