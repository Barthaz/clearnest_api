import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { FacilitiesService } from './facilities.service';

@ApiTags('facilities')
@ApiBearerAuth()
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista placówek' })
  findAll(@CurrentUser() user: AuthUserDto, @Query('month') month?: string) {
    return this.facilitiesService.findAll(user, month);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Szczegóły placówki' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUserDto) {
    return this.facilitiesService.findOne(id, user);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Utwórz placówkę' })
  create(@Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Aktualizuj placówkę' })
  update(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilitiesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Usuń placówkę' })
  remove(@Param('id') id: string) {
    return this.facilitiesService.remove(id);
  }
}
