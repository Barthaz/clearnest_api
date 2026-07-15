import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@Roles('ADMIN', 'MANAGER')
@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('finance/report')
  @ApiOperation({ summary: 'Raport finansowy miesięczny' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getReport(@Query('month') month: string) {
    return this.financeService.getReport(month);
  }

  @Get('finance/dashboard')
  @ApiOperation({ summary: 'KPI dashboard finansowy' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getDashboard(@Query('month') month: string) {
    return this.financeService.getDashboard(month);
  }

  @Get('schedule/conflicts')
  @ApiOperation({ summary: 'Kolizje grafiku' })
  @ApiQuery({ name: 'month', example: '2026-07' })
  getConflicts(@Query('month') month: string) {
    return this.financeService.getConflicts(month);
  }
}
