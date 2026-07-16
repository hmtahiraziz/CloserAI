'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, Skeleton } from '@/components/ui';
import { formatPercent } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-detailed'],
    queryFn: () => api<any>('/analytics/detailed'),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!data) return <p>Failed to load analytics</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Qualification funnel, outcomes, and campaign conversion
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Qualification rate</p>
          <p className="mt-2 text-2xl font-semibold">{formatPercent(data.totals.qualificationRate)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Meeting rate</p>
          <p className="mt-2 text-2xl font-semibold">{formatPercent(data.totals.meetingBookingRate)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Objection resolution</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatPercent(data.totals.objectionResolutionRate)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg lead score</p>
          <p className="mt-2 text-2xl font-semibold">{data.totals.averageLeadScore}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Score distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="band" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0e7490" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-4 text-sm font-semibold">Campaign conversion</h2>
          <ul className="space-y-3 text-sm">
            {(data.campaignComparison || []).map((c: any) => (
              <li key={c.id} className="flex justify-between border-b pb-2">
                <span>{c.name}</span>
                <span>
                  {c.converted}/{c.contacted} ({formatPercent(c.conversionRate)})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Sales strategy performance</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {(data.salesStrategyPerformance || []).map((s: any) => (
            <li key={s.strategy} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{s.strategy}</p>
              <p className="text-muted-foreground">
                {s.count} calls · meeting rate {formatPercent(s.meetingRate)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Formula definitions</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Connected-call rate = connected / total attempted</li>
          <li>Qualification rate = qualified connected / connected</li>
          <li>Meeting booking rate = meeting booked / connected</li>
          <li>Objection resolution rate = resolved / all objections</li>
          <li>Campaign conversion = (demo booked|proposal|negotiation|won) / contacted</li>
        </ul>
      </Card>
    </div>
  );
}
