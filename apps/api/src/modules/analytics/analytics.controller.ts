import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  overview(@CurrentUser() user: SessionUser) {
    return this.analytics.overview(user.organizationId);
  }

  @Get('detailed')
  detailed(@CurrentUser() user: SessionUser) {
    return this.analytics.detailed(user.organizationId);
  }
}
