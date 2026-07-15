import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mapCustomHoliday,
  mapEmployee,
  mapFacility,
  mapFacilitySkipDay,
  mapSettings,
  mapShift,
} from '../../domain/mappers';
import type {
  CustomHolidayDto,
  EmployeeDto,
  FacilityDto,
  FacilitySkipDayDto,
  ShiftDto,
  SystemSettingsDto,
} from '../../domain/types';
import { DEFAULT_SETTINGS } from '../../domain/types';

@Injectable()
export class DataContextService {
  constructor(private readonly prisma: PrismaService) {}

  async getFacilities(): Promise<FacilityDto[]> {
    const rows = await this.prisma.facility.findMany({ orderBy: { name: 'asc' } });
    return rows.map(mapFacility);
  }

  async getEmployees(): Promise<EmployeeDto[]> {
    const rows = await this.prisma.employee.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(mapEmployee);
  }

  async getShifts(): Promise<ShiftDto[]> {
    const rows = await this.prisma.shift.findMany({ orderBy: [{ shiftDate: 'asc' }] });
    return rows.map(mapShift);
  }

  async getShiftsForMonth(monthKey: string): Promise<ShiftDto[]> {
    const [year, month] = monthKey.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));

    const rows = await this.prisma.shift.findMany({
      where: { shiftDate: { gte: start, lte: end } },
      orderBy: { shiftDate: 'asc' },
    });
    return rows.map(mapShift);
  }

  async getCustomHolidays(): Promise<CustomHolidayDto[]> {
    const rows = await this.prisma.customHoliday.findMany({ orderBy: { holidayDate: 'asc' } });
    return rows.map((r) => mapCustomHoliday(r.holidayDate, r.name));
  }

  async getFacilitySkipDays(): Promise<FacilitySkipDayDto[]> {
    const rows = await this.prisma.facilitySkipDay.findMany({ orderBy: { skipDate: 'asc' } });
    return rows.map(mapFacilitySkipDay);
  }

  async getSettings(): Promise<SystemSettingsDto> {
    const row = await this.prisma.systemSettings.findUnique({ where: { id: 1 } });
    if (!row) {
      return { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    }
    return mapSettings(row);
  }

  async loadAppContext(monthKey?: string) {
    const [facilities, employees, settings, customHolidays, facilitySkips] = await Promise.all([
      this.getFacilities(),
      this.getEmployees(),
      this.getSettings(),
      this.getCustomHolidays(),
      this.getFacilitySkipDays(),
    ]);

    const shifts = monthKey ? await this.getShiftsForMonth(monthKey) : await this.getShifts();

    return { facilities, employees, settings, customHolidays, facilitySkips, shifts };
  }
}
