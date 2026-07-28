import type { EmployeeDto, SystemSettingsDto, TaxForm, VatStatus } from '../types';
import { calculateHourlyEmployerCost, calculateEmployeeShiftCost } from '../payroll/employee-payroll';

export { calculateHourlyEmployerCost, calculateEmployeeShiftCost };

const PIT_FIRST_BRACKET_RATE = 0.12;
const PIT_SECOND_BRACKET_RATE = 0.32;
const PIT_FREE_AMOUNT_ANNUAL = 30000;
const PIT_FIRST_BRACKET_LIMIT_ANNUAL = 120000;
const PIT_FREE_AMOUNT_MAX_RELIEF_ANNUAL = PIT_FREE_AMOUNT_ANNUAL * PIT_FIRST_BRACKET_RATE;
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

function roundOwnerTax(amount: number): number {
  return Math.max(0, Math.round(amount));
}

export function calculateOwnerTaxableIncome(
  revenueNet: number,
  settings: SystemSettingsDto,
  businessCostsDeductible: number,
): number {
  if (settings.taxForm === 'ryczalt') return revenueNet;
  return Math.max(0, revenueNet - businessCostsDeductible - settings.zusMonthly);
}

export function calculateProgressivePitMonthly(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;

  const monthlyFirstLimit = PIT_FIRST_BRACKET_LIMIT_ANNUAL / 12;
  if (taxableIncome <= monthlyFirstLimit) {
    return taxableIncome * PIT_FIRST_BRACKET_RATE;
  }

  return (
    monthlyFirstLimit * PIT_FIRST_BRACKET_RATE +
    (taxableIncome - monthlyFirstLimit) * PIT_SECOND_BRACKET_RATE
  );
}

export function calculateKwotaWolnaReliefAnnual(annualTaxableIncome: number): number {
  if (annualTaxableIncome <= 0) return 0;
  if (annualTaxableIncome <= PIT_FIRST_BRACKET_LIMIT_ANNUAL) {
    return PIT_FREE_AMOUNT_MAX_RELIEF_ANNUAL;
  }

  const relief =
    PIT_FREE_AMOUNT_MAX_RELIEF_ANNUAL -
    (annualTaxableIncome - PIT_FIRST_BRACKET_LIMIT_ANNUAL) * PIT_FIRST_BRACKET_RATE;
  return Math.max(0, relief);
}

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
  revenueNet: number,
  settings: SystemSettingsDto,
  businessCostsDeductible: number,
  _healthContribution: number,
): number {
  return calculateOwnerIncomeTaxSettlement(revenueNet, settings, businessCostsDeductible).accrued;
}

function getOwnerHealthTaxCreditRate(settings: SystemSettingsDto): number {
  if (settings.taxForm === 'liniowy') {
    return settings.healthRateOverrideEnabled
      ? Math.max(0, settings.healthRateOverride)
      : 0.049;
  }
  if (settings.taxForm === 'skala') {
    return settings.healthRateOverrideEnabled
      ? Math.max(0, settings.healthRateOverride)
      : 0.09;
  }
  return 0;
}

export function calculateOwnerHealthTaxCredit(
  taxableIncome: number,
  settings: SystemSettingsDto,
  taxAfterRelief: number,
): number {
  if (settings.taxForm === 'ryczalt' || taxAfterRelief <= 0 || taxableIncome <= 0) {
    return 0;
  }

  const incomeBasedCredit = taxableIncome * getOwnerHealthTaxCreditRate(settings);

  if (settings.taxForm === 'liniowy') {
    return Math.round(
      Math.min(
        incomeBasedCredit,
        LINEAR_HEALTH_TAX_DEDUCTION_MONTHLY_LIMIT_2026,
        taxAfterRelief,
      ),
    );
  }

  return Math.round(Math.min(incomeBasedCredit, taxAfterRelief));
}

export interface OwnerIncomeTaxSettlement {
  accrued: number;
  healthCredit: number;
  payable: number;
}

export function calculateOwnerIncomeTaxSettlement(
  revenueNet: number,
  settings: SystemSettingsDto,
  businessCostsDeductible: number,
): OwnerIncomeTaxSettlement {
  const { taxForm, ryczaltRate } = settings;

  if (revenueNet <= 0) {
    return { accrued: 0, healthCredit: 0, payable: 0 };
  }

  switch (taxForm) {
    case 'ryczalt': {
      const healthContribution = calculateOwnerHealthContribution(
        revenueNet,
        settings,
        businessCostsDeductible,
      );
      const healthRevenueDeduction = healthContribution * 0.5;
      const base = Math.max(0, revenueNet - healthRevenueDeduction);
      const payable = roundOwnerTax(base * ryczaltRate);
      return { accrued: payable, healthCredit: 0, payable };
    }

    case 'liniowy': {
      const taxableIncome = calculateOwnerTaxableIncome(
        revenueNet,
        settings,
        businessCostsDeductible,
      );
      const accrued = roundOwnerTax(taxableIncome * PIT_LINEAR_RATE);
      const healthCredit = calculateOwnerHealthTaxCredit(taxableIncome, settings, accrued);
      const payable = roundOwnerTax(Math.max(0, accrued - healthCredit));
      return { accrued, healthCredit, payable };
    }

    case 'skala': {
      const taxableIncome = calculateOwnerTaxableIncome(
        revenueNet,
        settings,
        businessCostsDeductible,
      );
      const taxBeforeRelief = calculateProgressivePitMonthly(taxableIncome);
      const kwotaWolnaRelief =
        calculateKwotaWolnaReliefAnnual(taxableIncome * 12) / 12;
      const accrued = roundOwnerTax(Math.max(0, taxBeforeRelief - kwotaWolnaRelief));
      const healthCredit = calculateOwnerHealthTaxCredit(taxableIncome, settings, accrued);
      const payable = roundOwnerTax(Math.max(0, accrued - healthCredit));
      return { accrued, healthCredit, payable };
    }

    default:
      return { accrued: 0, healthCredit: 0, payable: 0 };
  }
}

export function calculateOwnerHealthContribution(
  revenueNet: number,
  settings: SystemSettingsDto,
  businessCostsDeductible: number,
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
  const monthlyIncomeBase = calculateOwnerTaxableIncome(
    revenueNet,
    settings,
    businessCostsDeductible,
  );
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
