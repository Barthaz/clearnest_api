import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUserDto, UserRole } from '../../domain/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: AuthUserDto }>();
    if (!user) {
      throw new ForbiddenException('Brak uprawnień');
    }

    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return true;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Brak uprawnień do tej operacji');
  }
}
