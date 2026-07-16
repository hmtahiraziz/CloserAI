'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui';

export default function AppointmentsPage() {
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'canceled'>('upcoming');
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', filter],
    queryFn: () => api<any[]>(`/appointments?filter=${filter}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Appointments</h1>
        <p className="text-sm text-muted-foreground">Meetings booked by the AI closer</p>
      </div>
      <div className="flex gap-2">
        {(['upcoming', 'past', 'canceled'] as const).map((f) => (
          <Button key={f} variant={filter === f ? 'primary' : 'secondary'} onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState title="No appointments" />
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    <Link href={`/leads/${a.leadId}`} className="hover:text-primary">
                      {a.lead?.firstName} {a.lead?.lastName} · {a.lead?.companyName}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm">
                    {new Date(a.startTime).toLocaleString()} ({a.timezone})
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="info">{a.status}</Badge>
                  {a.meetingUrl ? (
                    <p className="mt-2 text-xs">
                      <a className="text-primary hover:underline" href={a.meetingUrl} target="_blank" rel="noreferrer">
                        Meeting URL
                      </a>
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
