import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthAccountType, AuthUserDto } from '../../domain/types';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  accountType: AuthAccountType;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<AuthUserDto | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (user?.isActive) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (valid) {
        return {
          id: user.id,
          username: user.username,
          role: user.role as AuthUserDto['role'],
          accountType: 'user',
        };
      }
    }

    const employee = await this.prisma.employee.findUnique({
      where: { username },
    });

    if (
      employee?.panelEnabled &&
      employee.passwordHash
    ) {
      const valid = await bcrypt.compare(password, employee.passwordHash);
      if (valid) {
        return {
          id: employee.id,
          username: employee.username!,
          role: 'WORKER',
          accountType: 'employee',
          employeeId: employee.id,
        };
      }
    }

    return null;
  }

  async login(username: string, password: string) {
    const authUser = await this.validateCredentials(username, password);
    if (!authUser) {
      throw new UnauthorizedException('Nieprawidłowy login lub hasło');
    }

    const payload: JwtPayload = {
      sub: authUser.id,
      username: authUser.username,
      role: authUser.role,
      accountType: authUser.accountType,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: authUser,
      expiresIn: this.configService.get<string>('jwt.expiresIn') ?? '7d',
    };
  }

  async getMe(payload: JwtPayload): Promise<AuthUserDto> {
    if (payload.accountType === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.sub },
      });

      if (!employee?.panelEnabled || !employee.username) {
        throw new UnauthorizedException('Sesja wygasła');
      }

      return {
        id: employee.id,
        username: employee.username,
        role: 'WORKER',
        accountType: 'employee',
        employeeId: employee.id,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.isActive) {
      throw new UnauthorizedException('Sesja wygasła');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role as AuthUserDto['role'],
      accountType: 'user',
    };
  }

  async changePassword(
    authUser: AuthUserDto,
    currentPassword: string,
    newPassword: string,
  ) {
    if (authUser.accountType === 'employee') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: authUser.id },
      });

      if (!employee?.passwordHash) {
        throw new BadRequestException('Brak ustawionego hasła');
      }

      const valid = await bcrypt.compare(currentPassword, employee.passwordHash);
      if (!valid) {
        throw new UnauthorizedException('Nieprawidłowe aktualne hasło');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { passwordHash },
      });

      return { success: true };
    }

    const user = await this.prisma.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      throw new UnauthorizedException('Sesja wygasła');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Nieprawidłowe aktualne hasło');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return { success: true };
  }
}
