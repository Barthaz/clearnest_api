import type { Weekday } from '../types';
import type {
  Employee,
  EmploymentForm,
  Facility,
  FacilitySkipDay,
  Shift,
  ShiftStatus,
  SystemSettings,
  VatStatus,
} from '@prisma/client';
import type {
  CustomHolidayDto,
  EmployeeDto,
  FacilityDto,
  FacilitySkipDayDto,
  ShiftDto,
  SystemSettingsDto,
} from '../types';

export function toNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

export function formatDateFromDb(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateToDb(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function toIsoString(date: Date): string {
  return date.toISOString();
}

export function mapFacility(f: Facility): FacilityDto {
  return {
    id: f.id,
    name: f.name,
    address: f.address,
    areaM2: toNumber(f.areaM2),
    cleaningDays: f.cleaningDays as Weekday[],
    visitsPerWeek: f.visitsPerWeek,
    hoursPerVisit: toNumber(f.hoursPerVisit),
    startTime: f.startTime,
    monthlyRateGross: toNumber(f.monthlyRateGross),
    updatedAt: toIsoString(f.updatedAt),
  };
}

export function mapEmployee(e: Employee): EmployeeDto {
  return {
    id: e.id,
    name: e.name,
    hourlyRateGross: toNumber(e.hourlyRateGross),
    employmentForm: e.employmentForm as EmploymentForm,
    ulgaMlodych: e.ulgaMlodych,
    student: e.student,
    innyTytul: e.innyTytul,
    dobrowolneChorobowe: e.dobrowolneChorobowe,
    fpExempt: e.fpExempt,
    kupPodwyzszone: e.kupPodwyzszone,
    pit2: e.pit2,
    wymiarEtatu: toNumber(e.wymiarEtatu),
    username: e.username ?? undefined,
    panelEnabled: e.panelEnabled,
    hasPassword: Boolean(e.passwordHash),
    updatedAt: toIsoString(e.updatedAt),
  };
}

export function mapShift(s: Shift): ShiftDto {
  return {
    id: s.id,
    facilityId: s.facilityId,
    employeeId: s.employeeId ?? undefined,
    date: formatDateFromDb(s.shiftDate),
    hours: toNumber(s.hours),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status as ShiftStatus,
    updatedAt: toIsoString(s.updatedAt),
  };
}

export function mapSettings(s: SystemSettings): SystemSettingsDto {
  return {
    vatStatus: s.vatStatus as VatStatus,
    vatRate: toNumber(s.vatRate),
    zusMonthly: toNumber(s.zusMonthly),
    zusType: s.zusType as SystemSettingsDto['zusType'],
    healthContributionMode: s.healthContributionMode as 'auto' | 'manual',
    healthContributionManualMonthly: toNumber(s.healthContributionManualMonthly),
    healthRateOverrideEnabled: s.healthRateOverrideEnabled,
    healthRateOverride: toNumber(s.healthRateOverride),
    taxForm: s.taxForm as SystemSettingsDto['taxForm'],
    ryczaltRate: toNumber(s.ryczaltRate),
    additionalCosts: toNumber(s.additionalCosts),
    vatExemptionThreshold: toNumber(s.vatExemptionThreshold),
    updatedAt: toIsoString(s.updatedAt),
  };
}

export function mapCustomHoliday(date: Date, name: string | null): CustomHolidayDto {
  return {
    date: formatDateFromDb(date),
    name: name ?? undefined,
  };
}

export function mapFacilitySkipDay(s: FacilitySkipDay): FacilitySkipDayDto {
  return {
    date: formatDateFromDb(s.skipDate),
    facilityId: s.facilityId,
    name: s.name ?? undefined,
  };
}
