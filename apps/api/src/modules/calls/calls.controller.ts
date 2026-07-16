import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { startCallSchema, startWebCallSchema } from '@closerai/shared';
import { CallsService } from './calls.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('calls')
@Controller()
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get('calls')
  list(
    @CurrentUser() user: SessionUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.calls.list(user.organizationId, Number(page) || 1, Number(pageSize) || 20);
  }

  @Get('calls/:id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.calls.get(user.organizationId, id);
  }

  @Get('calls/:id/transcript')
  transcript(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.calls.getTranscript(user.organizationId, id);
  }

  @Get('leads/:leadId/calls')
  forLead(@CurrentUser() user: SessionUser, @Param('leadId') leadId: string) {
    return this.calls.listForLead(user.organizationId, leadId);
  }

  @Post('leads/:leadId/calls')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async start(
    @CurrentUser() user: SessionUser,
    @Param('leadId') leadId: string,
    @Body(new ZodValidationPipe(startCallSchema)) body: { campaignId: string; idempotencyKey?: string },
  ) {
    const call = await this.calls.startOutboundCall(user, leadId, body);
    await this.audit.log(user.organizationId, user.id, 'CALL_STARTED', 'Call', call.id, {
      leadId,
      campaignId: body.campaignId,
      retell: !call.isSimulated,
      callType: 'phone',
    });
    return call;
  }

  @Post('leads/:leadId/web-calls')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async startWeb(
    @CurrentUser() user: SessionUser,
    @Param('leadId') leadId: string,
    @Body(new ZodValidationPipe(startWebCallSchema))
    body: { campaignId: string; idempotencyKey?: string },
  ) {
    const result = await this.calls.startWebCall(user, leadId, body);
    await this.audit.log(user.organizationId, user.id, 'WEB_CALL_STARTED', 'Call', result.call.id, {
      leadId,
      campaignId: body.campaignId,
      callType: 'web',
    });
    return result;
  }

  @Post('calls/:id/retry')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  retry(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.calls.retry(user, id);
  }

  @Post('calls/:id/mark-reviewed')
  markReviewed(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.calls.markReviewed(user.organizationId, id, user.id);
  }
}
