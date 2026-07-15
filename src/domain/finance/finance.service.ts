import type {
  EmployeeDto,
  EmployeeLaborCost,
  FacilityDto,
  FacilityFinanceBreakdown,
  MonthlyFinanceReport,
  ShiftDto,
  SystemSettingsDto,
} from '../types';
import {
  calculateEmployeeShiftCost,
  calculateEtatMonthlyLaborCost,
} from '../payroll/employee-payroll';
import {
  calculateOwnerHealthContribution,
  calculateOwnerIncomeTax,
  facilityHourlyRevenue,
  grossToNetRevenue,
} from '../utils/tax-calculator.utils';

function buildEtatLaborCosts(
  employees: EmployeeDto[],
  shifts: ShiftDto[],
): EmployeeLaborCost[] {
  const etatEmployees = employees.filter((e) => e.employmentForm === 'etat');
  const costs: EmployeeLaborCost[] = [];

  for (const emp of etatEmployees) {
    const employeeShifts = shifts.filter((s) => s.employeeId === emp.id);
    const labor = calculateEtatMonthlyLaborCost(emp);
    costs.push({
      employeeId: emp.id,
      employeeName: emp.name,
      hours: employeeShifts.reduce((sum, s) => sum + s.hours, 0),
      netWages: labor.netWages,
      employerZus: labor.employerZus,
      pitWithheld: labor.pitWithheld,
      totalCost: labor.totalCost,
    });
  }

  return costs;
}

function allocateEtatFacilityCost(
  employee: EmployeeDto,
  facilityId: string,
  shifts: ShiftDto[],
): number {
  const employeeShifts = shifts.filter((s) => s.employeeId === employee.id);
  const totalHours = employeeShifts.reduce((sum, s) => sum + s.hours, 0);
  if (totalHours <= 0) return 0;

  const facilityHours = employeeShifts
    .filter((s) => s.facilityId === facilityId)
    .reduce((sum, s) => sum + s.hours, 0);

  const monthlyCost = calculateEtatMonthlyLaborCost(employee).totalCost;
  return monthlyCost * (facilityHours / totalHours);
}

