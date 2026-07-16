import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@closerai/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AppEnv } from '../../config/env';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

@Injectable()
export class AuthService {
  private readonly secret: Uint8Array;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {
    this.secret = new TextEncoder().encode(this.config.get('SESSION_SECRET'));
  }

  async login(email: string, password: string): Promise<{ token: string; user: SessionUser }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      organizationId: user.organizationId,
    };

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);

    return { token, user: sessionUser };
  }

  async validateSession(token: string): Promise<SessionUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      if (!payload.sub || !payload.organizationId) return null;
      return {
        id: payload.sub,
        email: String(payload.email),
        name: String(payload.name),
        role: payload.role as UserRole,
        organizationId: String(payload.organizationId),
      };
    } catch {
      return null;
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        phone: true,
        organization: { select: { id: true, name: true, slug: true, timezone: true } },
      },
    });
    if (!user) throw new BadRequestException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return user;
  }
}
