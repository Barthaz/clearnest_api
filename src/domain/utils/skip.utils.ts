import type { FacilitySkipDayDto } from '../types';

export function isFacilitySkippedOnDate(
  date: string,
  facilityId: string,
  facilitySkips: FacilitySkipDayDto[],
): boolean {
  return facilitySkips.some((s) => s.date === date && s.facilityId === facilityId);
}
