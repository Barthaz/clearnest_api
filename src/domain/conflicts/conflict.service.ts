import type { EmployeeDto, FacilityDto, ScheduleConflict, ShiftDto, ShiftStatus } from '../types';
import { timeRangesOverlap } from '../utils/time.utils';

const OWNER_KEY = '__owner__';

function getAssigneeKey(shift: ShiftDto): string {
  return shift.employeeId ?? OWNER_KEY;
}

function shiftsOverlap(a: ShiftDto, b: ShiftDto): boolean {
  if (a.date !== b.date) return false;
  if (a.id === b.id) return false;
  return timeRangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
}

export function detectConflicts(
  shifts: ShiftDto[],
  facilities: FacilityDto[],
  employees: EmployeeDto[],
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const seen = new Set<string>();

  const getFacilityName = (id: string) =>
    facilities.find((f) => f.id === id)?.name ?? 'Nieznana placówka';

  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)?.name ?? 'Pracownik';

  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const a = shifts[i];
      const b = shifts[j];

      if (!shiftsOverlap(a, b)) continue;

      const keyA = getAssigneeKey(a);
      const keyB = getAssigneeKey(b);

      if (keyA !== keyB) continue;

      const pairKey = [a.id, b.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const isOwner = keyA === OWNER_KEY;
      const timeRange = `${a.startTime}–${a.endTime}`;
      const facA = getFacilityName(a.facilityId);
      const facB = getFacilityName(b.facilityId);

      if (isOwner) {
        conflicts.push({
          type: 'owner',
          date: a.date,
          shiftIds: [a.id, b.id],
          facilityNames: [facA, facB],
          timeRange,
          message: `Kolizja właściciela ${a.date} (${timeRange}): „${facA}" i „${facB}". Właściciel nie może sprzątać dwóch obiektów jednocześnie – rozważ zatrudnienie pracownika.`,
        });
      } else {
        conflicts.push({
          type: 'employee',
          date: a.date,
          shiftIds: [a.id, b.id],
          facilityNames: [facA, facB],
          timeRange,
          employeeId: a.employeeId,
          employeeName: getEmployeeName(a.employeeId!),
          message: `Kolizja pracownika ${getEmployeeName(a.employeeId!)} ${a.date} (${timeRange}): „${facA}" i „${facB}".`,
        });
      }
    }
  }

  return conflicts.sort((a, b) => a.date.localeCompare(b.date));
}

export function wouldCreateConflict(
  shiftId: string,
  employeeId: string | undefined,
  allShifts: ShiftDto[],
): { conflict: boolean; message?: string } {
  const shift = allShifts.find((s) => s.id === shiftId);
  if (!shift) return { conflict: false };

  const hypothetical: ShiftDto = {
    ...shift,
    employeeId,
    status: (employeeId ? 'scheduled' : 'unassigned') as ShiftStatus,
  };

  const activeShifts = allShifts.filter((s) => s.id !== shiftId);
  const assigneeKey = employeeId ?? OWNER_KEY;

  for (const other of activeShifts) {
    if (getAssigneeKey(other) !== assigneeKey) continue;
    if (!shiftsOverlap(hypothetical, other)) continue;

    if (!employeeId) {
      return {
        conflict: true,
        message:
          'Właściciel ma już inne sprzątanie w tym czasie. Przypisz pracownika lub zmień godziny placówki.',
      };
    }

    return {
      conflict: true,
      message: 'Ten pracownik jest już przypisany do innej placówki w tym samym czasie.',
    };
  }

  return { conflict: false };
}

export function getConflictStats(conflicts: ScheduleConflict[]) {
  return {
    total: conflicts.length,
    employee: conflicts.filter((c) => c.type === 'employee').length,
    owner: conflicts.filter((c) => c.type === 'owner').length,
  };
}
