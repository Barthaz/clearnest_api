import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import {
  AssignShiftDto,
  GenerateShiftsDto,
  UpdateShiftHoursDto,
} from './dto/shift.dto';
import { ShiftsService } from './shifts.service';

@ApiTags('shifts')
@ApiBearerAuth()
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista zmian w miesiącu' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  findByMonth(@Query('month') month: string, @CurrentUser() user: AuthUserDto) {
    return this.shiftsService.findByMonth(month, user);
  }

  @Get('sync-status')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Czy grafik wymaga synchronizacji' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getSyncStatus(@Query('month') month: string) {
    return this.shiftsService.getSyncStatus(month);
  }

  @Post('generate')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generuj grafik na miesiąc' })
  generate(@Body() dto: GenerateShiftsDto) {
    return this.shiftsService.generate(dto.month);
  }

  @Patch(':id/assign')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Przypisz pracownika do zmiany' })
  assign(@Param('id') id: string, @Body() dto: AssignShiftDto) {
    return this.shiftsService.assign(id, dto.employeeId);
  }

  @Patch(':id/save')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Zapisz przypisanie zmiany' })
  save(@Param('id') id: string) {
    return this.shiftsService.save(id);
  }

  @Patch(':id/unsave')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cofnij zapis przypisania' })
  unsave(@Param('id') id: string) {
    return this.shiftsService.unsave(id);
  }

  @Patch(':id/clear')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Wyczyść przypisanie (właściciel)' })
  clear(@Param('id') id: string) {
    return this.shiftsService.clear(id);
  }

  @Patch(':id/hours')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Aktualizuj liczbę godzin' })
  updateHours(@Param('id') id: string, @Body() dto: UpdateShiftHoursDto) {
    return this.shiftsService.updateHours(id, dto.hours);
  }
}
