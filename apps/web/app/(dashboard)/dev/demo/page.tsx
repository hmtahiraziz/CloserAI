'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, Label, Skeleton } from '@/components/ui';
import Link from 'next/link';

export default function DemoLabPage() {
  const [leadId, setLeadId] = useState('');
  const [event, setEvent] = useState<'call_started' | 'call_ended' | 'call_analyzed'>('call_analyzed');
  const [retellCallId, setRetellCallId] = useState('');

  const { data: leads, isLoading } = useQuery({
    queryKey: ['leads-demo'],
    queryFn: () => api<{ items: any[] }>('/leads?pageSize=50&status=READY_TO_CALL'),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<any[]>('/campaigns'),
  });

  const simulate = useMutation({
    mutationFn: () =>
      api<any>('/demo/simulate-webhook', {
        method: 'POST',
        body: JSON.stringify({
          event,
          leadId,
          campaignId: campaigns?.find((c) => c.status === 'ACTIVE')?.id,
          retellCallId: retellCallId || undefined,
        }),
      }),
    onSuccess: (res) => {
      toast.success(`Simulated ${event}`);
      setRetellCallId(res.retellCallId);
      if (event === 'call_analyzed') {
        window.location.href = `/calls/${res.callId}`;
      }
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Simulation failed'),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Demo Lab</h1>
        <p className="text-sm text-muted-foreground">
          ADMIN-only simulated Retell webhooks. Simulated records are labeled in the UI.
        </p>
        <Badge tone="warning">DEMO_MODE</Badge>
      </div>

      <Card className="space-y-4 p-4">
        <div className="space-y-1">
          <Label>Lead</Label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
          >
            <option value="">Select a lead</option>
            {(leads?.items || []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.firstName} {l.lastName} · {l.companyName}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Or open any <Link href="/leads" className="text-primary">lead</Link> and paste its ID after
            loading all leads from the list.
          </p>
        </div>

        <AllLeadsPicker onPick={setLeadId} selected={leadId} />

        <div className="space-y-1">
          <Label>Event</Label>
          <select
            className="h-10 w-full rounded-md border px-3 text-sm"
            value={event}
            onChange={(e) => setEvent(e.target.value as typeof event)}
          >
            <option value="call_started">call_started</option>
            <option value="call_ended">call_ended</option>
            <option value="call_analyzed">call_analyzed</option>
          </select>
        </div>

        <Button disabled={!leadId || simulate.isPending} onClick={() => simulate.mutate()}>
          Simulate Retell Webhook
        </Button>
      </Card>
    </div>
  );
}

function AllLeadsPicker({
  onPick,
  selected,
}: {
  onPick: (id: string) => void;
  selected: string;
}) {
  const { data } = useQuery({
    queryKey: ['leads-all-demo'],
    queryFn: () => api<{ items: any[] }>('/leads?pageSize=50'),
  });
  return (
    <div className="space-y-1">
      <Label>All seeded leads</Label>
      <select
        className="h-10 w-full rounded-md border px-3 text-sm"
        value={selected}
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Select</option>
        {(data?.items || []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.firstName} {l.lastName} · {l.status}
          </option>
        ))}
      </select>
    </div>
  );
}
