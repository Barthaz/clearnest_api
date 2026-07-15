import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { parseDateToDb } from '../../domain/mappers';
import { getHolidaysForMonth, resolveHolidayInfo } from '../../domain/utils/holiday.utils';
import type { AuthUserDto } from '../../domain/types';
import { getWorkerAssignedFacilityIds } from '../../common/utils/worker-access.utils';
import { DataContextService } from '../../common/services/data-context.service';
import { ShiftsService } from '../shifts/shifts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ToggleCustomHolidayDto, ToggleFacilitySkipDto } from './dto/holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataContext: DataContextService,
    private readonly shiftsService: ShiftsService,
  ) {}

  async getHolidays(month: string) {
    const customHolidays = await this.dataContext.getCustomHolidays();
    return getHolidaysForMonth(month, customHolidays);
  }

  async toggleCustomHoliday(dto: ToggleCustomHolidayDto) {
    const customHolidays = await this.dataContext.getCustomHolidays();
    const info = resolveHolidayInfo(dto.date, customHolidays);

    if (info?.source === 'national') {
      return { isHoliday: true };
    }

    const exists = customHolidays.some((h) => h.date === dto.date);
    const month = dto.date.slice(0, 7);

    if (exists) {
      await this.prisma.customHoliday.delete({
        where: { holidayDate: parseDateToDb(dto.date) },
      });
      await this.shiftsService.generate(month);
      return { isHoliday: false };
    }

    await this.prisma.customHoliday.create({
      data: {
        holidayDate: parseDateToDb(dto.date),
        name: dto.name ?? 'Dzień wolny',
      },
    });
    await this.shiftsService.generate(month);
    return { isHoliday: true };
  }

  async getFacilitySkips(
    date: string | undefined,
    month: string | undefined,
    user: AuthUserDto,
  ) {
    const workerFacilityIds =
      user.role === 'WORKER' && user.employeeId
        ? await getWorkerAssignedFacilityIds(
            this.prisma,
            user.employeeId,
            month ?? date?.slice(0, 7),
          )
        : null;

    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, monthNum - 1, 1));
      const endExclusive = new Date(Date.UTC(year, monthNum, 1));

      const rows = await this.prisma.facilitySkipDay.findMany({
        where: { skipDate: { gte: start, lt: endExclusive } },
        orderBy: { skipDate: 'asc' },
      });

      let skips = rows.map((r) => ({
        date: r.skipDate.toISOString().slice(0, 10),
        facilityId: r.facilityId,
        name: r.name ?? undefined,
      }));

      if (workerFacilityIds) {
        const allowed = new Set(workerFacilityIds);
        skips = skips.filter((s) => allowed.has(s.facilityId));
      }

      return skips;
    }

    if (!date) {
      throw new BadRequestException('Podaj parametr date lub month');
    }

    const rows = await this.prisma.facilitySkipDay.findMany({
      where: { skipDate: parseDateToDb(date) },
    });

    let skips = rows.map((r) => ({
      date,
      facilityId: r.facilityId,
      name: r.name ?? undefined,
    }));

    if (workerFacilityIds) {
      const allowed = new Set(workerFacilityIds);
      skips = skips.filter((s) => allowed.has(s.facilityId));
    }

    return skips;
  }

  async toggleFacilitySkip(dto: ToggleFacilitySkipDto) {
    const customHolidays = await this.dataContext.getCustomHolidays();
    const info = resolveHolidayInfo(dto.date, customHolidays);

    if (info) {
      throw new BadRequestException('Nie można pominąć sprzątania w dniu wolnym');
    }

    const skipDate = parseDateToDb(dto.date);
    const month = dto.date.slice(0, 7);

    const existing = await this.prisma.facilitySkipDay.findUnique({
      where: {
        skipDate_facilityId: {
          skipDate,
          facilityId: dto.facilityId,
        },
      },
    });

    if (existing) {
      await this.prisma.facilitySkipDay.delete({
        where: {
          skipDate_facilityId: {
            skipDate,
            facilityId: dto.facilityId,
          },
        },
      });
      await this.shiftsService.generate(month);
      return { skipped: false };
    }

    await this.prisma.facilitySkipDay.create({
      data: {
        skipDate,
        facilityId: dto.facilityId,
        name: 'Pominięte',
      },
    });
    await this.shiftsService.generate(month);
    return { skipped: true };
  }

  ensureWorkerReadOnly(user: AuthUserDto) {
    if (user.role === 'WORKER') {
      throw new ForbiddenException('Brak uprawnień do edycji');
    }
  }
}
