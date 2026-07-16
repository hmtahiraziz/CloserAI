import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Analytics formulas (documented):
 * - Connected-call rate = connected / total attempted
 * - Qualification rate = qualified connected / connected
 * - Meeting booking rate = meeting booked / connected
 * - Objection resolution rate = resolved / all objections
 * - Average lead score = avg validated leadScore for analyzed calls
 * - Campaign conversion rate = (meeting|proposal|negotiation|won) / contacted campaign leads
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const calls = await this.prisma.call.findMany({
      where: { organizationId },
      include: { objections: true, competitorMentions: true, lead: true },
    });

    const totalCalls = calls.length;
    const connected = calls.filter((c) =>
      ['COMPLETED', 'IN_PROGRESS'].includes(c.status) && (c.durationSeconds ?? 0) > 30,
    );
    const connectedCount = connected.length || calls.filter((c) => c.status === 'COMPLETED').length;
    const qualified = calls.filter((c) => c.qualified === true);
    const meetings = calls.filter((c) => c.callOutcome === 'MEETING_BOOKED');
    const analyzed = calls.filter((c) => c.leadScore != null);
    const avgScore =
      analyzed.length === 0
        ? 0
        : analyzed.reduce((s, c) => s + (c.leadScore ?? 0), 0) / analyzed.length;
    const avgDuration =
      calls.filter((c) => c.durationSeconds).length === 0
        ? 0
        : calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
          calls.filter((c) => c.durationSeconds).length;

    const objections = calls.flatMap((c) => c.objections);
    const objectionResolutionRate =
      objections.length === 0
        ? 0
        : objections.filter((o) => o.resolved).length / objections.length;

    const outcomes: Record<string, number> = {};
    for (const c of calls) {
      outcomes[c.callOutcome] = (outcomes[c.callOutcome] ?? 0) + 1;
    }

    const leads = await this.prisma.lead.groupBy({
      by: ['pipelineStage'],
      where: { organizationId },
      _count: true,
    });

    const objectionFreq: Record<string, number> = {};
    for (const o of objections) {
      objectionFreq[o.category] = (objectionFreq[o.category] ?? 0) + 1;
    }

    const competitors: Record<string, number> = {};
    for (const c of calls.flatMap((x) => x.competitorMentions)) {
      competitors[c.competitorName] = (competitors[c.competitorName] ?? 0) + 1;
    }

    const highIntent = calls
      .filter((c) => (c.leadScore ?? 0) >= 85)
      .sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0))
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        leadScore: c.leadScore,
        outcome: c.callOutcome,
        lead: c.lead,
        createdAt: c.createdAt,
      }));

    const trendMap: Record<string, number> = {};
    for (const c of calls) {
      const day = c.createdAt.toISOString().slice(0, 10);
      trendMap[day] = (trendMap[day] ?? 0) + 1;
    }
    const callTrend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totals: {
        totalCalls,
        connectedCalls: connectedCount,
        qualifiedLeads: qualified.length,
        meetingsBooked: meetings.length,
        qualificationRate: connectedCount ? qualified.length / connectedCount : 0,
        meetingBookingRate: connectedCount ? meetings.length / connectedCount : 0,
        averageLeadScore: Math.round(avgScore * 10) / 10,
        averageCallDuration: Math.round(avgDuration),
        objectionResolutionRate: Math.round(objectionResolutionRate * 1000) / 1000,
      },
      callsByOutcome: Object.entries(outcomes).map(([outcome, count]) => ({ outcome, count })),
      leadsByPipelineStage: leads.map((l) => ({ stage: l.pipelineStage, count: l._count })),
      recentHighIntentCalls: highIntent,
      mostCommonObjections: Object.entries(objectionFreq)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      competitorsMentioned: Object.entries(competitors)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      callTrend,
      formulas: {
        connectedCallRate: 'connected / total attempted',
        qualificationRate: 'qualified connected / connected',
        meetingBookingRate: 'meeting booked / connected',
        objectionResolutionRate: 'resolved objections / all objections',
        averageLeadScore: 'avg leadScore for analyzed calls',
      },
    };
  }

  async detailed(organizationId: string) {
    const overview = await this.overview(organizationId);
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      include: {
        campaignLeads: { include: { lead: true } },
        calls: true,
      },
    });

    const campaignComparison = campaigns.map((c) => {
      const contacted = c.campaignLeads.filter((cl) => cl.attemptCount > 0).length;
      const converted = c.campaignLeads.filter((cl) =>
        ['DEMO_BOOKED', 'PROPOSAL', 'NEGOTIATION', 'WON'].includes(cl.lead.pipelineStage),
      ).length;
      return {
        id: c.id,
        name: c.name,
        contacted,
        converted,
        conversionRate: contacted ? converted / contacted : 0,
        calls: c.calls.length,
      };
    });

    const strategyMap: Record<string, { count: number; meetings: number }> = {};
    const calls = await this.prisma.call.findMany({ where: { organizationId } });
    for (const call of calls) {
      const s = call.salesStrategyUsed ?? 'UNKNOWN';
      if (!strategyMap[s]) strategyMap[s] = { count: 0, meetings: 0 };
      strategyMap[s].count += 1;
      if (call.callOutcome === 'MEETING_BOOKED') strategyMap[s].meetings += 1;
    }

    const scoreBuckets = [
      { band: '0-29', min: 0, max: 29, count: 0 },
      { band: '30-49', min: 30, max: 49, count: 0 },
      { band: '50-69', min: 50, max: 69, count: 0 },
      { band: '70-84', min: 70, max: 84, count: 0 },
      { band: '85-100', min: 85, max: 100, count: 0 },
    ];
    for (const c of calls) {
      if (c.leadScore == null) continue;
      const b = scoreBuckets.find((x) => c.leadScore! >= x.min && c.leadScore! <= x.max);
      if (b) b.count += 1;
    }

    const highIntentNoMeeting = await this.prisma.call.findMany({
      where: {
        organizationId,
        leadScore: { gte: 85 },
        callOutcome: { not: 'MEETING_BOOKED' },
      },
      include: { lead: true },
      take: 20,
      orderBy: { leadScore: 'desc' },
    });

    return {
      ...overview,
      campaignComparison,
      salesStrategyPerformance: Object.entries(strategyMap).map(([strategy, v]) => ({
        strategy,
        ...v,
        meetingRate: v.count ? v.meetings / v.count : 0,
      })),
      scoreDistribution: scoreBuckets,
      highIntentWithoutMeetings: highIntentNoMeeting,
    };
  }
}
