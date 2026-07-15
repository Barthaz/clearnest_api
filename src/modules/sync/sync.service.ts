import { Injectable } from '@nestjs/common';
import { needsScheduleSync } from '../../domain/schedule/schedule.service';
import { toIsoString } from '../../domain/mappers';
import type { AuthUserDto, SyncRevisionsDto } from '../../domain/types';
import { DataContextService } from '../../common/services/data-context.service';
import { PrismaService } from '../../prisma/prisma.service';

function monthDateRange(month: string): { start: Date; endExclusive: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNum - 1, 1)),
    endExclusive: new Date(Date.UTC(year, monthNum, 1)),
  };
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataContext: DataContextService,
  ) {}

  async getRevisions(month: string, user: AuthUserDto): Promise<SyncRevisionsDto> {
    if (user.role === 'WORKER') {
      const { start, endExclusive } = monthDateRange(month);
      const [employee, shiftsAgg] = await Promise.all([
        this.prisma.employee.findUnique({
          where: { id: user.employeeId },
        }),
        this.prisma.shift.aggregate({
          where: {
            employeeId: user.employeeId,
            shiftDate: { gte: start, lt: endExclusive },
          },
          _max: { updatedAt: true },
        }),
      ]);

      return {
        month,
        shiftsRevision: shiftsAgg._max.updatedAt
          ? toIsoString(shiftsAgg._max.updatedAt)
          : undefined,
        employeesRevision: employee ? toIsoString(employee.updatedAt) : undefined,
      };
    }

    const ctx = await this.dataContext.loadAppContext(month);
    const { start, endExclusive } = monthDateRange(month);

    const [
      facilitiesAgg,
      employeesAgg,
      settingsRow,
      shiftsAgg,
      holidaysAgg,
      skipsAgg,
    ] = await Promise.all([
      this.prisma.facility.aggregate({ _max: { updatedAt: true } }),
      this.prisma.employee.aggregate({ _max: { updatedAt: true } }),
      this.prisma.systemSettings.findUnique({ where: { id: 1 } }),
      this.prisma.shift.aggregate({
        where: {
          shiftDate: { gte: start, lt: endExclusive },
        },
        _max: { updatedAt: true },
      }),
      this.prisma.customHoliday.aggregate({ _max: { createdAt: true } }),
      this.prisma.facilitySkipDay.aggregate({ _max: { createdAt: true } }),
    ]);

    const holidaysRevision = [
      holidaysAgg._max.createdAt,
      skipsAgg._max.createdAt,
    ]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    return {
      month,
      facilitiesRevision: facilitiesAgg._max.updatedAt
        ? toIsoString(facilitiesAgg._max.updatedAt)
        : undefined,
      employeesRevision: employeesAgg._max.updatedAt
        ? toIsoString(employeesAgg._max.updatedAt)
        : undefined,
      settingsRevision: settingsRow
        ? toIsoString(settingsRow.updatedAt)
        : undefined,
      shiftsRevision: shiftsAgg._max.updatedAt
        ? toIsoString(shiftsAgg._max.updatedAt)
        : undefined,
      holidaysRevision: holidaysRevision
        ? toIsoString(holidaysRevision)
        : undefined,
      needsScheduleSync: needsScheduleSync(
        month,
        ctx.facilities,
        ctx.shifts,
        ctx.customHolidays,
        ctx.facilitySkips,
      ),
    };
  }
}
