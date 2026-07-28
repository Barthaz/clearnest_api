import type { FacilityContractDto } from '../types';
import { formatDateFromDb, parseDateToDb } from '../mappers';

function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function isDateWithinContract(date: string, contract: FacilityContractDto): boolean {
  if (compareDates(date, contract.startDate) < 0) return false;
  if (contract.endDate && compareDates(date, contract.endDate) > 0) return false;
  return true;
}

export function monthOverlapsContract(monthKey: string, contract: FacilityContractDto): boolean {
  const [year, month] = monthKey.split('-').map(Number);
  const monthStart = formatDateFromDb(new Date(Date.UTC(year, month - 1, 1)));
  const monthEnd = formatDateFromDb(new Date(Date.UTC(year, month, 0)));

  const contractStart = contract.startDate;
  const contractEnd = contract.endDate ?? '9999-12-31';

  return compareDates(contractStart, monthEnd) <= 0 && compareDates(contractEnd, monthStart) >= 0;
}

export function resolveContractForDate(
  contracts: FacilityContractDto[],
  date: string,
): FacilityContractDto | null {
  const active = contracts.filter((c) => isDateWithinContract(date, c));
  if (active.length === 0) return null;
  return active.sort((a, b) => compareDates(b.startDate, a.startDate))[0];
}

export function resolveContractForMonth(
  contracts: FacilityContractDto[],
  monthKey: string,
): FacilityContractDto | null {
  const overlapping = contracts.filter((c) => monthOverlapsContract(monthKey, c));
  if (overlapping.length === 0) return null;
  return overlapping.sort((a, b) => compareDates(b.startDate, a.startDate))[0];
}

/** Przychód miesięczny = pełna stawka z umowy (kwota faktury), bez prorationu po dniach. */
export function calculateFacilityMonthlyRevenueGross(
  contracts: FacilityContractDto[],
  monthKey: string,
): number {
  const contract = resolveContractForMonth(contracts, monthKey);
  return contract?.monthlyRateGross ?? 0;
}

export function contractsOverlap(
  aStart: string,
  aEnd: string | undefined,
  bStart: string,
  bEnd: string | undefined,
): boolean {
  const aEndEffective = aEnd ?? '9999-12-31';
  const bEndEffective = bEnd ?? '9999-12-31';
  return compareDates(aStart, bEndEffective) <= 0 && compareDates(bStart, aEndEffective) <= 0;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateToDb(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateFromDb(date);
}
