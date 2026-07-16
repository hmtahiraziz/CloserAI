'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { Badge, Card, Skeleton, ScorePill } from '@/components/ui';
import { formatPercent } from '@/lib/utils';
import Link from 'next/link';

type Overview = {
  totals: {
    totalCalls: number;
    connectedCalls: number;
    qualifiedLeads: number;
    meetingsBooked: number;
    qualificationRate: number;
    meetingBookingRate: number;
    averageLeadScore: number;
    averageCallDuration: number;
  };
  callsByOutcome: Array<{ outcome: string; count: number }>;
  leadsByPipelineStage: Array<{ stage: string; count: number }>;
  recentHighIntentCalls: Array<{
    id: string;
    leadScore?: number;
    outcome: string;
    lead: { firstName: string; lastName: string; companyName: string };
  }>;
  mostCommonObjections: Array<{ category: string; count: number }>;
  competitorsMentioned: Array<{ name: string; count: number }>;
  callTrend: Array<{ date: string; count: number }>;
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api<Overview>('/analytics/overview'),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-red-700">Failed to load dashboard. Are you signed in?</p>;
  }

  const cards = [
    { label: 'Total calls', value: data.totals.totalCalls },
    { label: 'Connected calls', value: data.totals.connectedCalls },
    { label: 'Qualified leads', value: data.totals.qualifiedLeads },
    { label: 'Meetings booked', value: data.totals.meetingsBooked },
    { label: 'Qualification rate', value: formatPercent(data.totals.qualificationRate) },
    { label: 'Meeting booking rate', value: formatPercent(data.totals.meetingBookingRate) },
    { label: 'Avg lead score', value: data.totals.averageLeadScore },
    { label: 'Avg duration (s)', value: data.totals.averageCallDuration },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales call performance across AutomateFlow outreach
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Call trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.callTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0e7490" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Calls by outcome</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.callsByOutcome}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="outcome" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Pipeline stages</h2>
          <ul className="space-y-2">
            {data.leadsByPipelineStage.map((s) => (
              <li key={s.stage} className="flex items-center justify-between text-sm">
                <span>{s.stage}</span>
                <Badge>{s.count}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Top objections</h2>
          <ul className="space-y-2">
            {data.mostCommonObjections.slice(0, 6).map((o) => (
              <li key={o.category} className="flex items-center justify-between text-sm">
                <span>{o.category}</span>
                <Badge tone="warning">{o.count}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">High-intent calls</h2>
          <ul className="space-y-3">
            {data.recentHighIntentCalls.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/calls/${c.id}`} className="hover:text-primary">
                  {c.lead.firstName} {c.lead.lastName}
                  <span className="block text-xs text-muted-foreground">{c.lead.companyName}</span>
                </Link>
                <ScorePill score={c.leadScore} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
