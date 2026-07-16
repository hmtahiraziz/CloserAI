import { Injectable, Logger } from '@nestjs/common';
import {
  CallOutcome,
  CallStatus,
  LeadStatus,
  ObjectionCategory,
  ObjectionSeverity,
  SalesStrategy,
  Sentiment,
  BudgetLevel,
  AuthorityLevel,
  NeedLevel,
  TimelineLevel,
  CompetitorSentiment,
  mapDisconnectionToOutcome,
  mapCallStatusFromRetell,
  mapOutcomeToLeadStatus,
  mapOutcomeToPipelineStage,
  parseEnumValue,
  clampScore,
  postCallAnalysisSchema,
} from '@closerai/shared';
import { Prisma } from '@closerai/database';
import { PrismaService } from '../prisma/prisma.service';
import { sha256Hex } from '../retell/retell.service';

@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingest(rawBody: string, eventType: string, callPayload: Record<string, unknown>) {
    const retellCallId = String(callPayload.call_id ?? '');
    if (!retellCallId) {
      return { accepted: false, reason: 'missing_call_id' };
    }

    const payloadHash = sha256Hex(rawBody);
    try {
      const event = await this.prisma.callEvent.create({
        data: {
          retellCallId,
          eventType,
          payloadHash,
          payload: JSON.parse(rawBody) as Prisma.InputJsonValue,
        },
      });

      await this.prisma.webhookProcessingJob.create({
        data: { callEventId: event.id },
      });

      // Process immediately for MVP (also polled by JobsService)
      await this.processEvent(event.id);
      return { accepted: true, duplicate: false, eventId: event.id };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { accepted: true, duplicate: true };
      }
      throw err;
    }
  }

  async processPending(limit = 10) {
    const jobs = await this.prisma.webhookProcessingJob.findMany({
      where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: 5 } },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { callEvent: true },
    });

    for (const job of jobs) {
      await this.processEvent(job.callEventId);
    }
  }

  async processEvent(callEventId: string) {
    const event = await this.prisma.callEvent.findUnique({ where: { id: callEventId } });
    if (!event) return;

    const job = await this.prisma.webhookProcessingJob.findFirst({
      where: { callEventId, status: { in: ['PENDING', 'FAILED'] } },
    });
    if (job) {
      await this.prisma.webhookProcessingJob.update({
        where: { id: job.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 }, lockedAt: new Date() },
      });
    }

    try {
      const payload = event.payload as { event?: string; call?: Record<string, unknown> };
      const call = (payload.call ?? {}) as Record<string, unknown>;

      switch (event.eventType) {
        case 'call_started':
          await this.handleStarted(call);
          break;
        case 'call_ended':
          await this.handleEnded(call);
          break;
        case 'call_analyzed':
          await this.handleAnalyzed(call);
          break;
        default:
          this.logger.log(`Stored unknown event type ${event.eventType}`);
      }

      await this.prisma.callEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), errorMessage: null },
      });
      if (job) {
        await this.prisma.webhookProcessingJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', processedAt: new Date(), lastError: null },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      this.logger.error(`Webhook process failed: ${message}`);
      await this.prisma.callEvent.update({
        where: { id: event.id },
        data: { errorMessage: message },
      });
      if (job) {
        await this.prisma.webhookProcessingJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', lastError: message },
        });
      }
    }
  }

  private async findCall(call: Record<string, unknown>) {
    const retellCallId = String(call.call_id ?? '');
    const metadata = (call.metadata ?? {}) as Record<string, string>;
    let existing = await this.prisma.call.findFirst({
      where: {
        OR: [
          { retellCallId },
          metadata.closerCallId ? { id: metadata.closerCallId } : undefined,
        ].filter(Boolean) as Prisma.CallWhereInput[],
      },
    });
    return { existing, retellCallId, metadata };
  }

  private async handleStarted(call: Record<string, unknown>) {
    const { existing, retellCallId, metadata } = await this.findCall(call);
    const startedAt = call.start_timestamp
      ? new Date(Number(call.start_timestamp))
      : new Date();

    if (existing) {
      await this.prisma.call.update({
        where: { id: existing.id },
        data: {
          retellCallId,
          status: CallStatus.IN_PROGRESS,
          startedAt: existing.startedAt ?? startedAt,
          rawRetellPayload: call as Prisma.InputJsonValue,
        },
      });
      await this.prisma.lead.update({
        where: { id: existing.leadId },
        data: { status: LeadStatus.CALLING },
      });
      return;
    }

    if (metadata.leadId && metadata.organizationId) {
      const created = await this.prisma.call.create({
        data: {
          organizationId: metadata.organizationId,
          leadId: metadata.leadId,
          campaignId: metadata.campaignId || null,
          retellCallId,
          status: CallStatus.IN_PROGRESS,
          startedAt,
          metadata: metadata as Prisma.InputJsonValue,
          rawRetellPayload: call as Prisma.InputJsonValue,
        },
      });
      await this.prisma.lead.update({
        where: { id: created.leadId },
        data: { status: LeadStatus.CALLING },
      });
    }
  }

  private async handleEnded(call: Record<string, unknown>) {
    const { existing, retellCallId } = await this.findCall(call);
    if (!existing && !retellCallId) return;

    const disconnectionReason = call.disconnection_reason
      ? String(call.disconnection_reason)
      : null;
    const duration =
      typeof call.duration_ms === 'number'
        ? Math.round(call.duration_ms / 1000)
        : typeof call.call_cost === 'object' && call.call_cost && 'total_duration_seconds' in (call.call_cost as object)
          ? Number((call.call_cost as { total_duration_seconds?: number }).total_duration_seconds)
          : null;

    const outcome = mapDisconnectionToOutcome(disconnectionReason, String(call.call_status ?? ''));
    const status = mapCallStatusFromRetell(String(call.call_status ?? 'ended'));
    const mappedStatus =
      outcome === CallOutcome.NO_ANSWER
        ? CallStatus.NO_ANSWER
        : outcome === CallOutcome.BUSY
          ? CallStatus.BUSY
          : outcome === CallOutcome.VOICEMAIL
            ? CallStatus.VOICEMAIL
            : outcome === CallOutcome.FAILED
              ? CallStatus.FAILED
              : status === CallStatus.FAILED
                ? CallStatus.FAILED
                : CallStatus.COMPLETED;

    const endedAt = call.end_timestamp ? new Date(Number(call.end_timestamp)) : new Date();
    const data: Prisma.CallUpdateInput = {
      retellCallId,
      status: mappedStatus,
      endedAt,
      durationSeconds: duration ?? undefined,
      disconnectionReason,
      recordingUrl: call.recording_url ? String(call.recording_url) : undefined,
      transcript: call.transcript ? String(call.transcript) : undefined,
      transcriptObject: call.transcript_object
        ? (call.transcript_object as Prisma.InputJsonValue)
        : undefined,
      callOutcome: outcome === CallOutcome.UNKNOWN ? undefined : outcome,
      rawRetellPayload: call as Prisma.InputJsonValue,
    };

    let callId = existing?.id;
    if (existing) {
      await this.prisma.call.update({ where: { id: existing.id }, data });
    } else {
      const metadata = (call.metadata ?? {}) as Record<string, string>;
      if (!metadata.leadId || !metadata.organizationId) return;
      const created = await this.prisma.call.create({
        data: {
          organizationId: metadata.organizationId,
          leadId: metadata.leadId,
          campaignId: metadata.campaignId || null,
          retellCallId,
          status: mappedStatus,
          endedAt,
          durationSeconds: duration ?? undefined,
          disconnectionReason,
          callOutcome: outcome,
          rawRetellPayload: call as Prisma.InputJsonValue,
        },
      });
      callId = created.id;
    }

    if (callId) {
      const c = await this.prisma.call.findUniqueOrThrow({ where: { id: callId } });
      if (c.campaignId) {
        await this.prisma.campaignLead.updateMany({
          where: { campaignId: c.campaignId, leadId: c.leadId },
          data: { status: 'CALLED', lastAttemptAt: new Date() },
        });
      }
      // Only update lead if not already analyzed into a stronger status
      const lead = await this.prisma.lead.findUnique({ where: { id: c.leadId } });
      if (
        lead &&
        ![LeadStatus.MEETING_BOOKED, LeadStatus.DO_NOT_CALL, LeadStatus.QUALIFIED].includes(
          lead.status as LeadStatus,
        )
      ) {
        await this.prisma.lead.update({
          where: { id: c.leadId },
          data: {
            status: mapOutcomeToLeadStatus(outcome),
            lastContactedAt: new Date(),
          },
        });
      }
    }
  }

  private async handleAnalyzed(call: Record<string, unknown>) {
    const { existing, retellCallId } = await this.findCall(call);
    if (!existing) {
      // Out of order: try ended path first then analyze later
      await this.handleEnded(call);
    }
    const current = await this.prisma.call.findFirst({
      where: { OR: [{ retellCallId }, existing ? { id: existing.id } : undefined].filter(Boolean) as Prisma.CallWhereInput[] },
    });
    if (!current) return;

    const analysisRaw =
      (call.call_analysis as Record<string, unknown> | undefined)?.custom_analysis_data ??
      (call.call_analysis as Record<string, unknown> | undefined) ??
      {};
    const custom =
      typeof analysisRaw === 'object' && analysisRaw !== null
        ? (analysisRaw as Record<string, unknown>)
        : {};

    const parsed = postCallAnalysisSchema.safeParse(custom);
    const analysis = parsed.success ? parsed.data : {};

    const outcome = parseEnumValue(CallOutcome, analysis.call_outcome, current.callOutcome as CallOutcome);
    const leadScore = analysis.lead_score !== undefined ? clampScore(analysis.lead_score) : current.leadScore;
    const closeProbability =
      analysis.close_probability !== undefined
        ? clampScore(analysis.close_probability)
        : current.closeProbability;
    const buyingIntentScore =
      analysis.buying_intent_score !== undefined
        ? clampScore(analysis.buying_intent_score)
        : current.buyingIntentScore;

    const sentimentRaw =
      (call.call_analysis as { user_sentiment?: string } | undefined)?.user_sentiment ??
      analysis;
    const sentiment = parseEnumValue(
      Sentiment,
      typeof sentimentRaw === 'string' ? sentimentRaw : undefined,
      Sentiment.UNKNOWN,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.call.update({
        where: { id: current.id },
        data: {
          callSummary:
            analysis.summary_for_sales_rep ||
            (call.call_analysis as { call_summary?: string } | undefined)?.call_summary ||
            current.callSummary,
          sentiment,
          callOutcome: outcome,
          qualified: analysis.qualified ?? current.qualified,
          leadScore,
          closeProbability,
          buyingIntentScore,
          salesStrategyUsed: parseEnumValue(
            SalesStrategy,
            analysis.sales_strategy_used,
            SalesStrategy.DISCOVERY,
          ),
          recommendedNextAction: analysis.recommended_next_action ?? current.recommendedNextAction,
          recordingUrl: call.recording_url ? String(call.recording_url) : current.recordingUrl,
          transcript: call.transcript ? String(call.transcript) : current.transcript,
          transcriptObject: call.transcript_object
            ? (call.transcript_object as Prisma.InputJsonValue)
            : undefined,
          rawRetellPayload: call as Prisma.InputJsonValue,
          status: CallStatus.COMPLETED,
        },
      });

      await tx.qualification.upsert({
        where: { callId: current.id },
        create: {
          callId: current.id,
          budgetLevel: parseEnumValue(BudgetLevel, analysis.budget_level, BudgetLevel.UNKNOWN),
          budgetDetails: analysis.budget_details,
          authorityLevel: parseEnumValue(AuthorityLevel, analysis.authority_level, AuthorityLevel.UNKNOWN),
          authorityDetails: analysis.authority_details,
          needLevel: parseEnumValue(NeedLevel, analysis.need_level, NeedLevel.UNKNOWN),
          needDetails: analysis.need_details,
          timelineLevel: parseEnumValue(TimelineLevel, analysis.timeline_level, TimelineLevel.UNKNOWN),
          timelineDetails: analysis.timeline_details,
          painPoints: analysis.pain_points ?? [],
          businessGoals: analysis.business_goals ?? [],
          currentProcess: analysis.current_process,
        },
        update: {
          budgetLevel: parseEnumValue(BudgetLevel, analysis.budget_level, BudgetLevel.UNKNOWN),
          budgetDetails: analysis.budget_details,
          authorityLevel: parseEnumValue(AuthorityLevel, analysis.authority_level, AuthorityLevel.UNKNOWN),
          authorityDetails: analysis.authority_details,
          needLevel: parseEnumValue(NeedLevel, analysis.need_level, NeedLevel.UNKNOWN),
          needDetails: analysis.need_details,
          timelineLevel: parseEnumValue(TimelineLevel, analysis.timeline_level, TimelineLevel.UNKNOWN),
          timelineDetails: analysis.timeline_details,
          painPoints: analysis.pain_points ?? [],
          businessGoals: analysis.business_goals ?? [],
          currentProcess: analysis.current_process,
        },
      });

      // Idempotent objections: delete and recreate for this call analysis
      await tx.objection.deleteMany({ where: { callId: current.id } });
      for (const o of analysis.objections ?? []) {
        await tx.objection.create({
          data: {
            callId: current.id,
            category: parseEnumValue(ObjectionCategory, o.category, ObjectionCategory.OTHER),
            statement: o.statement,
            severity: parseEnumValue(ObjectionSeverity, o.severity, ObjectionSeverity.MEDIUM),
            resolved: o.resolved ?? false,
            responseUsed: o.response_used,
            resolutionNotes: o.resolution_notes,
            timestampSeconds: o.timestamp_seconds,
          },
        });
      }

      await tx.competitorMention.deleteMany({ where: { callId: current.id } });
      for (const c of analysis.competitors_mentioned ?? []) {
        await tx.competitorMention.create({
          data: {
            callId: current.id,
            competitorName: c.competitor_name,
            context: c.context,
            sentiment: parseEnumValue(CompetitorSentiment, c.sentiment, CompetitorSentiment.UNKNOWN),
            timestampSeconds: c.timestamp_seconds,
          },
        });
      }

      let leadStatus = mapOutcomeToLeadStatus(outcome, analysis.qualified);
      if (analysis.do_not_call_requested) leadStatus = LeadStatus.DO_NOT_CALL;
      if (analysis.meeting_booked) leadStatus = LeadStatus.MEETING_BOOKED;
      if (analysis.callback_requested) leadStatus = LeadStatus.CALLBACK_REQUESTED;

      await tx.lead.update({
        where: { id: current.leadId },
        data: {
          status: leadStatus,
          pipelineStage: mapOutcomeToPipelineStage(outcome, analysis.qualified),
          doNotCall: analysis.do_not_call_requested ? true : undefined,
          lastContactedAt: new Date(),
        },
      });
    });
  }
}
