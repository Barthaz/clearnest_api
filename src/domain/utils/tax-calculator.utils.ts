import type { EmployeeDto, SystemSettingsDto, TaxForm, VatStatus } from '../types';
import { calculateHourlyEmployerCost, calculateEmployeeShiftCost } from '../payroll/employee-payroll';

export { calculateHourlyEmployerCost, calculateEmployeeShiftCost };

const PIT_FIRST_BRACKET_RATE = 0.12;
const PIT_SECOND_BRACKET_RATE = 0.32;
const PIT_FREE_AMOUNT_ANNUAL = 30000;
const PIT_FIRST_BRACKET_LIMIT_ANNUAL = 120000;
const PIT_LINEAR_RATE = 0.19;
const HEALTH_MIN_MONTHLY_2026 = 432.54;
const LINEAR_HEALTH_TAX_DEDUCTION_MONTHLY_LIMIT_2026 = 1175;
const RYCZALT_HEALTH_BRACKETS_2026 = {
  lowThreshold: 60000,
  highThreshold: 300000,
  lowMonthly: 498.35,
  midMonthly: 830.58,
  highMonthly: 1495.04,
} as const;

export function grossToNetRevenue(
  gross: number,
  vatStatus: VatStatus,
  vatRate: number,
): { net: number; vat: number } {
  if (vatStatus === 'exempt') {
    return { net: gross, vat: 0 };
  }
  const net = gross / (1 + vatRate);
  const vat = gross - net;
  return { net, vat };
}

export function facilityHourlyRevenue(
  monthlyRateGross: number,
  visitsPerWeek: number,
  hoursPerVisit: number,
): number {
  const monthlyHours = visitsPerWeek * hoursPerVisit * (52 / 12);
  if (monthlyHours <= 0) return 0;
  return monthlyRateGross / monthlyHours;
}

export function calculateOwnerIncomeTax(
  taxableRevenue: number,
  settings: SystemSettingsDto,
  employeeCostsDeductible: number,
  healthContribution: number,
): number {
  const { taxForm, ryczaltRate } = settings;

  if (taxableRevenue <= 0) return 0;

  switch (taxForm) {
    case 'ryczalt': {
      const healthRevenueDeduction = healthContribution * 0.5;
      const base = Math.max(0, taxableRevenue - healthRevenueDeduction);
      return base * ryczaltRate;
    }

    case 'liniowy': {
      const healthDeduction = Math.min(
        healthContribution,
        LINEAR_HEALTH_TAX_DEDUCTION_MONTHLY_LIMIT_2026,
      );
      const base =
        taxableRevenue - employeeCostsDeductible - settings.zusMonthly - healthDeduction;
      return Math.max(0, base * PIT_LINEAR_RATE);
    }

    case 'skala': {
      const monthlyFree = PIT_FREE_AMOUNT_ANNUAL / 12;
      const monthlyFirstLimit = PIT_FIRST_BRACKET_LIMIT_ANNUAL / 12;
      const base =
        taxableRevenue - employeeCostsDeductible - settings.zusMonthly - monthlyFree;
      if (base <= 0) return 0;
      if (base <= monthlyFirstLimit) {
        return base * PIT_FIRST_BRACKET_RATE;
      }
      const firstPart = monthlyFirstLimit * PIT_FIRST_BRACKET_RATE;
      const secondPart = (base - monthlyFirstLimit) * PIT_SECOND_BRACKET_RATE;
      return firstPart + secondPart;
    }

    default:
      return 0;
  }
}

export function calculateOwnerHealthContribution(
  revenueNet: number,
  settings: SystemSettingsDto,
  employeeCostsDeductible: number,
): number {
  if (settings.healthContributionMode === 'manual') {
    return Math.max(0, settings.healthContributionManualMonthly);
  }

  if (settings.taxForm === 'ryczalt') {
    const annualRevenueEstimate = Math.max(0, revenueNet * 12);
    if (annualRevenueEstimate <= RYCZALT_HEALTH_BRACKETS_2026.lowThreshold) {
      return RYCZALT_HEALTH_BRACKETS_2026.lowMonthly;
    }
    if (annualRevenueEstimate <= RYCZALT_HEALTH_BRACKETS_2026.highThreshold) {
      return RYCZALT_HEALTH_BRACKETS_2026.midMonthly;
    }
    return RYCZALT_HEALTH_BRACKETS_2026.highMonthly;
  }

  const baseRate = settings.taxForm === 'liniowy' ? 0.049 : 0.09;
  const effectiveRate = settings.healthRateOverrideEnabled
    ? Math.max(0, settings.healthRateOverride)
    : baseRate;
  const monthlyIncomeBase = Math.max(0, revenueNet - employeeCostsDeductible - settings.zusMonthly);
  const calculated = monthlyIncomeBase * effectiveRate;
  return Math.max(HEALTH_MIN_MONTHLY_2026, calculated);
}

export function getTaxFormLabel(form: TaxForm): string {
  const labels: Record<TaxForm, string> = {
    ryczalt: 'Ryczałt od przychodów ewidencjonowanych',
    skala: 'Skala podatkowa (12% / 32%)',
    liniowy: 'Podatek liniowy (19%)',
  };
  return labels[form];
}
