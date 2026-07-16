import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppEnv } from '../../config/env';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly orgs: OrganizationsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  @Get()
  async get(@CurrentUser() user: SessionUser) {
    const org = await this.orgs.get(user.organizationId);
    const recentEvents = await this.prisma.callEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
    });
    return {
      organization: org,
      retell: {
        configured: Boolean(
          String(this.config.get('RETELL_API_KEY') || process.env.RETELL_API_KEY || '').trim(),
        ),
        agentIdConfigured: Boolean(
          String(
            this.config.get('RETELL_AGENT_ID') ||
              process.env.RETELL_AGENT_ID ||
              org.settings?.retellAgentId ||
              '',
          ).trim(),
        ),
        phoneConfigured: Boolean(
          String(
            this.config.get('RETELL_PHONE_NUMBER') ||
              process.env.RETELL_PHONE_NUMBER ||
              org.settings?.retellPhoneNumber ||
              '',
          ).trim(),
        ),
        webhookUrl: this.config.get('RETELL_WEBHOOK_URL') || process.env.RETELL_WEBHOOK_URL || null,
        demoMode: this.config.get('DEMO_MODE'),
      },
      webhookStatus: {
        eventsLast24h: recentEvents,
      },
      knowledgeBaseChecklist: [
        'Upload company-overview.md',
        'Upload services.md',
        'Upload pricing.md',
        'Upload ideal-customer-profile.md',
        'Upload case-studies.md',
        'Upload frequently-asked-questions.md',
        'Upload competitor-positioning.md',
        'Upload security-and-privacy.md',
        'Upload implementation-process.md',
        'Upload objection-handling.md',
        'Upload sales-policies.md',
        'Upload compliance-boundaries.md',
      ],
    };
  }
}
