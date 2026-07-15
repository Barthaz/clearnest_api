import type { CustomHolidayDto, HolidayInfo } from '../types';
import { getNationalHoliday, getPolishHolidaysForMonth } from './polish-holidays.utils';

export function isHolidayDate(date: string, customHolidays: CustomHolidayDto[]): boolean {
  if (getNationalHoliday(date)) return true;
  return customHolidays.some((h) => h.date === date);
}

export function resolveHolidayInfo(
  date: string,
  customHolidays: CustomHolidayDto[],
): HolidayInfo | null {
  const national = getNationalHoliday(date);
  if (national) {
    return { date, name: national.name, source: 'national' };
  }

  const custom = customHolidays.find((h) => h.date === date);
  if (custom) {
    return { date, name: custom.name ?? 'Dzień wolny', source: 'custom' };
  }

  return null;
}

export function getHolidaysForMonth(
  monthKey: string,
  customHolidays: CustomHolidayDto[],
): HolidayInfo[] {
  const national = getPolishHolidaysForMonth(monthKey).map((h) => ({
    date: h.date,
    name: h.name,
    source: 'national' as const,
  }));

  const custom = customHolidays
    .filter((h) => h.date.startsWith(monthKey))
    .map((h) => ({
      date: h.date,
      name: h.name ?? 'Dzień wolny',
      source: 'custom' as const,
    }));

  const byDate = new Map<string, HolidayInfo>();
  for (const h of national) byDate.set(h.date, h);
  for (const h of custom) {
    if (!byDate.has(h.date)) byDate.set(h.date, h);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}
