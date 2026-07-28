import type { FacilityContractDto, FacilityScheduleInput } from '../types';
import {
  getExpectedShiftKeysForMonth,
  needsScheduleSync,
} from './schedule.service';

function contract(
  overrides: Partial<FacilityContractDto> & Pick<FacilityContractDto, 'id' | 'startDate'>,
): FacilityContractDto {
  return {
    facilityId: 'fac-1',
    endDate: undefined,
    monthlyRateGross: 1000,
    hoursPerVisit: 3,
    startTime: '08:00',
    endTime: '11:00',
    cleaningDays: [0, 2, 4],
    visitsPerWeek: 3,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function facilityInput(
  id: string,
  contracts: FacilityContractDto[],
): FacilityScheduleInput {
  return { id, contracts };
}

describe('schedule.service', () => {
  it('does not expect shifts when no contract overlaps the month', () => {
    const inputs = [
      facilityInput('fac-1', [
        contract({ id: 'c1', startDate: '2026-10-01' }),
      ]),
    ];

    const keys = getExpectedShiftKeysForMonth('2026-09', inputs, [], []);
    expect(keys.size).toBe(0);
    expect(needsScheduleSync('2026-09', inputs, [], [], [])).toBe(false);
  });

  it('expects shifts only from contract start date within the month', () => {
    const inputs = [
      facilityInput('fac-1', [
        contract({ id: 'c1', startDate: '2026-09-15', cleaningDays: [1] }),
      ]),
    ];

    const keys = getExpectedShiftKeysForMonth('2026-09', inputs, [], []);
    expect([...keys]).toEqual(['fac-1:2026-09-15', 'fac-1:2026-09-22', 'fac-1:2026-09-29']);
  });

  it('uses per-day contract when two sequential contracts share a month', () => {
    const inputs = [
      facilityInput('fac-1', [
        contract({
          id: 'c1',
          startDate: '2026-09-01',
          endDate: '2026-09-14',
          cleaningDays: [1],
        }),
        contract({
          id: 'c2',
          startDate: '2026-09-15',
          cleaningDays: [2],
        }),
      ]),
    ];

    const keys = getExpectedShiftKeysForMonth('2026-09', inputs, [], []);
    expect(keys.has('fac-1:2026-09-01')).toBe(true);
    expect(keys.has('fac-1:2026-09-08')).toBe(true);
    expect(keys.has('fac-1:2026-09-15')).toBe(false);
    expect(keys.has('fac-1:2026-09-16')).toBe(true);
  });

  it('flags sync when orphan shifts exist outside contract coverage', () => {
    const inputs = [
      facilityInput('fac-1', [
        contract({ id: 'c1', startDate: '2026-10-01', cleaningDays: [0] }),
      ]),
    ];

    const shifts = [
      {
        id: 'shift-1',
        facilityId: 'fac-1',
        date: '2026-09-01',
        hours: 3,
        startTime: '08:00',
        endTime: '11:00',
        status: 'unassigned' as const,
      },
    ];

    expect(needsScheduleSync('2026-09', inputs, shifts, [], [])).toBe(true);
  });
});
