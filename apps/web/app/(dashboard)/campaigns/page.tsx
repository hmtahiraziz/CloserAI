'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Label, Skeleton } from '@/components/ui';

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    productName: 'AutomateFlow',
    defaultObjective: 'Qualify and book a discovery meeting',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api<any[]>('/campaigns'),
  });

  const create = useMutation({
    mutationFn: () => api('/campaigns', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      toast.success('Campaign created');
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'pause' }) =>
      api(`/campaigns/${id}/${action}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Retell agent, number, and outreach objective</p>
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
          {data.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/campaigns/${c.id}`} className="font-display text-xl hover:text-primary">
                    {c.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Badge tone={c.status === 'ACTIVE' ? 'success' : 'default'}>{c.status}</Badge>
                    <Badge>{c._count?.campaignLeads ?? 0} leads</Badge>
                    <Badge tone="info">{c._count?.calls ?? 0} calls</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.status !== 'ACTIVE' ? (
                    <Button variant="secondary" onClick={() => setStatus.mutate({ id: c.id, action: 'activate' })}>
                      Activate
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setStatus.mutate({ id: c.id, action: 'pause' })}>
                      Pause
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
