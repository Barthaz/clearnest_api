import type {

  EmployeeDto,

  EmployeeLaborCost,

  FacilityContractDto,

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

  calculateOwnerIncomeTaxSettlement,

  facilityHourlyRevenue,

  grossToNetRevenue,

} from '../utils/tax-calculator.utils';

import {

  calculateFacilityMonthlyRevenueGross,

  monthOverlapsContract,

  resolveContractForDate,

} from '../contracts/contract-resolver';



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



function getContractsForFacility(

  facilityId: string,

  contractsByFacility: Map<string, FacilityContractDto[]>,

): FacilityContractDto[] {

  return contractsByFacility.get(facilityId) ?? [];

}



export function calculateMonthlyReport(

  monthKey: string,

  facilities: FacilityDto[],

  facilityContracts: FacilityContractDto[],

  employees: EmployeeDto[],

  settings: SystemSettingsDto,

  shifts: ShiftDto[],

): MonthlyFinanceReport {

  let revenueGross = 0;

  let revenueNet = 0;

  let vatAmount = 0;



  const contractsByFacility = new Map<string, FacilityContractDto[]>();

  for (const contract of facilityContracts) {

    const list = contractsByFacility.get(contract.facilityId) ?? [];

    list.push(contract);

    contractsByFacility.set(contract.facilityId, list);

  }



  const facilityBreakdown: FacilityFinanceBreakdown[] = [];



  for (const facility of facilities) {

    const contracts = getContractsForFacility(facility.id, contractsByFacility);

    const facilityRevenueGross = calculateFacilityMonthlyRevenueGross(contracts, monthKey);



    const { net, vat } = grossToNetRevenue(

      facilityRevenueGross,

      settings.vatStatus,

      settings.vatRate,

    );

    revenueGross += facilityRevenueGross;

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

      revenueGross: facilityRevenueGross,

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

    const contracts = getContractsForFacility(shift.facilityId, contractsByFacility);

    const contract = resolveContractForDate(contracts, shift.date);

    if (contract) {

      const hourlyRate = facilityHourlyRevenue(

        contract.monthlyRateGross,

        contract.visitsPerWeek,

        contract.hoursPerVisit,

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

  const businessCostsDeductible =

    settings.taxForm === 'ryczalt' ? 0 : totalEmployeeCost + settings.additionalCosts;

  const healthContributionOwner = calculateOwnerHealthContribution(

    revenueNet,

    settings,

    businessCostsDeductible,

  );



  const ownerTax = calculateOwnerIncomeTaxSettlement(

    revenueNet,

    settings,

    businessCostsDeductible,

  );



  const additionalCosts = settings.additionalCosts;

  const totalCosts =

    totalEmployeeCost +

    zusOwner +

    healthContributionOwner +

    ownerTax.payable +

    additionalCosts;

  const profitGross = revenueNet - totalEmployeeCost - additionalCosts;

  const profitNet = revenueNet - totalCosts;



  const totalLaborHours = shifts.reduce((s, sh) => s + sh.hours, 0);

  const costPerLaborHour =

    totalLaborHours > 0

      ? (totalEmployeeCost + zusOwner + healthContributionOwner + ownerTax.payable) /

        totalLaborHours

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

    incomeTax: ownerTax.accrued,

    incomeTaxHealthCredit: ownerTax.healthCredit,

    incomeTaxKwotaWolnaRelief: ownerTax.kwotaWolnaRelief,

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

  facilityContracts: FacilityContractDto[],

  employees: EmployeeDto[],

  settings: SystemSettingsDto,

  shifts: ShiftDto[],

) {

  const report = calculateMonthlyReport(

    monthKey,

    facilities,

    facilityContracts,

    employees,

    settings,

    shifts,

  );



  const contractsByFacility = new Map<string, FacilityContractDto[]>();

  for (const contract of facilityContracts) {

    const list = contractsByFacility.get(contract.facilityId) ?? [];

    list.push(contract);

    contractsByFacility.set(contract.facilityId, list);

  }



  const activeFacilityCount = facilities.filter((facility) => {

    const contracts = contractsByFacility.get(facility.id) ?? [];

    return contracts.some((contract) => monthOverlapsContract(monthKey, contract));

  }).length;



  return {

    revenue: report.revenueNet,

    costs: report.totalCosts,

    profit: report.profitNet,

    margin: report.marginPercent,

    facilityCount: activeFacilityCount,

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


