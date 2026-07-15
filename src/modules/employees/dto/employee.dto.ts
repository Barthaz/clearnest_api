import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty()
  @IsUUID()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  hourlyRateGross!: number;

  @ApiProperty({ enum: ['zlecenie', 'etat'] })
  @IsEnum(['zlecenie', 'etat'])
  employmentForm!: 'zlecenie' | 'etat';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ulgaMlodych?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  student?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  innyTytul?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dobrowolneChorobowe?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fpExempt?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  kupPodwyzszone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pit2?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  wymiarEtatu?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  panelEnabled?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateEmployeeDto) => Boolean(o.panelEnabled))
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateEmployeeDto) => Boolean(o.panelEnabled))
  @IsString()
  @MinLength(4)
  password?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;
}
