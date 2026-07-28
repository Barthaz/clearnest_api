import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { contractsOverlap } from '../../domain/contracts/contract-resolver';
import {
  formatDateFromDb,
  mapFacilityContract,
  parseDateToDb,
} from '../../domain/mappers';
import type { AuthUserDto, FacilityContractDto } from '../../domain/types';
import { computeEndTime } from '../../domain/utils/time.utils';
import { workerHasFacilityAccess } from '../../common/utils/worker-access.utils';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateFacilityContractDto,
  UpdateFacilityContractDto,
} from './dto/facility-contract.dto';

@Injectable()
export class FacilityContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFacility(facilityId: string, user: AuthUserDto): Promise<FacilityContractDto[]> {
    await this.ensureFacilityExists(facilityId);
    await this.ensureAccess(facilityId, user);

    const rows = await this.prisma.facilityContract.findMany({
      where: { facilityId },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(mapFacilityContract);
  }

  async create(
    facilityId: string,
    dto: CreateFacilityContractDto,
  ): Promise<FacilityContractDto> {
    await this.ensureFacilityExists(facilityId);
    this.validateContractDates(dto.startDate, dto.endDate);
    this.validateTimeFields(dto.startTime, dto.endTime, dto.hoursPerVisit);

    const existing = await this.prisma.facilityContract.findMany({
      where: { facilityId },
      orderBy: { startDate: 'asc' },
    });

    this.assertNoOverlap(existing.map(mapFacilityContract), dto.startDate, dto.endDate);
    this.assertSingleOpenEnded(existing, dto.endDate);

    const row = await this.prisma.facilityContract.create({
      data: {
        id: dto.id,
        facilityId,
        startDate: parseDateToDb(dto.startDate),
        endDate: dto.endDate ? parseDateToDb(dto.endDate) : null,
        monthlyRateGross: dto.monthlyRateGross,
        hoursPerVisit: dto.hoursPerVisit,
        startTime: dto.startTime,
        endTime: dto.endTime,
        cleaningDays: dto.cleaningDays,
        visitsPerWeek: dto.cleaningDays.length,
      },
    });

    await this.syncFutureShifts(facilityId, mapFacilityContract(row));
    return mapFacilityContract(row);
  }

  async update(id: string, dto: UpdateFacilityContractDto): Promise<FacilityContractDto> {
    const existing = await this.prisma.facilityContract.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Nie znaleziono umowy');
    }

    const startDate = dto.startDate ?? formatDateFromDb(existing.startDate);
    const endDate =
      dto.endDate === null
        ? undefined
        : dto.endDate ?? (existing.endDate ? formatDateFromDb(existing.endDate) : undefined);

    this.validateContractDates(startDate, endDate);

    const hoursPerVisit =
      dto.hoursPerVisit ?? Number(existing.hoursPerVisit);
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    this.validateTimeFields(startTime, endTime, hoursPerVisit);

    const siblings = await this.prisma.facilityContract.findMany({
      where: { facilityId: existing.facilityId, NOT: { id } },
      orderBy: { startDate: 'asc' },
    });

    this.assertNoOverlap(
      siblings.map(mapFacilityContract),
      startDate,
      endDate,
    );
    this.assertSingleOpenEnded(siblings, endDate);

    const row = await this.prisma.facilityContract.update({
      where: { id },
      data: {
        startDate: dto.startDate ? parseDateToDb(dto.startDate) : undefined,
        endDate:
          dto.endDate === null
            ? null
            : dto.endDate
              ? parseDateToDb(dto.endDate)
              : undefined,
        monthlyRateGross: dto.monthlyRateGross,
        hoursPerVisit: dto.hoursPerVisit,
        startTime: dto.startTime,
        endTime: dto.endTime,
        cleaningDays: dto.cleaningDays as Prisma.InputJsonValue | undefined,
        visitsPerWeek: dto.cleaningDays ? dto.cleaningDays.length : undefined,
      },
    });

    await this.syncFutureShifts(existing.facilityId, mapFacilityContract(row));
    return mapFacilityContract(row);
  }

  async remove(id: string) {
    const existing = await this.prisma.facilityContract.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Nie znaleziono umowy');
    }

    const count = await this.prisma.facilityContract.count({
      where: { facilityId: existing.facilityId },
    });
    if (count <= 1) {
      throw new BadRequestException('Placówka musi mieć co najmniej jedną umowę');
    }

    await this.prisma.facilityContract.delete({ where: { id } });
    return { success: true };
  }

  private async ensureFacilityExists(facilityId: string) {
    const facility = await this.prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) {
      throw new NotFoundException('Nie znaleziono placówki');
    }
  }

  private async ensureAccess(facilityId: string, user: AuthUserDto) {
    if (user.role !== 'WORKER' || !user.employeeId) return;

    const allowed = await workerHasFacilityAccess(
      this.prisma,
      user.employeeId,
      facilityId,
    );
    if (!allowed) {
      throw new ForbiddenException('Brak dostępu do tej placówki');
    }
  }

  private validateContractDates(startDate: string, endDate?: string) {
    if (endDate && startDate > endDate) {
      throw new BadRequestException('Data rozpoczęcia nie może być późniejsza niż data zakończenia');
    }
  }

  private validateTimeFields(startTime: string, endTime: string, hoursPerVisit: number) {
    const expectedEnd = computeEndTime(startTime, hoursPerVisit);
    if (expectedEnd !== endTime) {
      throw new BadRequestException(
        'Godzina zakończenia nie jest zgodna z czasem sprzątania i godziną rozpoczęcia',
      );
    }
  }

  private assertNoOverlap(
    existing: FacilityContractDto[],
    startDate: string,
    endDate?: string,
  ) {
    for (const contract of existing) {
      if (contractsOverlap(startDate, endDate, contract.startDate, contract.endDate)) {
        throw new BadRequestException('Umowa nakłada się z inną umową tej placówki');
      }
    }
  }

  private assertSingleOpenEnded(
    existing: { endDate: Date | null }[],
    endDate?: string,
  ) {
    if (endDate) return;
    const openEnded = existing.filter((c) => !c.endDate);
    if (openEnded.length > 0) {
      throw new BadRequestException(
        'Placówka może mieć tylko jedną umowę na czas nieokreślony',
      );
    }
  }

  private async syncFutureShifts(facilityId: string, contract: FacilityContractDto) {
    const today = formatDateFromDb(new Date());
    await this.prisma.shift.updateMany({
      where: {
        facilityId,
        status: { not: 'saved' },
        shiftDate: { gte: parseDateToDb(today) },
      },
      data: {
        hours: contract.hoursPerVisit,
        startTime: contract.startTime,
        endTime: contract.endTime,
      },
    });
  }
}
