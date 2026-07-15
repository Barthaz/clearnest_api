import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { username: 'asc' },
    });

    return users.map((u) => this.mapUser(u));
  }

  async create(dto: CreateUserDto) {
    await this.ensureUsernameAvailable(dto.username);

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        role: dto.role,
      },
    });

    return this.mapUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Nie znaleziono użytkownika');
    }

    const data: {
      passwordHash?: string;
      role?: typeof dto.role;
      isActive?: boolean;
    } = {};

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.mapUser(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Nie znaleziono użytkownika');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  private async ensureUsernameAvailable(username: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      throw new ConflictException('Użytkownik o tej nazwie już istnieje');
    }

    const existingEmployee = await this.prisma.employee.findUnique({
      where: { username },
    });
    if (existingEmployee) {
      throw new ConflictException('Login jest już używany przez pracownika');
    }
  }

  private mapUser(user: {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
