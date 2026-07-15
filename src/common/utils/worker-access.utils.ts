import type { PrismaService } from '../../prisma/prisma.service';

function monthDateRange(month: string): { start: Date; endExclusive: Date } {
  const [year, monthNum] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNum - 1, 1)),
    endExclusive: new Date(Date.UTC(year, monthNum, 1)),
  };
}

export async function getWorkerAssignedFacilityIds(
  prisma: PrismaService,
  employeeId: string,
  month?: string,
): Promise<string[]> {
  const where: { employeeId: string; shiftDate?: { gte: Date; lt: Date } } = {
    employeeId,
  };

  if (month) {
    const { start, endExclusive } = monthDateRange(month);
    where.shiftDate = { gte: start, lt: endExclusive };
  }

  const rows = await prisma.shift.findMany({
    where,
    select: { facilityId: true },
    distinct: ['facilityId'],
  });

  return rows.map((r) => r.facilityId);
}

export async function workerHasFacilityAccess(
  prisma: PrismaService,
  employeeId: string,
  facilityId: string,
): Promise<boolean> {
  const shift = await prisma.shift.findFirst({
    where: { employeeId, facilityId },
    select: { id: true },
  });
  return Boolean(shift);
}
