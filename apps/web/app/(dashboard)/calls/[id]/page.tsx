'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQuery as useMeQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge, Button, Card, ScorePill, Skeleton } from '@/components/ui';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: me } = useMeQuery({
    queryKey: ['me'],
    queryFn: () => api<any>('/auth/me'),
  });

  const { data: call, isLoading } = useQuery({
    queryKey: ['call', params.id],
    queryFn: () => api<any>(`/calls/${params.id}`),
  });

  const markReviewed = useMutation({
    mutationFn: () => api(`/calls/${params.id}/mark-reviewed`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Marked reviewed');
      qc.invalidateQueries({ queryKey: ['call', params.id] });
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!call) return <p>Call not found</p>;

  const q = call.qualification;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">
            Call with {call.lead?.firstName} {call.lead?.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/leads/${call.leadId}`} className="hover:text-primary">
              {call.lead?.companyName}
            </Link>
            {' · '}
            {formatDuration(call.durationSeconds)} · {new Date(call.createdAt).toLocaleString()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{call.status}</Badge>
            <Badge tone="info">{call.callOutcome}</Badge>
            <Badge>{call.sentiment}</Badge>
            {call.isSimulated ? <Badge tone="warning">Simulated</Badge> : null}
            {call.reviewedAt ? <Badge tone="success">Reviewed</Badge> : null}
          </div>
        </div>
        {!call.reviewedAt ? (
          <Button variant="secondary" onClick={() => markReviewed.mutate()}>
            Mark reviewed
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Lead score</p>
          <div className="mt-2 text-2xl">
            <ScorePill score={call.leadScore} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Close probability</p>
          <p className="mt-2 text-2xl font-semibold">{call.closeProbability ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Buying intent</p>
          <p className="mt-2 text-2xl font-semibold">{call.buyingIntentScore ?? '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Strategy</p>
          <p className="mt-2 text-sm font-medium">{call.salesStrategyUsed ?? '—'}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Summary</h2>
          <p className="text-sm leading-relaxed text-slate-700">{call.callSummary || 'No summary yet'}</p>
          <p className="mt-4 text-sm">
            <span className="font-medium">Next action:</span> {call.recommendedNextAction || '—'}
          </p>
          {call.recordingUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Recording</p>
              <audio controls className="w-full" src={call.recordingUrl}>
                <a href={call.recordingUrl}>Download recording</a>
              </audio>
            </div>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 font-semibold">BANT qualification</h2>
          {q ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Budget', q.budgetLevel, q.budgetDetails],
                ['Authority', q.authorityLevel, q.authorityDetails],
                ['Need', q.needLevel, q.needDetails],
                ['Timeline', q.timelineLevel, q.timelineDetails],
              ].map(([label, level, details]) => (
                <div key={String(label)} className="rounded-md border p-3 text-sm">
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 font-medium">{level as string}</p>
                  <p className="mt-1 text-muted-foreground">{(details as string) || '—'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Qualification not available yet</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Transcript</h2>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-relaxed">
          {call.transcript || 'No transcript'}
        </pre>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Objections</h2>
          {(call.objections || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None captured</p>
          ) : (
            <ul className="space-y-3">
              {call.objections.map((o: any) => (
                <li key={o.id} className="rounded-md border p-3 text-sm">
                  <div className="flex gap-2">
                    <Badge tone="warning">{o.category}</Badge>
                    <Badge tone={o.resolved ? 'success' : 'danger'}>
                      {o.resolved ? 'Resolved' : 'Open'}
                    </Badge>
                  </div>
                  <p className="mt-2">{o.statement}</p>
                  {o.responseUsed ? (
                    <p className="mt-1 text-muted-foreground">Response: {o.responseUsed}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Competitors</h2>
          {(call.competitorMentions || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">None mentioned</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {call.competitorMentions.map((c: any) => (
                <li key={c.id}>
                  <span className="font-medium">{c.competitorName}</span> — {c.context} (
                  {c.sentiment})
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Tool executions</h2>
        <ul className="space-y-2 text-sm">
          {(call.toolExecutions || []).map((t: any) => (
            <li key={t.id} className="flex justify-between border-b py-2 last:border-0">
              <span>
                {t.toolName} · {t.status}
              </span>
              <span className="text-muted-foreground">{t.executionTimeMs}ms</span>
            </li>
          ))}
          {!call.toolExecutions?.length ? (
            <li className="text-muted-foreground">No mid-call tools recorded</li>
          ) : null}
        </ul>
      </Card>

      {me?.role === 'ADMIN' ? (
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Raw event debugging (ADMIN)</h2>
          <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(call.rawRetellPayload ?? call.metadata, null, 2)}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
