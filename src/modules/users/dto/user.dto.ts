import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import type { UserRole } from '../../../domain/types';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(4)
  password!: string;

  @ApiProperty({ enum: ['ADMIN', 'MANAGER'] })
  @IsEnum(['ADMIN', 'MANAGER'])
  role!: Extract<UserRole, 'ADMIN' | 'MANAGER'>;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MANAGER'] })
  @IsOptional()
  @IsEnum(['ADMIN', 'MANAGER'])
  role?: Extract<UserRole, 'ADMIN' | 'MANAGER'>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
