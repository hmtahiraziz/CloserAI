'use client';

import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, ScorePill, Skeleton } from '@/components/ui';
import Link from 'next/link';
import { formatDuration } from '@/lib/utils';
import { WebCallPanel } from '@/components/web-call-panel';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', params.id],
    queryFn: () => api<any>(`/leads/${params.id}`),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<any[]>('/campaigns'),
  });

  const activeCampaign = (campaigns || []).find((c: any) => c.status === 'ACTIVE');

  const startCall = useMutation({
    mutationFn: async () => {
      if (!activeCampaign) throw new ApiClientError('NO_CAMPAIGN', 'No active campaign');
      const confirmed = window.confirm(
        'This will attempt a REAL Retell outbound phone call (requires RETELL_PHONE_NUMBER). Continue?',
      );
      if (!confirmed) throw new ApiClientError('CANCELLED', 'Cancelled');
      return api(`/leads/${params.id}/calls`, {
        method: 'POST',
        body: JSON.stringify({ campaignId: activeCampaign.id }),
      });
    },
    onSuccess: (call: any) => {
      toast.success('Outbound call queued');
      qc.invalidateQueries({ queryKey: ['lead', params.id] });
      window.location.href = `/calls/${call.id}`;
    },
    onError: (e) => {
      if (e instanceof ApiClientError && e.code === 'CANCELLED') return;
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to start call');
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (!lead) return <p>Lead not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="text-muted-foreground">
            {lead.jobTitle ? `${lead.jobTitle} · ` : ''}
            {lead.companyName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="info">{lead.status}</Badge>
            <Badge>{lead.pipelineStage}</Badge>
            {lead.doNotCall ? <Badge tone="danger">Do not call</Badge> : null}
          </div>
        </div>
        <Button
          disabled={lead.doNotCall || startCall.isPending}
          onClick={() => startCall.mutate()}
          variant="secondary"
        >
          Start Phone Call (Retell)
        </Button>
      </div>

      {lead.doNotCall ? (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          This lead is marked do-not-call. Outbound calling is blocked at API and service layers.
        </Card>
      ) : (
        <WebCallPanel
          leadId={lead.id}
          campaignId={activeCampaign?.id}
          disabled={lead.doNotCall}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-4 text-sm lg:col-span-1">
          <h2 className="font-semibold">Profile</h2>
          <p>Email: {lead.email || '—'}</p>
          <p>Phone: {lead.phone}</p>
          <p>Industry: {lead.industry || '—'}</p>
          <p>Size: {lead.companySize || '—'}</p>
          <p>Source: {lead.source || '—'}</p>
          <p>Deal value: {lead.estimatedDealValue ?? '—'}</p>
          <p>Pain point: {lead.knownPainPoint || '—'}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{lead.notes}</p>
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Call history</h2>
          <ul className="space-y-3">
            {(lead.calls || []).map((c: any) => (
              <li key={c.id} className="flex items-center justify-between border-b pb-3 text-sm last:border-0">
                <div>
                  <Link href={`/calls/${c.id}`} className="font-medium hover:text-primary">
                    {c.callOutcome} · {formatDuration(c.durationSeconds)}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                    {c.isSimulated ? ' · Simulated' : ''}
                    {(c.metadata as { callType?: string } | null)?.callType === 'web' ? ' · Web call' : ''}
                  </p>
                </div>
                <ScorePill score={c.leadScore} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Appointments</h2>
          {(lead.appointments || []).map((a: any) => (
            <div key={a.id} className="mb-2 text-sm">
              <p className="font-medium">{a.title}</p>
              <p className="text-muted-foreground">
                {new Date(a.startTime).toLocaleString()} ({a.timezone}) · {a.status}
              </p>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Follow-ups</h2>
          {(lead.followUps || []).map((f: any) => (
            <div key={f.id} className="mb-2 text-sm">
              <p className="font-medium">{f.type}</p>
              <p className="text-muted-foreground">
                {new Date(f.scheduledFor).toLocaleString()} · {f.status}
              </p>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
