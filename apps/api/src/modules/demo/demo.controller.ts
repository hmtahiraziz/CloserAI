import { Body, Controller, Post, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  CallOutcome,
  LeadStatus,
  ObjectionCategory,
  Sentiment,
  SalesStrategy,
  BudgetLevel,
  AuthorityLevel,
  NeedLevel,
  TimelineLevel,
} from '@closerai/shared';
import { Roles } from '../../common/guards/auth.guard';
import { UserRole } from '@closerai/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookProcessorService } from '../webhooks/webhook-processor.service';
import { AppEnv } from '../../config/env';
import { createHmac } from 'crypto';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
    private readonly processor: WebhookProcessorService,
  ) {}

  private ensureDemo() {
    if (!this.config.get('DEMO_MODE')) {
      throw new ServiceUnavailableException({
        code: 'DEMO_DISABLED',
        message: 'DEMO_MODE is not enabled',
      });
    }
  }

  @Post('simulate-webhook')
  @Roles(UserRole.ADMIN)
  async simulate(
    @CurrentUser() user: SessionUser,
    @Body()
    body: {
      event: 'call_started' | 'call_ended' | 'call_analyzed';
      leadId: string;
      campaignId?: string;
      retellCallId?: string;
    },
  ) {
    this.ensureDemo();
    const lead = await this.prisma.lead.findFirst({
      where: { id: body.leadId, organizationId: user.organizationId },
    });
    if (!lead) throw new BadRequestException({ code: 'LEAD_NOT_FOUND', message: 'Lead not found' });

    const retellCallId = body.retellCallId || `sim_${Date.now()}`;
    let call = await this.prisma.call.findFirst({ where: { retellCallId } });
    if (!call) {
      call = await this.prisma.call.create({
        data: {
          organizationId: user.organizationId,
          leadId: lead.id,
          campaignId: body.campaignId,
          retellCallId,
          status: 'QUEUED',
          isSimulated: true,
          metadata: { simulated: true },
        },
      });
    } else if (!call.isSimulated) {
      throw new BadRequestException({
        code: 'NOT_SIMULATED',
        message: 'Cannot simulate events for a real Retell call',
      });
    }

    const callPayload: Record<string, unknown> = {
      call_id: retellCallId,
      call_status: body.event === 'call_started' ? 'ongoing' : 'ended',
      start_timestamp: Date.now() - 600000,
      end_timestamp: Date.now(),
      duration_ms: 580000,
      disconnection_reason: 'agent_hangup',
      recording_url: `https://recordings.example.com/sim/${retellCallId}.mp3`,
      transcript: `Agent: Hi ${lead.firstName}, this is Ava from AutomateFlow.\nUser: Sure, I can talk.\nAgent: Tell me about ${lead.knownPainPoint ?? 'your workflows'}.\nUser: It takes too much manual effort.\nAgent: Would a discovery demo help?`,
      transcript_object: [
        { role: 'agent', content: `Hi ${lead.firstName}, this is Ava from AutomateFlow.` },
        { role: 'user', content: 'Sure, I can talk.' },
      ],
      metadata: {
        closerCallId: call.id,
        leadId: lead.id,
        campaignId: body.campaignId ?? '',
        organizationId: user.organizationId,
      },
    };

    if (body.event === 'call_analyzed') {
      callPayload.call_analysis = {
        call_summary: `${lead.firstName} is evaluating automation for ${lead.companyName}.`,
        user_sentiment: 'Positive',
        custom_analysis_data: {
          call_outcome: CallOutcome.MEETING_BOOKED,
          qualified: true,
          lead_score: 87,
          close_probability: 78,
          buying_intent_score: 82,
          budget_level: BudgetLevel.HIGH,
          budget_details: 'Indicated budget for growth package',
          authority_level: AuthorityLevel.DECISION_MAKER,
          authority_details: 'Can approve evaluation',
          need_level: NeedLevel.HIGH,
          need_details: lead.knownPainPoint ?? 'Manual process pain',
          timeline_level: TimelineLevel.WITHIN_30_DAYS,
          timeline_details: 'Wants to move this quarter',
          pain_points: [lead.knownPainPoint ?? 'Manual work'],
          business_goals: ['Reduce manual effort', 'Improve response time'],
          current_process: 'Spreadsheet-driven',
          objections: [
            {
              category: ObjectionCategory.PRICE,
              statement: 'Need to understand ROI first',
              severity: 'MEDIUM',
              resolved: true,
              response_used: 'Shared Growth package range and ROI framing',
              resolution_notes: 'Agreed to review in demo',
            },
          ],
          competitors_mentioned: [
            {
              competitor_name: 'Zapier',
              context: 'Using for simple syncs',
              sentiment: 'NEUTRAL',
            },
          ],
          sales_strategy_used: SalesStrategy.CONSULTATIVE,
          recommended_next_action: 'Run discovery demo and confirm stakeholders',
          meeting_booked: true,
          callback_requested: false,
          human_transfer_requested: false,
          do_not_call_requested: false,
          summary_for_sales_rep: `Qualified opportunity. Pain: ${lead.knownPainPoint}. Meeting booked.`,
        },
      };
    }

    const payload = { event: body.event, call: callPayload };
    const rawBody = JSON.stringify(payload);
    const apiKey = this.config.get('RETELL_API_KEY') || 'demo_key';
    const timestamp = String(Date.now());
    const digest = createHmac('sha256', apiKey).update(rawBody + timestamp).digest('hex');
    // Direct ingest (signature already verified by being demo admin path)
    const result = await this.processor.ingest(rawBody, body.event, callPayload);

    if (body.event === 'call_analyzed') {
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { status: LeadStatus.MEETING_BOOKED },
      });
    }

    return {
      simulated: true,
      signaturePreview: `v=${timestamp},d=${digest.slice(0, 8)}…`,
      callId: call.id,
      retellCallId,
      result,
      sentiment: Sentiment.POSITIVE,
    };
  }
}
