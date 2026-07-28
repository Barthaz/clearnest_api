import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { CreateFacilityContractDto } from '../../facility-contracts/dto/facility-contract.dto';

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

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFacilityContractDto)
  initialContract?: CreateFacilityContractDto;
}

export class UpdateFacilityDto extends PartialType(CreateFacilityDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  initialContract?: never;
}
