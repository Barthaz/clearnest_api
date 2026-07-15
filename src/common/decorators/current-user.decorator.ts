import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserDto } from '../../domain/types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserDto => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUserDto }>();
    return request.user;
  },
);
