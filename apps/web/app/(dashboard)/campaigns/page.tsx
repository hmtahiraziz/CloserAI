'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Label, Skeleton } from '@/components/ui';

type Agent = {
  id: string;
  agentName: string;
  retellPhoneNumber?: string | null;
  isDefault: boolean;
};

type Campaign = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  retellPhoneNumber?: string | null;
  agentConfiguration?: {
    id: string;
    agentName: string;
    retellPhoneNumber?: string | null;
  } | null;
  _count?: { campaignLeads: number; calls: number };
};

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    productName: 'AutomateFlow',
    defaultObjective: 'Qualify and book a discovery meeting',
    agentConfigurationId: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<Campaign[]>('/campaigns'),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/agents'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          productName: form.productName,
          defaultObjective: form.defaultObjective,
          ...(form.agentConfigurationId
            ? { agentConfigurationId: form.agentConfigurationId }
            : {}),
        }),
      }),
    onSuccess: () => {
      toast.success('Campaign created');
      setShowCreate(false);
      setForm({
        name: '',
        description: '',
        productName: 'AutomateFlow',
        defaultObjective: 'Qualify and book a discovery meeting',
        agentConfigurationId: '',
      });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'pause' }) =>
      api(`/campaigns/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const start = useMutation({
    mutationFn: (id: string) =>
      api<{
        summary: { dialed: number; skipped: number; failed: number };
      }>(`/campaigns/${id}/start`, { method: 'POST' }),
    onSuccess: (result) => {
      toast.success(
        `Campaign started: ${result.summary.dialed} dialed, ${result.summary.skipped} skipped, ${result.summary.failed} failed`,
      );
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed to start'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Outreach objectives — agents and numbers live under Agents
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>Create campaign</Button>
      </div>

      {showCreate ? (
        <Card className="grid gap-3 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Product</Label>
            <Input
              value={form.productName}
              onChange={(e) => setForm({ ...form, productName: e.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Objective</Label>
            <Input
              value={form.defaultObjective}
              onChange={(e) => setForm({ ...form, defaultObjective: e.target.value })}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Agent</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.agentConfigurationId}
              onChange={(e) => setForm({ ...form, agentConfigurationId: e.target.value })}
            >
              <option value="">Default agent (or env)</option>
              {(agents ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.agentName}
                  {a.isDefault ? ' (default)' : ''}
                  {a.retellPhoneNumber ? ` · ${a.retellPhoneNumber}` : ''}
                </option>
              ))}
            </select>
            {!agents?.length ? (
              <p className="text-xs text-muted-foreground">
                No agents yet —{' '}
                <Link href="/agents" className="text-primary hover:underline">
                  add one under Agents
                </Link>
              </p>
            ) : null}
          </div>
          <Button onClick={() => create.mutate()} disabled={!form.name || create.isPending}>
            Save
          </Button>
        </Card>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState title="No campaigns" />
      ) : (
        <div className="grid gap-4">
          {data.map((c) => {
            const hasNumber = Boolean(
              c.agentConfiguration?.retellPhoneNumber || c.retellPhoneNumber,
            );
            return (
              <Card key={c.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="font-display text-xl hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        tone={
                          c.status === 'ACTIVE'
                            ? 'success'
                            : c.status === 'COMPLETED'
                              ? 'info'
                              : 'default'
                        }
                      >
                        {c.status}
                      </Badge>
                      <Badge>{c._count?.campaignLeads ?? 0} leads</Badge>
                      <Badge tone="info">{c._count?.calls ?? 0} calls</Badge>
                      {c.agentConfiguration ? (
                        <Badge>{c.agentConfiguration.agentName}</Badge>
                      ) : null}
                      {hasNumber ? <Badge tone="success">Number set</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status !== 'COMPLETED' ? (
                      <Button
                        onClick={() => start.mutate(c.id)}
                        disabled={start.isPending}
                        title="Dial all pending leads in this campaign"
                      >
                        Start dialing
                      </Button>
                    ) : null}
                    {c.status !== 'ACTIVE' && c.status !== 'COMPLETED' ? (
                      <Button
                        variant="secondary"
                        onClick={() => setStatus.mutate({ id: c.id, action: 'activate' })}
                      >
                        Activate
                      </Button>
                    ) : null}
                    {c.status === 'ACTIVE' ? (
                      <Button
                        variant="secondary"
                        onClick={() => setStatus.mutate({ id: c.id, action: 'pause' })}
                      >
                        Pause
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
