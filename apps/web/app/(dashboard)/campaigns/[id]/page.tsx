'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { formatDuration, formatPercent } from '@/lib/utils';

type CampaignStats = {
  totalLeads: number;
  contacted: number;
  converted: number;
  conversionRate: number;
  pendingDial: number;
  leadStatusCounts: Record<string, number>;
  totalCalls: number;
  connectedCalls: number;
  meetingsBooked: number;
  qualified: number;
  qualificationRate: number;
  meetingBookingRate: number;
  averageLeadScore: number;
  callsByOutcome: Array<{ outcome: string; count: number }>;
  recentCalls: Array<{
    id: string;
    status: string;
    callOutcome: string;
    leadScore: number | null;
    durationSeconds: number | null;
    createdAt: string;
    lead: { id: string; firstName: string; lastName: string; companyName: string };
  }>;
};

type CampaignDetail = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  productName: string;
  defaultObjective?: string | null;
  retellAgentId?: string | null;
  retellPhoneNumber?: string | null;
  targetAudience?: string | null;
  agentConfiguration?: {
    id: string;
    agentName: string;
    retellAgentId?: string | null;
    retellPhoneNumber?: string | null;
  } | null;
  campaignLeads: Array<{
    id: string;
    status: string;
    attemptCount: number;
    lead: { id: string; firstName: string; lastName: string; companyName: string };
  }>;
  stats: CampaignStats;
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => api<CampaignDetail>(`/campaigns/${params.id}`),
  });

  const start = useMutation({
    mutationFn: () =>
      api<{
        summary: { dialed: number; skipped: number; failed: number };
        campaign: CampaignDetail;
      }>(`/campaigns/${params.id}/start`, { method: 'POST' }),
    onSuccess: (result) => {
      toast.success(
        `Started: ${result.summary.dialed} dialed, ${result.summary.skipped} skipped, ${result.summary.failed} failed`,
      );
      qc.setQueryData(['campaign', params.id], result.campaign);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed to start'),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <p>Not found</p>;

  const stats = data.stats;
  const isCompleted = data.status === 'COMPLETED';
  const canStart = data.status !== 'COMPLETED' || (stats?.pendingDial ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/campaigns" className="text-sm text-muted-foreground hover:text-primary">
            ← Campaigns
          </Link>
          <h1 className="mt-2 font-display text-3xl">{data.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge
              tone={
                data.status === 'ACTIVE' ? 'success' : isCompleted ? 'info' : 'default'
              }
            >
              {data.status}
            </Badge>
            <Badge>{data.productName}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{data.description}</p>
        </div>
        {canStart && data.status !== 'COMPLETED' ? (
          <Button onClick={() => start.mutate()} disabled={start.isPending}>
            Start dialing
          </Button>
        ) : null}
      </div>

      {isCompleted || (stats && stats.totalCalls > 0) ? (
        <div className="space-y-4">
          <h2 className="font-semibold">
            {isCompleted ? 'Campaign results' : 'Campaign progress'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Leads contacted</p>
              <p className="mt-2 text-2xl font-semibold">
                {stats.contacted}/{stats.totalLeads}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Conversion rate</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatPercent(stats.conversionRate)}
              </p>
              <p className="text-xs text-muted-foreground">{stats.converted} converted</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Meetings booked</p>
              <p className="mt-2 text-2xl font-semibold">{stats.meetingsBooked}</p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(stats.meetingBookingRate)} of connected
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Avg lead score</p>
              <p className="mt-2 text-2xl font-semibold">{stats.averageLeadScore || '—'}</p>
              <p className="text-xs text-muted-foreground">
                {stats.qualified} qualified · {stats.totalCalls} calls
              </p>
            </Card>
          </div>

          {stats.callsByOutcome.length > 0 ? (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Outcomes</h3>
              <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {stats.callsByOutcome.map((o) => (
                  <li
                    key={o.outcome}
                    className="flex justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{o.outcome}</span>
                    <span className="tabular-nums text-muted-foreground">{o.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {stats.recentCalls.length > 0 ? (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-semibold">Recent calls</h3>
              <ul className="divide-y text-sm">
                {stats.recentCalls.map((call) => (
                  <li key={call.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link href={`/calls/${call.id}`} className="hover:text-primary">
                      {call.lead.firstName} {call.lead.lastName}
                      <span className="text-muted-foreground"> · {call.lead.companyName}</span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge tone="info">{call.callOutcome}</Badge>
                      <span>{formatDuration(call.durationSeconds)}</span>
                      {call.leadScore != null ? <span>Score {call.leadScore}</span> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Card className="space-y-2 p-4 text-sm">
        <p>Objective: {data.defaultObjective || '—'}</p>
        <p>
          Agent:{' '}
          {data.agentConfiguration ? (
            <Link href="/agents" className="text-primary hover:underline">
              {data.agentConfiguration.agentName}
            </Link>
          ) : (
            '—'
          )}
        </p>
        <p>
          Retell agent ID:{' '}
          {data.agentConfiguration?.retellAgentId || data.retellAgentId || '—'}
        </p>
        <p>
          Retell number:{' '}
          {data.agentConfiguration?.retellPhoneNumber || data.retellPhoneNumber || '—'}
        </p>
        <p>Target audience: {data.targetAudience || '—'}</p>
        {stats ? (
          <p>
            Lead dial status:{' '}
            {Object.entries(stats.leadStatusCounts)
              .map(([status, count]) => `${status} ${count}`)
              .join(' · ') || 'None assigned'}
          </p>
        ) : null}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Assigned leads</h2>
        {(data.campaignLeads || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads assigned yet. Assign a campaign when creating a lead.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.campaignLeads.map((cl) => (
              <li key={cl.id} className="flex justify-between border-b py-2 last:border-0">
                <Link href={`/leads/${cl.lead.id}`} className="hover:text-primary">
                  {cl.lead.firstName} {cl.lead.lastName} · {cl.lead.companyName}
                </Link>
                <span className="text-muted-foreground">
                  {cl.status} · attempts {cl.attemptCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
