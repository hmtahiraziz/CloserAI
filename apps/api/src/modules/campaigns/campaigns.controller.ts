import { Body, Controller, Get, Inject, Param, Patch, Post, forwardRef } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createCampaignSchema,
  updateCampaignSchema,
  CampaignStatus,
} from '@closerai/shared';
import { CampaignsService } from './campaigns.service';
import { CallsService } from '../calls/calls.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    @Inject(forwardRef(() => CallsService))
    private readonly calls: CallsService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.campaigns.list(user.organizationId);
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.campaigns.stats(user.organizationId, id);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.campaigns.get(user.organizationId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createCampaignSchema)) body: Parameters<CampaignsService['create']>[1],
  ) {
    const campaign = await this.campaigns.create(user.organizationId, body);
    await this.audit.log(user.organizationId, user.id, 'CAMPAIGN_CREATED', 'Campaign', campaign.id);
    return campaign;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCampaignSchema)) body: Parameters<CampaignsService['update']>[2],
  ) {
    return this.campaigns.update(user.organizationId, id, body);
  }

  @Post(':id/activate')
  async activate(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.campaigns.setStatus(user.organizationId, id, CampaignStatus.ACTIVE);
  }

  @Post(':id/pause')
  async pause(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.campaigns.setStatus(user.organizationId, id, CampaignStatus.PAUSED);
  }

  @Post(':id/start')
  async start(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const result = await this.calls.startCampaign(user, id);
    await this.audit.log(user.organizationId, user.id, 'CAMPAIGN_STARTED', 'Campaign', id, {
      dialed: result.summary.dialed,
      skipped: result.summary.skipped,
      failed: result.summary.failed,
    });
    return result;
  }

  @Post(':id/assign-leads')
  async assign(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { leadIds: string[] },
  ) {
    return this.campaigns.assignLeads(user.organizationId, id, body.leadIds ?? []);
  }
}
