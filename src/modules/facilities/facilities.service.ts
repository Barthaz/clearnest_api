import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveContractForMonth } from '../../domain/contracts/contract-resolver';
import { mapFacility, mapFacilityContract } from '../../domain/mappers';
import type {
  AuthUserDto,
  FacilityDetailDto,
  FacilityListItemDto,
} from '../../domain/types';
import {
  getWorkerAssignedFacilityIds,
  workerHasFacilityAccess,
} from '../../common/utils/worker-access.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';
import { Prisma } from '@prisma/client';
import { parseDateToDb } from '../../domain/mappers';
import { computeEndTime } from '../../domain/utils/time.utils';

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUserDto, month?: string): Promise<FacilityListItemDto[]> {
    const monthKey = month ?? currentMonthKey();
    const where = await this.buildAccessFilter(user, month);

    const rows = await this.prisma.facility.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        contracts: { orderBy: { startDate: 'asc' } },
      },
    });

    return rows.map((row) => {
      const facility = mapFacility(row);
      const contracts = row.contracts.map(mapFacilityContract);
      return {
        ...facility,
        activeContract: resolveContractForMonth(contracts, monthKey),
      };
    });
  }

  async findOne(id: string, user: AuthUserDto): Promise<FacilityDetailDto> {
    await this.ensureAccess(id, user);

    const row = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        contracts: { orderBy: { startDate: 'asc' } },
      },
    });

    if (!row) {
      throw new NotFoundException('Nie znaleziono placówki');
    }

    return {
      ...mapFacility(row),
      contracts: row.contracts.map(mapFacilityContract),
    };
  }

  async create(dto: CreateFacilityDto) {
    if (!dto.initialContract) {
      throw new BadRequestException('Nowa placówka wymaga co najmniej jednej umowy');
    }

    const contract = dto.initialContract;
    const expectedEnd = computeEndTime(contract.startTime, contract.hoursPerVisit);
    if (expectedEnd !== contract.endTime) {
      throw new BadRequestException(
        'Godzina zakończenia nie jest zgodna z czasem sprzątania i godziną rozpoczęcia',
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          id: dto.id,
          name: dto.name,
          address: dto.address,
          areaM2: dto.areaM2,
        },
      });

      await tx.facilityContract.create({
        data: {
          id: contract.id,
          facilityId: facility.id,
          startDate: parseDateToDb(contract.startDate),
          endDate: contract.endDate ? parseDateToDb(contract.endDate) : null,
          monthlyRateGross: contract.monthlyRateGross,
          hoursPerVisit: contract.hoursPerVisit,
          startTime: contract.startTime,
          endTime: contract.endTime,
          cleaningDays: contract.cleaningDays,
          visitsPerWeek: contract.cleaningDays.length,
        },
      });

      return facility;
    });

    return this.findOne(row.id, {
      id: '',
      username: '',
      role: 'ADMIN',
      accountType: 'user',
    });
  }

  async update(id: string, dto: UpdateFacilityDto) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Nie znaleziono placówki');
    }

    await this.prisma.facility.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        areaM2: dto.areaM2,
      },
    });

    return this.findOne(id, {
      id: '',
      username: '',
      role: 'ADMIN',
      accountType: 'user',
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Nie znaleziono placówki');
    }

    await this.prisma.facility.delete({ where: { id } });
    return { success: true };
  }

  private async buildAccessFilter(
    user: AuthUserDto,
    month?: string,
  ): Promise<Prisma.FacilityWhereInput> {
    if (user.role !== 'WORKER' || !user.employeeId) {
      return {};
    }

    const facilityIds = await getWorkerAssignedFacilityIds(
      this.prisma,
      user.employeeId,
      month,
    );

    return { id: { in: facilityIds } };
  }

  private async ensureAccess(facilityId: string, user: AuthUserDto) {
    if (user.role !== 'WORKER' || !user.employeeId) {
      return;
    }

    const allowed = await workerHasFacilityAccess(
      this.prisma,
      user.employeeId,
      facilityId,
    );
    if (!allowed) {
      throw new ForbiddenException('Brak dostępu do tej placówki');
    }
  }
}
