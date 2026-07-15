import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { wouldCreateConflict } from '../../domain/conflicts/conflict.service';
import { parseDateToDb, mapShift } from '../../domain/mappers';
import {
  assignEmployeeToShift,
  clearSavedShiftAssignment,
  generateShiftsForMonth,
  needsScheduleSync,
  saveShiftAssignment,
  unsaveShiftAssignment,
  updateShiftActualHours,
} from '../../domain/schedule/schedule.service';
import type { AuthUserDto, ShiftDto } from '../../domain/types';
import { DataContextService } from '../../common/services/data-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataContext: DataContextService,
  ) {}

  async findByMonth(month: string, user: AuthUserDto) {
    const shifts = await this.dataContext.getShiftsForMonth(month);
    return this.filterForUser(shifts, user);
  }

  async getSyncStatus(month: string) {
    const ctx = await this.dataContext.loadAppContext(month);
    return {
      month,
      needsSync: needsScheduleSync(
        month,
        ctx.facilities,
        ctx.shifts,
        ctx.customHolidays,
        ctx.facilitySkips,
      ),
    };
  }

  async generate(month: string) {
    const ctx = await this.dataContext.loadAppContext();
    const generated = generateShiftsForMonth(
      month,
      ctx.facilities,
      ctx.shifts.filter((s) => s.date.startsWith(month)),
      ctx.customHolidays,
      ctx.facilitySkips,
      ctx.shifts,
    );

    await this.persistShifts(generated, month);
    return { shifts: generated.filter((s) => s.date.startsWith(month)) };
  }

  async assign(shiftId: string, employeeId: string | undefined) {
    const allShifts = await this.dataContext.getShifts();
    const result = assignEmployeeToShift(shiftId, employeeId, allShifts, wouldCreateConflict);

    if (result.error) {
      return { error: result.error };
    }

    const shift = result.shift!;
    await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        employeeId: shift.employeeId ?? null,
        status: shift.status,
      },
    });

    return { shift };
  }

  async save(shiftId: string) {
    const shift = await this.findShiftOrThrow(shiftId);
    const result = saveShiftAssignment(shift);
    if (result.error) return { error: result.error };

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: result.shift!.status },
    });

    return { shift: result.shift };
  }

  async unsave(shiftId: string) {
    const shift = await this.findShiftOrThrow(shiftId);
    const updated = unsaveShiftAssignment(shift);

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { status: updated.status },
    });

    return { shift: updated };
  }

  async clear(shiftId: string) {
    const shift = await this.findShiftOrThrow(shiftId);
    const updated = clearSavedShiftAssignment(shift);

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: { employeeId: null, status: updated.status },
    });

    return { shift: updated };
  }

  async updateHours(shiftId: string, hours: number) {
    const shift = await this.findShiftOrThrow(shiftId);
    const result = updateShiftActualHours(shift, hours);

    if (result.error) {
      return { error: result.error };
    }

    await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        hours: result.shift!.hours,
        endTime: result.shift!.endTime,
      },
    });

    return { shift: result.shift };
  }

  private async findShiftOrThrow(shiftId: string): Promise<ShiftDto> {
    const row = await this.prisma.shift.findUnique({ where: { id: shiftId } });
    if (!row) {
      throw new NotFoundException('Nie znaleziono zmiany');
    }
    return mapShift(row);
  }

  private filterForUser(shifts: ShiftDto[], user: AuthUserDto) {
    if (user.role !== 'WORKER') {
      return shifts;
    }

    if (!user.employeeId) {
      return [];
    }

    return shifts.filter((s) => s.employeeId === user.employeeId);
  }

  private async persistShifts(shifts: ShiftDto[], month: string) {
    const monthShifts = shifts.filter((s) => s.date.startsWith(month));

    await this.prisma.$transaction(async (tx) => {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, mon - 1, 1));
      const end = new Date(Date.UTC(year, mon, 0));

      await tx.shift.deleteMany({
        where: { shiftDate: { gte: start, lte: end } },
      });

      for (const shift of monthShifts) {
        await tx.shift.create({
          data: {
            id: shift.id,
            facilityId: shift.facilityId,
            employeeId: shift.employeeId ?? null,
            shiftDate: parseDateToDb(shift.date),
            hours: shift.hours,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: shift.status,
          },
        });
      }
    });
  }

  ensureWorkerReadOnly(user: AuthUserDto) {
    if (user.role === 'WORKER') {
      throw new ForbiddenException('Brak uprawnień do edycji grafiku');
    }
  }
}
