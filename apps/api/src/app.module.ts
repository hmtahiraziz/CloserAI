import { resolve } from 'path';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { LeadsModule } from './modules/leads/leads.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CallsModule } from './modules/calls/calls.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { RetellModule } from './modules/retell/retell.module';
import { RetellFunctionsModule } from './modules/retell-functions/retell-functions.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { DemoModule } from './modules/demo/demo.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthGuard } from './common/guards/auth.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AuthService } from './modules/auth/auth.service';

const envFilePath = [
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../../.env'),
  resolve(__dirname, '../.env'),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Env is preloaded in load-env.ts; keep these paths as a fallback
      envFilePath,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    OrganizationsModule,
    LeadsModule,
    CampaignsModule,
    CallsModule,
    AppointmentsModule,
    RetellModule,
    RetellFunctionsModule,
    WebhooksModule,
    AnalyticsModule,
    SettingsModule,
    AuditLogsModule,
    JobsModule,
    DemoModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_GUARD,
      useFactory: (authService: AuthService, reflector: Reflector) =>
        new AuthGuard(authService, reflector),
      inject: [AuthService, Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
