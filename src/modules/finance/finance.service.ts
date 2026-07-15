import { Injectable } from '@nestjs/common';
import { detectConflicts, getConflictStats } from '../../domain/conflicts/conflict.service';
import {
  calculateDashboardKpis,
  calculateMonthlyReport,
} from '../../domain/finance/finance.service';
import { DataContextService } from '../../common/services/data-context.service';

@Injectable()
export class FinanceService {
  constructor(private readonly dataContext: DataContextService) {}

  async getReport(month: string) {
    const ctx = await this.dataContext.loadAppContext(month);
    return calculateMonthlyReport(
      month,
      ctx.facilities,
      ctx.employees,
      ctx.settings,
      ctx.shifts,
    );
  }

  async getDashboard(month: string) {
    const ctx = await this.dataContext.loadAppContext(month);
    return calculateDashboardKpis(
      month,
      ctx.facilities,
      ctx.employees,
      ctx.settings,
      ctx.shifts,
    );
  }

  async getConflicts(month: string) {
    const ctx = await this.dataContext.loadAppContext(month);
    const conflicts = detectConflicts(ctx.shifts, ctx.facilities, ctx.employees);
    return {
      month,
      conflicts,
      stats: getConflictStats(conflicts),
    };
  }
}
