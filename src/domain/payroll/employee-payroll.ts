import type { EmployeeDto } from '../types';
import type { ContractType, PayrollInput } from './types';
import { calculatePayroll } from './payroll-engine';

export function employeeToContractType(employee: EmployeeDto): ContractType {
  return employee.employmentForm === 'etat' ? 'etat' : 'zlecenie';
}

export function employeeToPayrollInput(employee: EmployeeDto, brutto: number): PayrollInput {
  return {
    brutto,
    ulgaMlodych: employee.ulgaMlodych,
    student: employee.student,
    innyTytul: employee.innyTytul,
    dobrowolneChorobowe: employee.dobrowolneChorobowe,
    fpExempt: employee.fpExempt,
    kupPodwyzszone: employee.kupPodwyzszone,
    pit2: employee.pit2,
  };
}

export function getEtatMonthlyBrutto(employee: EmployeeDto): number {
  if (employee.employmentForm !== 'etat') return 0;
  return employee.hourlyRateGross * employee.wymiarEtatu;
}

export function calculateEtatMonthlyEmployerCost(employee: EmployeeDto): {
  netWage: number;
  grossWage: number;
  employerZus: number;
  pit: number;
  totalCost: number;
} {
  const grossWage = getEtatMonthlyBrutto(employee);
  if (grossWage <= 0) {
    return { netWage: 0, grossWage: 0, employerZus: 0, pit: 0, totalCost: 0 };
  }

  const result = calculatePayroll('etat', employeeToPayrollInput(employee, grossWage));

  return {
    netWage: result.netto,
    grossWage,
    employerZus: result.emerytalnaP + result.rentowaP + result.wypadkowaP + result.fp + result.fgsp,
    pit: result.zaliczkaPIT,
    totalCost: result.kosztCalkowity,
  };
}

export function calculateHourlyEmployerCost(employee: EmployeeDto): {
  netWage: number;
  grossWage: number;
  employerZus: number;
  pit: number;
  totalCost: number;
} {
  if (employee.employmentForm === 'etat') {
    const monthly = calculateEtatMonthlyEmployerCost(employee);
    const hoursInMonth = 160 * employee.wymiarEtatu;
    if (hoursInMonth <= 0) return monthly;
    return {
      netWage: monthly.netWage / hoursInMonth,
      grossWage: monthly.grossWage / hoursInMonth,
      employerZus: monthly.employerZus / hoursInMonth,
      pit: monthly.pit / hoursInMonth,
      totalCost: monthly.totalCost / hoursInMonth,
    };
  }

  const grossWage = employee.hourlyRateGross;
  if (grossWage <= 0) {
    return { netWage: 0, grossWage: 0, employerZus: 0, pit: 0, totalCost: 0 };
  }

  const result = calculatePayroll(
    employeeToContractType(employee),
    employeeToPayrollInput(employee, grossWage),
  );

  return {
    netWage: result.netto,
    grossWage,
    employerZus: result.emerytalnaP + result.rentowaP + result.wypadkowaP + result.fp + result.fgsp,
    pit: result.zaliczkaPIT,
    totalCost: result.kosztCalkowity,
  };
}

export function calculateEtatMonthlyLaborCost(employee: EmployeeDto): {
  netWages: number;
  employerZus: number;
  pitWithheld: number;
  totalCost: number;
} {
  const monthly = calculateEtatMonthlyEmployerCost(employee);
  return {
    netWages: monthly.netWage,
    employerZus: monthly.employerZus,
    pitWithheld: monthly.pit,
    totalCost: monthly.totalCost,
  };
}

export function calculateEmployeeShiftCost(
  employee: EmployeeDto,
  hours: number,
): {
  netWages: number;
  employerZus: number;
  pitWithheld: number;
  totalCost: number;
} {
  if (employee.employmentForm === 'etat') {
    return { netWages: 0, employerZus: 0, pitWithheld: 0, totalCost: 0 };
  }

  const hourly = calculateHourlyEmployerCost(employee);
  return {
    netWages: hourly.netWage * hours,
    employerZus: hourly.employerZus * hours,
    pitWithheld: hourly.pit * hours,
    totalCost: hourly.totalCost * hours,
  };
}
