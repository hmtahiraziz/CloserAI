'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Label, Skeleton } from '@/components/ui';

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  email?: string;
  status: string;
  pipelineStage: string;
  estimatedDealValue?: string | number;
  doNotCall: boolean;
};

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5),
  companyName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  industry: z.string().optional(),
});

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    return params.toString();
  }, [search, status]);

  const { data, isLoading } = useQuery({
    queryKey: ['leads', query],
    queryFn: () => api<{ items: Lead[]; meta: { total: number } }>(`/leads?${query}`),
  });

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', companyName: '', email: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: z.infer<typeof createSchema>) =>
      api('/leads', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success('Lead created');
      setShowCreate(false);
      form.reset();
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Leads</h1>
          <p className="text-sm text-muted-foreground">Search, filter, and launch AI calls</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/leads/export/csv" className="contents">
            <Button variant="secondary" onClick={(e) => {
              e.preventDefault();
              window.open('/api/leads/export/csv', '_blank');
            }}>
              Export CSV
            </Button>
          </a>
          <Button onClick={() => setShowCreate((v) => !v)}>Create lead</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, company, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {['NEW', 'READY_TO_CALL', 'CALLING', 'CONTACTED', 'QUALIFIED', 'MEETING_BOOKED', 'DO_NOT_CALL'].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
      </div>

      {showCreate ? (
        <Card className="p-4">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
          >
            {(['firstName', 'lastName', 'phone', 'companyName', 'email', 'industry'] as const).map(
              (field) => (
                <div key={field} className="space-y-1">
                  <Label>{field}</Label>
                  <Input {...form.register(field)} />
                </div>
              ),
            )}
            <div className="md:col-span-3">
              <Button type="submit" disabled={createMutation.isPending}>
                Save lead
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data?.items.length ? (
        <EmptyState title="No leads found" description="Create a lead or adjust filters." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Phone</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-primary">
                      {lead.firstName} {lead.lastName}
                    </Link>
                    {lead.doNotCall ? (
                      <Badge tone="danger">DNC</Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{lead.companyName}</td>
                  <td className="px-4 py-3">
                    <Badge tone="info">{lead.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{lead.pipelineStage}</td>
                  <td className="px-4 py-3 tabular-nums">{lead.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
