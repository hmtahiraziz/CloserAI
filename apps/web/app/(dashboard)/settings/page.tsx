'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge, Card, Skeleton } from '@/components/ui';

export default function SettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<any>('/settings'),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <p>Failed to load settings</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization, Retell, and compliance</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-4 text-sm">
          <h2 className="font-semibold">Organization</h2>
          <p>{data.organization.name}</p>
          <p>Timezone: {data.organization.timezone}</p>
          <p>Meeting duration: {data.organization.settings?.defaultMeetingDurationMinutes} min</p>
          <p>Transfer: {data.organization.settings?.transferNumber || '—'} ({data.organization.settings?.transferType})</p>
        </Card>
        <Card className="space-y-2 p-4 text-sm">
          <h2 className="font-semibold">Retell configuration</h2>
          <p>
            API key:{' '}
            <Badge tone={data.retell.configured ? 'success' : 'warning'}>
              {data.retell.configured ? 'Configured' : 'Missing'}
            </Badge>
          </p>
          <p>
            Agent:{' '}
            <Badge tone={data.retell.agentIdConfigured ? 'success' : 'warning'}>
              {data.retell.agentIdConfigured ? 'Configured' : 'Missing'}
            </Badge>
          </p>
          <p>
            Phone:{' '}
            <Badge tone={data.retell.phoneConfigured ? 'success' : 'warning'}>
              {data.retell.phoneConfigured ? 'Configured' : 'Missing'}
            </Badge>
          </p>
          <p>Webhook URL: {data.retell.webhookUrl || '—'}</p>
          <p>
            Demo mode:{' '}
            <Badge tone={data.retell.demoMode ? 'warning' : 'default'}>
              {String(data.retell.demoMode)}
            </Badge>
          </p>
          <p>Webhook events (24h): {data.webhookStatus.eventsLast24h}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Compliance</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {data.organization.settings?.complianceRules || 'No rules configured'}
        </p>
        <p className="mt-3 text-xs text-amber-800">
          Production outbound sales calling must follow the laws and consent requirements of each
          jurisdiction in which it is used.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 font-semibold">Knowledge-base setup checklist</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {data.knowledgeBaseChecklist.map((item: string) => (
            <li key={item} className="rounded-md border px-3 py-2 text-sm">
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
