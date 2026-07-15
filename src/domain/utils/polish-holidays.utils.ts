import { formatDate } from './date.utils';

export interface PolishHoliday {
  date: string;
  name: string;
}

function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getPolishHolidaysForYear(year: number): PolishHoliday[] {
  const easter = getEasterSunday(year);

  const movable: PolishHoliday[] = [
    { date: formatDate(easter), name: 'Wielkanoc' },
    { date: formatDate(addDays(easter, 1)), name: 'Poniedziałek Wielkanocny' },
    { date: formatDate(addDays(easter, 60)), name: 'Boże Ciało' },
  ];

  const fixed: PolishHoliday[] = [
    { date: `${year}-01-01`, name: 'Nowy Rok' },
    { date: `${year}-01-06`, name: 'Święto Trzech Króli' },
    { date: `${year}-05-01`, name: 'Święto Pracy' },
    { date: `${year}-05-03`, name: 'Święto Konstytucji 3 Maja' },
    { date: `${year}-08-15`, name: 'Wniebowzięcie NMP' },
    { date: `${year}-11-01`, name: 'Wszystkich Świętych' },
    { date: `${year}-11-11`, name: 'Święto Niepodległości' },
    { date: `${year}-12-25`, name: 'Boże Narodzenie' },
    { date: `${year}-12-26`, name: 'Drugi dzień Bożego Narodzenia' },
  ];

  return [...fixed, ...movable].sort((a, b) => a.date.localeCompare(b.date));
}

export function getPolishHolidaysForMonth(monthKey: string): PolishHoliday[] {
  const [year] = monthKey.split('-').map(Number);
  return getPolishHolidaysForYear(year).filter((h) => h.date.startsWith(monthKey));
}

export function getNationalHoliday(date: string): PolishHoliday | undefined {
  const [year] = date.split('-').map(Number);
  return getPolishHolidaysForYear(year).find((h) => h.date === date);
}
