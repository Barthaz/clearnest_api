import { randomUUID } from 'node:crypto';
import type {
  CustomHolidayDto,
  FacilityDto,
  FacilitySkipDayDto,
  ShiftDto,
  ShiftStatus,
} from '../types';
import { formatDate, getDaysInMonth, getWeekday } from '../utils/date.utils';
import { isHolidayDate } from '../utils/holiday.utils';
import { isFacilitySkippedOnDate } from '../utils/skip.utils';
import { computeEndTime } from '../utils/time.utils';

export function countExpectedShiftsForMonth(
  monthKey: string,
  facilities: FacilityDto[],
  customHolidays: CustomHolidayDto[],
  facilitySkips: FacilitySkipDayDto[],
): number {
  const [year, month] = monthKey.split('-').map(Number);
  const days = getDaysInMonth(year, month - 1);
  let count = 0;
  for (const facility of facilities) {
    for (const day of days) {
      const dateStr = formatDate(day);
      if (isHolidayDate(dateStr, customHolidays)) continue;
      if (isFacilitySkippedOnDate(dateStr, facility.id, facilitySkips)) continue;
      if (facility.cleaningDays.includes(getWeekday(day))) count++;
    }
  }
  return count;
}

export function needsScheduleSync(
  monthKey: string,
  facilities: FacilityDto[],
  shifts: ShiftDto[],
  customHolidays: CustomHolidayDto[],
  facilitySkips: FacilitySkipDayDto[],
): boolean {
  if (facilities.length === 0) return false;
  const expected = countExpectedShiftsForMonth(monthKey, facilities, customHolidays, facilitySkips);
  const actual = shifts.filter((s) => s.date.startsWith(monthKey)).length;
  return actual !== expected;
}

export function generateShiftsForMonth(
  monthKey: string,
  facilities: FacilityDto[],
  existingShifts: ShiftDto[],
  customHolidays: CustomHolidayDto[],
  facilitySkips: FacilitySkipDayDto[],
  allShifts: ShiftDto[],
): ShiftDto[] {
  const [year, month] = monthKey.split('-').map(Number);
  const monthExisting = existingShifts.filter((s) => s.date.startsWith(monthKey));
  const existingByKey = new Map(monthExisting.map((s) => [`${s.facilityId}:${s.date}`, s]));

  const days = getDaysInMonth(year, month - 1);
  const newShifts: ShiftDto[] = [];
  const today = formatDate(new Date());

  for (const facility of facilities) {
    for (const day of days) {
      const weekday = getWeekday(day);
      if (!facility.cleaningDays.includes(weekday)) continue;

      const dateStr = formatDate(day);
      if (isHolidayDate(dateStr, customHolidays)) continue;
      if (isFacilitySkippedOnDate(dateStr, facility.id, facilitySkips)) continue;

      const key = `${facility.id}:${dateStr}`;
      const existing = existingByKey.get(key);
      const facilityStartTime = facility.startTime ?? '08:00';

      if (existing) {
        const isPast = dateStr < today;
        const isSaved = existing.status === 'saved';
        const hasCustomHours = existing.hours !== facility.hoursPerVisit;

        if (isPast || isSaved || hasCustomHours) {
          newShifts.push(existing);
        } else {
          newShifts.push({
            ...existing,
            hours: facility.hoursPerVisit,
            startTime: facilityStartTime,
            endTime: computeEndTime(facilityStartTime, facility.hoursPerVisit),
          });
        }
      } else {
        newShifts.push({
          id: randomUUID(),
          facilityId: facility.id,
          employeeId: undefined,
          date: dateStr,
          hours: facility.hoursPerVisit,
          startTime: facilityStartTime,
          endTime: computeEndTime(facilityStartTime, facility.hoursPerVisit),
          status: 'unassigned',
        });
      }
    }
  }

  const otherMonthShifts = allShifts.filter((s) => !s.date.startsWith(monthKey));
  return [...otherMonthShifts, ...newShifts];
}

export function assignEmployeeToShift(
  shiftId: string,
  employeeId: string | undefined,
  allShifts: ShiftDto[],
  checkConflict: (
    shiftId: string,
    employeeId: string | undefined,
    shifts: ShiftDto[],
  ) => { conflict: boolean; message?: string },
): { shift?: ShiftDto; error?: string } {
  const shift = allShifts.find((s) => s.id === shiftId);
  if (!shift) return { error: 'Nie znaleziono zmiany' };
  if (shift.status === 'saved') {
    return { error: 'Przypisanie jest zapisane. Cofnij zapis, aby je zmienić.' };
  }

  const check = checkConflict(shiftId, employeeId, allShifts);
  if (check.conflict) {
    return { error: check.message };
  }

  const status: ShiftStatus = employeeId ? 'scheduled' : 'unassigned';
  return {
    shift: { ...shift, employeeId, status },
  };
}

export function saveShiftAssignment(shift: ShiftDto): { shift?: ShiftDto; error?: string } {
  if (shift.status === 'saved') return { shift };
  return { shift: { ...shift, status: 'saved' } };
}

export function unsaveShiftAssignment(shift: ShiftDto): ShiftDto {
  if (shift.status !== 'saved') return shift;
  const status: ShiftStatus = shift.employeeId ? 'scheduled' : 'unassigned';
  return { ...shift, status };
}

export function clearSavedShiftAssignment(shift: ShiftDto): ShiftDto {
  return { ...shift, employeeId: undefined, status: 'unassigned' };
}

export function updateShiftActualHours(
  shift: ShiftDto,
  hours: number,
): { shift?: ShiftDto; error?: string } {
  if (!Number.isFinite(hours) || hours <= 0) {
    return { error: 'Liczba godzin musi być większa od 0.' };
  }
  const rounded = Math.round(hours * 100) / 100;
  return {
    shift: {
      ...shift,
      hours: rounded,
      endTime: computeEndTime(shift.startTime, rounded),
    },
  };
}
