import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mapCustomHoliday,
  mapEmployee,
  mapFacility,
  mapFacilityContract,
  mapFacilitySkipDay,
  mapSettings,
  mapShift,
} from '../../domain/mappers';
import type {
  CustomHolidayDto,
  EmployeeDto,
  FacilityContractDto,
  FacilityDto,
  FacilityScheduleInput,
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

  async getFacilityContracts(): Promise<FacilityContractDto[]> {
    const rows = await this.prisma.facilityContract.findMany({
      orderBy: [{ facilityId: 'asc' }, { startDate: 'asc' }],
    });
    return rows.map(mapFacilityContract);
  }

  async getFacilityScheduleInputs(): Promise<FacilityScheduleInput[]> {
    const rows = await this.prisma.facility.findMany({
      orderBy: { name: 'asc' },
      include: {
        contracts: { orderBy: { startDate: 'asc' } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      contracts: row.contracts.map(mapFacilityContract),
    }));
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
    const [
      facilities,
      facilityScheduleInputs,
      facilityContracts,
      employees,
      settings,
      customHolidays,
      facilitySkips,
    ] = await Promise.all([
      this.getFacilities(),
      this.getFacilityScheduleInputs(),
      this.getFacilityContracts(),
      this.getEmployees(),
      this.getSettings(),
      this.getCustomHolidays(),
      this.getFacilitySkipDays(),
    ]);

    const shifts = monthKey ? await this.getShiftsForMonth(monthKey) : await this.getShifts();

    return {
      facilities,
      facilityScheduleInputs,
      facilityContracts,
      employees,
      settings,
      customHolidays,
      facilitySkips,
      shifts,
    };
  }
}
