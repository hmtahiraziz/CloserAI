'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge, Card, Skeleton } from '@/components/ui';
import Link from 'next/link';

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: () => api<any>(`/campaigns/${params.id}`),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <p>Not found</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">{data.name}</h1>
        <div className="mt-2 flex gap-2">
          <Badge tone={data.status === 'ACTIVE' ? 'success' : 'default'}>{data.status}</Badge>
          <Badge>{data.productName}</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{data.description}</p>
      </div>
      <Card className="space-y-2 p-4 text-sm">
        <p>Objective: {data.defaultObjective}</p>
        <p>Retell agent: {data.retellAgentId || '—'}</p>
        <p>Retell number: {data.retellPhoneNumber || '—'}</p>
        <p>Target audience: {data.targetAudience || '—'}</p>
      </Card>
      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Assigned leads</h2>
        <ul className="space-y-2 text-sm">
          {(data.campaignLeads || []).map((cl: any) => (
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
      </Card>
    </div>
  );
}