export function calculateMonthlyReport(
  monthKey: string,
  facilities: FacilityDto[],
  employees: EmployeeDto[],
  settings: SystemSettingsDto,
  shifts: ShiftDto[],
): MonthlyFinanceReport {
  let revenueGross = 0;
  let revenueNet = 0;
  let vatAmount = 0;

  const facilityBreakdown: FacilityFinanceBreakdown[] = [];

  for (const facility of facilities) {
    const { net, vat } = grossToNetRevenue(
      facility.monthlyRateGross,
      settings.vatStatus,
      settings.vatRate,
    );
    revenueGross += facility.monthlyRateGross;
    revenueNet += net;
    vatAmount += vat;

    const facilityShifts = shifts.filter((s) => s.facilityId === facility.id);
    const employeeHours = facilityShifts
      .filter((s) => s.employeeId)
      .reduce((sum, s) => sum + s.hours, 0);
    const ownerHours = facilityShifts
      .filter((s) => !s.employeeId)
      .reduce((sum, s) => sum + s.hours, 0);

    let employeeCost = 0;
    for (const shift of facilityShifts) {
      if (!shift.employeeId) continue;
      const emp = employees.find((e) => e.id === shift.employeeId);
      if (!emp) continue;

      if (emp.employmentForm === 'etat') {
        continue;
      }

      employeeCost += calculateEmployeeShiftCost(emp, shift.hours).totalCost;
    }

    const etatEmployees = employees.filter((e) => e.employmentForm === 'etat');
    for (const emp of etatEmployees) {
      employeeCost += allocateEtatFacilityCost(emp, facility.id, shifts);
    }

    facilityBreakdown.push({
      facilityId: facility.id,
      facilityName: facility.name,
      revenueGross: facility.monthlyRateGross,
      revenueNet: net,
      employeeHours,
      ownerHours,
      employeeCost,
      profitContribution: net - employeeCost,
    });
  }

  const employeeLaborMap = new Map<string, EmployeeLaborCost>();

  for (const shift of shifts) {
    if (!shift.employeeId) continue;
    const emp = employees.find((e) => e.id === shift.employeeId);
    if (!emp || emp.employmentForm === 'etat') continue;

    const cost = calculateEmployeeShiftCost(emp, shift.hours);
    const existing = employeeLaborMap.get(emp.id);

    if (existing) {
      existing.hours += shift.hours;
      existing.netWages += cost.netWages;
      existing.employerZus += cost.employerZus;
      existing.pitWithheld += cost.pitWithheld;
      existing.totalCost += cost.totalCost;
    } else {
      employeeLaborMap.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        hours: shift.hours,
        netWages: cost.netWages,
        employerZus: cost.employerZus,
        pitWithheld: cost.pitWithheld,
        totalCost: cost.totalCost,
      });
    }
  }

  for (const etatCost of buildEtatLaborCosts(employees, shifts)) {
    employeeLaborMap.set(etatCost.employeeId, etatCost);
  }

  const employeeLaborCosts = Array.from(employeeLaborMap.values());
  const totalEmployeeCost = employeeLaborCosts.reduce((s, c) => s + c.totalCost, 0);

  const ownerHours = shifts
    .filter((s) => !s.employeeId)
    .reduce((sum, s) => sum + s.hours, 0);

  let imputedRevenue = 0;
  for (const shift of shifts.filter((s) => !s.employeeId)) {
    const facility = facilities.find((f) => f.id === shift.facilityId);
    if (facility) {
      const hourlyRate = facilityHourlyRevenue(
        facility.monthlyRateGross,
        facility.visitsPerWeek,
        facility.hoursPerVisit,
      );
      const { net } = grossToNetRevenue(hourlyRate, settings.vatStatus, settings.vatRate);
      imputedRevenue += net * shift.hours;
    }
  }

  const avgEmployeeHourlyCost =
    employeeLaborCosts.length > 0
      ? totalEmployeeCost / employeeLaborCosts.reduce((s, c) => s + c.hours, 0)
      : 0;
  const savedLaborCost = ownerHours * avgEmployeeHourlyCost;

  const zusOwner = settings.zusMonthly;
  const employeeCostsDeductible = settings.taxForm === 'ryczalt' ? 0 : totalEmployeeCost;
  const healthContributionOwner = calculateOwnerHealthContribution(
    revenueNet,
    settings,
    employeeCostsDeductible,
  );

  const incomeTax = calculateOwnerIncomeTax(
    revenueNet,
    settings,
    employeeCostsDeductible,
    healthContributionOwner,
  );

  const additionalCosts = settings.additionalCosts;
  const totalCosts =
    totalEmployeeCost + zusOwner + healthContributionOwner + incomeTax + additionalCosts;
  const profitGross = revenueNet - totalEmployeeCost - additionalCosts;
  const profitNet = revenueNet - totalCosts;

  const totalLaborHours = shifts.reduce((s, sh) => s + sh.hours, 0);
  const costPerLaborHour =
    totalLaborHours > 0
      ? (totalEmployeeCost + zusOwner + healthContributionOwner + incomeTax) / totalLaborHours
      : 0;

  const marginPercent = revenueNet > 0 ? (profitNet / revenueNet) * 100 : 0;

  return {
    month: monthKey,
    revenueGross,
    revenueNet,
    vatAmount,
    employeeLaborCosts,
    totalEmployeeCost,
    ownerSelfWork: {
      hours: ownerHours,
      imputedRevenue,
      savedLaborCost,
    },
    zusOwner,
    healthContributionOwner,
    incomeTax,
    additionalCosts,
    totalCosts,
    profitGross,
    profitNet,
    marginPercent,
    costPerLaborHour,
    totalLaborHours,
    facilityBreakdown,
  };
}

export function calculateDashboardKpis(
  monthKey: string,
  facilities: FacilityDto[],
  employees: EmployeeDto[],
  settings: SystemSettingsDto,
  shifts: ShiftDto[],
) {
  const report = calculateMonthlyReport(monthKey, facilities, employees, settings, shifts);

  return {
    revenue: report.revenueNet,
    costs: report.totalCosts,
    profit: report.profitNet,
    margin: report.marginPercent,
    facilityCount: facilities.length,
    employeeCount: employees.length,
    ownerHours: report.ownerSelfWork.hours,
    report,
  };
}

export function getEmployeeMonthlyCost(
  employeeId: string,
  monthKey: string,
  employees: EmployeeDto[],
  shifts: ShiftDto[],
): number {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return 0;

  if (emp.employmentForm === 'etat') {
    return calculateEtatMonthlyLaborCost(emp).totalCost;
  }

  const employeeShifts = shifts.filter(
    (s) => s.date.startsWith(monthKey) && s.employeeId === employeeId,
  );

  return employeeShifts.reduce(
    (sum, s) => sum + calculateEmployeeShiftCost(emp, s.hours).totalCost,
    0,
  );
}
