import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@closerai/shared';
import { AuthService, SessionUser } from '../../modules/auth/auth.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      headers: Record<string, string | string[] | undefined>;
      user?: SessionUser;
    }>();

    const token =
      req.cookies?.closerai_session ||
      (typeof req.headers.authorization === 'string' &&
      req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!token) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required' });

    const user = await this.authService.validateSession(token);
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' });

    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(user.role as UserRole)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    req.user = user;
    return true;
  }
}
