'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge, Card, EmptyState, ScorePill, Skeleton } from '@/components/ui';
import { formatDuration } from '@/lib/utils';

export default function CallsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: () => api<{ items: any[] }>('/calls?pageSize=50'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Calls</h1>
        <p className="text-sm text-muted-foreground">Outbound Retell conversations and outcomes</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data?.items?.length ? (
        <EmptyState title="No calls yet" />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Lead</th>
                <th className="px-3 py-3">Campaign</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Duration</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Outcome</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/70">
                  <td className="px-3 py-3">
                    <Link href={`/calls/${c.id}`} className="font-medium hover:text-primary">
                      {c.lead?.firstName} {c.lead?.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{c.lead?.companyName}</div>
                    {c.isSimulated ? <Badge tone="warning">Simulated</Badge> : null}
                    {(c.metadata as { callType?: string } | null)?.callType === 'web' ? (
                      <Badge tone="info">Web</Badge>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{c.campaign?.name || '—'}</td>
                  <td className="px-3 py-3">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-3">{formatDuration(c.durationSeconds)}</td>
                  <td className="px-3 py-3">
                    <Badge>{c.status}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone="info">{c.callOutcome}</Badge>
                  </td>
                  <td className="px-3 py-3">
                    <ScorePill score={c.leadScore} />
                  </td>
                  <td className="px-3 py-3">{c.sentiment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
