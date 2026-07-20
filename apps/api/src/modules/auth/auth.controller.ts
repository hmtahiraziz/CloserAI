import { Body, Controller, Get, HttpCode, Post, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { loginSchema } from '@closerai/shared';
import { AuthService } from './auth.service';
import { Public } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from './auth.service';
import { AppEnv } from '../../config/env';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.login(body.email, body.password);
    const isProd = this.config.get('NODE_ENV') === 'production';

    res.cookie('closerai_session', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // CSRF double-submit cookie (readable by JS)
    res.cookie('closerai_csrf', token.slice(-32), {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('closerai_session', { path: '/' });
    res.clearCookie('closerai_csrf', { path: '/' });
    return { loggedOut: true };
  }

  @Get('me')
  async me(@CurrentUser() user: SessionUser) {
    return this.authService.me(user.id);
  }

  @Public()
  @Get('csrf')
  csrf(@Req() req: Request) {
    return { csrf: req.cookies?.closerai_csrf ?? null };
  }
}
