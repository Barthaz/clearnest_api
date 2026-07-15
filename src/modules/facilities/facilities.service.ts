import {

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { computeEndTime } from '../../domain/utils/time.utils';
import { formatDateFromDb } from '../../domain/mappers';

import { mapFacility } from '../../domain/mappers';

import type { AuthUserDto } from '../../domain/types';

import {

  getWorkerAssignedFacilityIds,

  workerHasFacilityAccess,

} from '../../common/utils/worker-access.utils';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateFacilityDto, UpdateFacilityDto } from './dto/facility.dto';



@Injectable()

export class FacilitiesService {

  constructor(private readonly prisma: PrismaService) {}



  async findAll(user: AuthUserDto, month?: string) {

    const where = await this.buildAccessFilter(user, month);

    const rows = await this.prisma.facility.findMany({ where, orderBy: { name: 'asc' } });

    return rows.map(mapFacility);

  }



  async findOne(id: string, user: AuthUserDto) {

    await this.ensureAccess(id, user);

    const row = await this.prisma.facility.findUnique({ where: { id } });

    if (!row) {

      throw new NotFoundException('Nie znaleziono placówki');

    }

    return mapFacility(row);

  }



  async create(dto: CreateFacilityDto) {

    const row = await this.prisma.facility.create({

      data: {

        id: dto.id,

        name: dto.name,

        address: dto.address,

        areaM2: dto.areaM2,

        cleaningDays: dto.cleaningDays,

        visitsPerWeek: dto.cleaningDays.length,

        hoursPerVisit: dto.hoursPerVisit,

        startTime: dto.startTime,

        monthlyRateGross: dto.monthlyRateGross,

      },

    });

    return mapFacility(row);

  }



  async update(id: string, dto: UpdateFacilityDto) {

    const existing = await this.prisma.facility.findUnique({ where: { id } });

    if (!existing) {

      throw new NotFoundException('Nie znaleziono placówki');

    }



    const oldHoursPerVisit = Number(existing.hoursPerVisit);

    const oldStartTime = existing.startTime;

    const hoursPerVisit = dto.hoursPerVisit ?? oldHoursPerVisit;

    const startTime = dto.startTime ?? oldStartTime;

    const today = formatDateFromDb(new Date());



    const row = await this.prisma.$transaction(async (tx) => {

      const updated = await tx.facility.update({

        where: { id },

        data: {

          name: dto.name,

          address: dto.address,

          areaM2: dto.areaM2,

          cleaningDays: dto.cleaningDays as Prisma.InputJsonValue | undefined,

          visitsPerWeek: dto.cleaningDays ? dto.cleaningDays.length : undefined,

          hoursPerVisit: dto.hoursPerVisit,

          startTime: dto.startTime,

          monthlyRateGross: dto.monthlyRateGross,

        },

      });



      const endTime = computeEndTime(startTime, hoursPerVisit);

      await tx.shift.updateMany({

        where: {

          facilityId: id,

          status: { not: 'saved' },

          shiftDate: { gte: new Date(`${today}T00:00:00.000Z`) },

          hours: oldHoursPerVisit,

          startTime: oldStartTime,

        },

        data: {

          hours: hoursPerVisit,

          startTime,

          endTime,

        },

      });



      return updated;

    });



    return mapFacility(row);

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


