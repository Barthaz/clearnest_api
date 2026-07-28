import type { FacilityContractDto } from '../types';
import {
  calculateFacilityMonthlyRevenueGross,
  contractsOverlap,
  resolveContractForDate,
  resolveContractForMonth,
} from './contract-resolver';

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
    ...overrides,
  };
}

describe('contract-resolver', () => {
  it('returns null for gap month', () => {
    const contracts = [
      contract({ id: 'c1', startDate: '2026-01-01', endDate: '2026-03-31' }),
      contract({ id: 'c2', startDate: '2026-07-01' }),
    ];
    expect(resolveContractForMonth(contracts, '2026-05')).toBeNull();
  });

  it('returns later contract when two sequential contracts in same month', () => {
    const contracts = [
      contract({
        id: 'c1',
        startDate: '2026-09-01',
        endDate: '2026-09-14',
        monthlyRateGross: 1000,
      }),
      contract({
        id: 'c2',
        startDate: '2026-09-15',
        monthlyRateGross: 1500,
      }),
    ];
    expect(resolveContractForMonth(contracts, '2026-09')?.id).toBe('c2');
  });

  it('resolves contract per day', () => {
    const contracts = [
      contract({ id: 'c1', startDate: '2026-09-01', endDate: '2026-09-14' }),
      contract({ id: 'c2', startDate: '2026-09-15' }),
    ];
    expect(resolveContractForDate(contracts, '2026-09-10')?.id).toBe('c1');
    expect(resolveContractForDate(contracts, '2026-09-20')?.id).toBe('c2');
    expect(resolveContractForDate(contracts, '2026-08-31')).toBeNull();
  });

  it('detects overlap', () => {
    expect(contractsOverlap('2026-01-01', '2026-06-30', '2026-06-01', '2026-12-31')).toBe(true);
    expect(contractsOverlap('2026-01-01', '2026-03-31', '2026-05-01', '2026-12-31')).toBe(false);
    expect(contractsOverlap('2026-01-01', undefined, '2026-06-01', undefined)).toBe(true);
  });

  it('prorates revenue for partial month coverage', () => {
    const contracts = [
      contract({
        id: 'c1',
        startDate: '2026-09-15',
        monthlyRateGross: 3000,
      }),
    ];
    const revenue = calculateFacilityMonthlyRevenueGross(contracts, '2026-09');
    expect(revenue).toBeGreaterThan(0);
    expect(revenue).toBeLessThan(3000);
  });
});
