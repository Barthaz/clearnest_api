/** Dni tygodnia (0 = poniedziałek) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ShiftStatus = 'scheduled' | 'unassigned' | 'saved';
export type VatStatus = 'active' | 'exempt';
export type TaxForm = 'ryczalt' | 'skala' | 'liniowy';
export type ZusType = 'preferencyjny' | 'standardowy' | 'maly';
export type EmploymentForm = 'zlecenie' | 'etat';
export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER';
export type AuthAccountType = 'user' | 'employee';

export interface FacilityDto {
  id: string;
  name: string;
  address: string;
  areaM2: number;
  cleaningDays: Weekday[];
  visitsPerWeek: number;
  hoursPerVisit: number;
  startTime: string;
  monthlyRateGross: number;
  updatedAt: string;
}

export interface EmployeeDto {
  id: string;
  name: string;
  hourlyRateGross: number;
  employmentForm: EmploymentForm;
  ulgaMlodych: boolean;
  student: boolean;
  innyTytul: boolean;
  dobrowolneChorobowe: boolean;
  fpExempt: boolean;
  kupPodwyzszone: boolean;
  pit2: boolean;
  wymiarEtatu: number;
  username?: string;
  panelEnabled: boolean;
  hasPassword: boolean;
  updatedAt: string;
}

export interface ShiftDto {
  id: string;
  facilityId: string;
  employeeId?: string;
  date: string;
  hours: number;
  startTime: string;
  endTime: string;
  status: ShiftStatus;
  updatedAt?: string;
}

export interface SystemSettingsDto {
  vatStatus: VatStatus;
  vatRate: number;
  zusMonthly: number;
  zusType: ZusType;
  healthContributionMode: 'auto' | 'manual';
  healthContributionManualMonthly: number;
  healthRateOverrideEnabled: boolean;
  healthRateOverride: number;
  taxForm: TaxForm;
  ryczaltRate: number;
  additionalCosts: number;
  vatExemptionThreshold: number;
  updatedAt: string;
}

export interface CustomHolidayDto {
  date: string;
  name?: string;
}

export interface FacilitySkipDayDto {
  date: string;
  facilityId: string;
  name?: string;
}

export interface HolidayInfo {
  date: string;
  name: string;
  source: 'national' | 'custom';
}

export interface AuthUserDto {
  id: string;
  username: string;
  role: UserRole;
  accountType: AuthAccountType;
  employeeId?: string;
}

export interface SyncRevisionsDto {
  month: string;
  facilitiesRevision?: string;
  employeesRevision?: string;
  settingsRevision?: string;
  shiftsRevision?: string;
  holidaysRevision?: string;
  needsScheduleSync?: boolean;
}

export interface WorkerShiftEarningsBreakdown {
  shiftId: string;
  date: string;
  facilityId: string;
  facilityName: string;
  hours: number;
  grossAmount: number;
  netAmount: number;
  isWorked: boolean;
}

export interface WorkerEarningsDto {
  month: string;
  totalHoursWorked: number;
  totalHoursScheduled: number;
  grossTotal: number;
  netTotal: number;
  shiftsBreakdown: WorkerShiftEarningsBreakdown[];
}

export interface EmployeeLaborCost {
  employeeId: string;
  employeeName: string;
  hours: number;
  netWages: number;
  employerZus: number;
  pitWithheld: number;
  totalCost: number;
}

export interface OwnerSelfWorkSummary {
  hours: number;
  imputedRevenue: number;
  savedLaborCost: number;
}

export interface MonthlyFinanceReport {
  month: string;
  revenueGross: number;
  revenueNet: number;
  vatAmount: number;
  employeeLaborCosts: EmployeeLaborCost[];
  totalEmployeeCost: number;
  ownerSelfWork: OwnerSelfWorkSummary;
  zusOwner: number;
  healthContributionOwner: number;
  incomeTax: number;
  additionalCosts: number;
  totalCosts: number;
  profitGross: number;
  profitNet: number;
  marginPercent: number;
  costPerLaborHour: number;
  totalLaborHours: number;
  facilityBreakdown: FacilityFinanceBreakdown[];
}

export interface FacilityFinanceBreakdown {
  facilityId: string;
  facilityName: string;
  revenueGross: number;
  revenueNet: number;
  employeeHours: number;
  ownerHours: number;
  employeeCost: number;
  profitContribution: number;
}

export interface ScheduleConflict {
  type: 'employee' | 'owner';
  date: string;
  shiftIds: [string, string];
  facilityNames: [string, string];
  timeRange: string;
  employeeId?: string;
  employeeName?: string;
  message: string;
}

export const DEFAULT_SETTINGS: Omit<SystemSettingsDto, 'updatedAt'> & { updatedAt?: string } = {
  vatStatus: 'exempt',
  vatRate: 0.23,
  zusMonthly: 1519.19,
  zusType: 'standardowy',
  healthContributionMode: 'auto',
  healthContributionManualMonthly: 432.54,
  healthRateOverrideEnabled: false,
  healthRateOverride: 0.09,
  taxForm: 'ryczalt',
  ryczaltRate: 0.085,
  additionalCosts: 500,
  vatExemptionThreshold: 200000,
};
