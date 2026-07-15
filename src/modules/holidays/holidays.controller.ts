import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUserDto } from '../../domain/types';
import { ToggleCustomHolidayDto, ToggleFacilitySkipDto } from './dto/holiday.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('holidays')
@ApiBearerAuth()
@Controller()
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get('holidays')
  @ApiOperation({ summary: 'Święta państwowe i własne w miesiącu' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getHolidays(@Query('month') month: string) {
    return this.holidaysService.getHolidays(month);
  }

  @Post('holidays/custom/toggle')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Przełącz własny dzień wolny' })
  toggleCustomHoliday(@Body() dto: ToggleCustomHolidayDto) {
    return this.holidaysService.toggleCustomHoliday(dto);
  }

  @Get('facility-skips')
  @ApiOperation({ summary: 'Pominięcia sprzątania w dniu lub miesiącu' })
  @ApiQuery({ name: 'date', required: false, example: '2026-07-15' })
  @ApiQuery({ name: 'month', required: false, example: '2026-07' })
  getFacilitySkips(
    @Query('date') date: string | undefined,
    @Query('month') month: string | undefined,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.holidaysService.getFacilitySkips(date, month, user);
  }

  @Post('facility-skips/toggle')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Przełącz pominięcie sprzątania placówki' })
  toggleFacilitySkip(@Body() dto: ToggleFacilitySkipDto) {
    return this.holidaysService.toggleFacilitySkip(dto);
  }
}
