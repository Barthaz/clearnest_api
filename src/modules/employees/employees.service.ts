import {

  BadRequestException,

  ConflictException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { mapEmployee } from '../../domain/mappers';

import { calculateEmployeeShiftCost, calculateEtatMonthlyLaborCost, getEtatMonthlyBrutto } from '../../domain/payroll/employee-payroll';

import type { AuthUserDto, WorkerEarningsDto } from '../../domain/types';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';



function todayDateString(): string {

  const now = new Date();

  const y = now.getFullYear();

  const m = String(now.getMonth() + 1).padStart(2, '0');

  const d = String(now.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;

}



function isShiftWorked(date: string, status: string, today: string): boolean {

  if (date < today) return true;

  if (date === today && status === 'saved') return true;

  return false;

}



@Injectable()

export class EmployeesService {

  constructor(private readonly prisma: PrismaService) {}



  async findAll() {

    const rows = await this.prisma.employee.findMany({

      orderBy: { name: 'asc' },

    });

    return rows.map(mapEmployee);

  }



  async findMe(user: AuthUserDto) {

    if (!user.employeeId) {

      throw new NotFoundException('Brak powiązanego profilu pracownika');

    }

    return this.findOne(user.employeeId);

  }



  async findOne(id: string) {

    const row = await this.prisma.employee.findUnique({

      where: { id },

    });

    if (!row) {

      throw new NotFoundException('Nie znaleziono pracownika');

    }

    return mapEmployee(row);

  }



  async getMyEarnings(user: AuthUserDto, month: string): Promise<WorkerEarningsDto> {

    if (!user.employeeId) {

      throw new ForbiddenException('Brak profilu pracownika');

    }



    const employee = await this.findOne(user.employeeId);

    const today = todayDateString();



    const [year, monthNum] = month.split('-').map(Number);

    const start = new Date(Date.UTC(year, monthNum - 1, 1));

    const end = new Date(Date.UTC(year, monthNum, 0));



    const shifts = await this.prisma.shift.findMany({

      where: {

        employeeId: user.employeeId,

        shiftDate: { gte: start, lte: end },

      },

      include: { facility: true },

      orderBy: { shiftDate: 'asc' },

    });



    let totalHoursWorked = 0;

    let totalHoursScheduled = 0;

    let grossTotal = 0;

    let netTotal = 0;



    const isEtat = employee.employmentForm === 'etat';
    const monthlyGross = isEtat ? getEtatMonthlyBrutto(employee) : 0;
    const monthlyNet = isEtat ? calculateEtatMonthlyLaborCost(employee).netWages : 0;



    const shiftsBreakdown = shifts.map((shift) => {

      const date = shift.shiftDate.toISOString().slice(0, 10);

      const hours = Number(shift.hours);

      const worked = isShiftWorked(date, shift.status, today);



      totalHoursScheduled += hours;



      let grossAmount = 0;

      let netAmount = 0;



      if (worked) {

        totalHoursWorked += hours;

        if (isEtat) {
          grossAmount = 0;
          netAmount = 0;
        } else {
          grossAmount = hours * employee.hourlyRateGross;
          const cost = calculateEmployeeShiftCost(employee, hours);
          netAmount = cost.netWages;
          grossTotal += grossAmount;
          netTotal += netAmount;
        }

      }



      return {

        shiftId: shift.id,

        date,

        facilityId: shift.facilityId,

        facilityName: shift.facility.name,

        hours,

        grossAmount: Math.round(grossAmount * 100) / 100,

        netAmount: Math.round(netAmount * 100) / 100,

        isWorked: worked,

      };

    });



    if (isEtat) {
      grossTotal = monthlyGross;
      netTotal = monthlyNet;
    }



    return {

      month,

      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,

      totalHoursScheduled: Math.round(totalHoursScheduled * 100) / 100,

      grossTotal: Math.round(grossTotal * 100) / 100,

      netTotal: Math.round(netTotal * 100) / 100,

      shiftsBreakdown,

    };

  }



  async create(dto: CreateEmployeeDto) {

    await this.validateAccountFields(dto.panelEnabled, dto.username, dto.password);



    if (dto.panelEnabled && dto.username) {

      await this.ensureUsernameAvailable(dto.username);

    }



    const passwordHash =

      dto.panelEnabled && dto.password

        ? await bcrypt.hash(dto.password, 10)

        : undefined;



    const row = await this.prisma.employee.create({

      data: {

        id: dto.id,

        name: dto.name,

        hourlyRateGross: dto.hourlyRateGross,

        employmentForm: dto.employmentForm,

        ulgaMlodych: dto.ulgaMlodych ?? false,

        student: dto.student ?? false,

        innyTytul: dto.innyTytul ?? false,

        dobrowolneChorobowe: dto.dobrowolneChorobowe ?? false,

        fpExempt: dto.fpExempt ?? false,

        kupPodwyzszone: dto.kupPodwyzszone ?? false,

        pit2: dto.pit2 ?? true,

        wymiarEtatu: dto.wymiarEtatu ?? 1,

        panelEnabled: dto.panelEnabled ?? false,

        username: dto.panelEnabled ? dto.username : null,

        passwordHash: passwordHash ?? null,

      },

    });



    return mapEmployee(row);

  }



  async update(id: string, dto: UpdateEmployeeDto) {

    const existing = await this.prisma.employee.findUnique({

      where: { id },

    });

    if (!existing) {

      throw new NotFoundException('Nie znaleziono pracownika');

    }



    const panelEnabled = dto.panelEnabled ?? existing.panelEnabled;

    const username = dto.username !== undefined ? dto.username : existing.username ?? undefined;



    if (panelEnabled) {

      if (!username?.trim()) {

        throw new BadRequestException('Login jest wymagany przy włączonym dostępie do panelu');

      }

      if (!dto.password && !existing.passwordHash) {

        throw new BadRequestException('Hasło jest wymagane przy włączonym dostępie do panelu');

      }

    }



    if (username && username !== existing.username) {

      await this.ensureUsernameAvailable(username, id);

    }



    const passwordHash = dto.password

      ? await bcrypt.hash(dto.password, 10)

      : undefined;



    await this.prisma.employee.update({

      where: { id },

      data: {

        name: dto.name,

        hourlyRateGross: dto.hourlyRateGross,

        employmentForm: dto.employmentForm,

        ulgaMlodych: dto.ulgaMlodych,

        student: dto.student,

        innyTytul: dto.innyTytul,

        dobrowolneChorobowe: dto.dobrowolneChorobowe,

        fpExempt: dto.fpExempt,

        kupPodwyzszone: dto.kupPodwyzszone,

        pit2: dto.pit2,

        wymiarEtatu: dto.wymiarEtatu,

        panelEnabled,

        username: panelEnabled ? username ?? null : null,

        passwordHash: panelEnabled

          ? passwordHash ?? existing.passwordHash

          : null,

      },

    });



    return this.findOne(id);

  }



  async remove(id: string) {

    const existing = await this.prisma.employee.findUnique({ where: { id } });

    if (!existing) {

      throw new NotFoundException('Nie znaleziono pracownika');

    }



    await this.prisma.$transaction([

      this.prisma.shift.updateMany({

        where: { employeeId: id },

        data: { employeeId: null, status: 'unassigned' },

      }),

      this.prisma.employee.delete({ where: { id } }),

    ]);



    return { success: true };

  }



  private async validateAccountFields(

    panelEnabled?: boolean,

    username?: string,

    password?: string,

  ) {

    if (!panelEnabled) return;



    if (!username?.trim()) {

      throw new BadRequestException('Login jest wymagany przy włączonym dostępie do panelu');

    }

    if (!password || password.length < 4) {

      throw new BadRequestException('Hasło jest wymagane przy włączonym dostępie do panelu');

    }

  }



  private async ensureUsernameAvailable(username: string, excludeEmployeeId?: string) {

    const existingUser = await this.prisma.user.findUnique({ where: { username } });

    if (existingUser) {

      throw new ConflictException('Login jest już używany przez administratora');

    }



    const existingEmployee = await this.prisma.employee.findFirst({

      where: {

        username,

        ...(excludeEmployeeId ? { NOT: { id: excludeEmployeeId } } : {}),

      },

    });

    if (existingEmployee) {

      throw new ConflictException('Login jest już używany przez innego pracownika');

    }

  }



  ensureWorkerSelfAccess(user: AuthUserDto, employeeId: string) {

    if (user.role === 'WORKER' && user.employeeId !== employeeId) {

      throw new ForbiddenException('Brak dostępu do tego profilu');

    }

  }

}


