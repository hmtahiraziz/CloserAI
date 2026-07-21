'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card, EmptyState, Input, Label, Skeleton } from '@/components/ui';

type Agent = {
  id: string;
  agentName: string;
  companyName: string;
  retellAgentId?: string | null;
  retellPhoneNumber?: string | null;
  isDefault: boolean;
  agentPersona?: string | null;
  primaryObjective?: string | null;
  openingMessage?: string | null;
  valueProposition?: string | null;
  _count?: { campaigns: number };
  campaigns?: Array<{ id: string; name: string; status: string }>;
};

const emptyForm = {
  agentName: 'Ava',
  companyName: 'AutomateFlow',
  retellAgentId: '',
  retellPhoneNumber: '',
  isDefault: false,
  agentPersona: '',
  primaryObjective: '',
  openingMessage: '',
  valueProposition: '',
};

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/agents'),
  });

  const create = useMutation({
    mutationFn: () =>
      api('/agents', {
        method: 'POST',
        body: JSON.stringify({
          agentName: form.agentName,
          companyName: form.companyName,
          retellAgentId: form.retellAgentId,
          retellPhoneNumber: form.retellPhoneNumber,
          isDefault: form.isDefault,
          agentPersona: form.agentPersona || null,
          primaryObjective: form.primaryObjective || null,
          openingMessage: form.openingMessage || null,
          valueProposition: form.valueProposition || null,
        }),
      }),
    onSuccess: () => {
      toast.success('Agent created');
      setShowCreate(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  const update = useMutation({
    mutationFn: () =>
      api(`/agents/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          agentName: form.agentName,
          companyName: form.companyName,
          retellAgentId: form.retellAgentId,
          retellPhoneNumber: form.retellPhoneNumber,
          isDefault: form.isDefault,
          agentPersona: form.agentPersona || null,
          primaryObjective: form.primaryObjective || null,
          openingMessage: form.openingMessage || null,
          valueProposition: form.valueProposition || null,
        }),
      }),
    onSuccess: () => {
      toast.success('Agent updated');
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Agent deleted');
      qc.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: (e) => toast.error(e instanceof ApiClientError ? e.message : 'Failed'),
  });

  function startEdit(agent: Agent) {
    setShowCreate(false);
    setEditingId(agent.id);
    setForm({
      agentName: agent.agentName,
      companyName: agent.companyName,
      retellAgentId: agent.retellAgentId || '',
      retellPhoneNumber: agent.retellPhoneNumber || '',
      isDefault: agent.isDefault,
      agentPersona: agent.agentPersona || '',
      primaryObjective: agent.primaryObjective || '',
      openingMessage: agent.openingMessage || '',
      valueProposition: agent.valueProposition || '',
    });
  }

  const formCard = (
    <Card className="grid gap-3 p-4 md:grid-cols-2">
      <div className="space-y-1">
        <Label>Agent name</Label>
        <Input
          value={form.agentName}
          onChange={(e) => setForm({ ...form, agentName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Company</Label>
        <Input
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Retell agent ID</Label>
        <Input
          placeholder="agent_…"
          value={form.retellAgentId}
          onChange={(e) => setForm({ ...form, retellAgentId: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Retell phone number</Label>
        <Input
          placeholder="+1…"
          value={form.retellPhoneNumber}
          onChange={(e) => setForm({ ...form, retellPhoneNumber: e.target.value })}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Primary objective</Label>
        <Input
          value={form.primaryObjective}
          onChange={(e) => setForm({ ...form, primaryObjective: e.target.value })}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Persona</Label>
        <Input
          value={form.agentPersona}
          onChange={(e) => setForm({ ...form, agentPersona: e.target.value })}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Opening message</Label>
        <Input
          value={form.openingMessage}
          onChange={(e) => setForm({ ...form, openingMessage: e.target.value })}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Value proposition</Label>
        <Input
          value={form.valueProposition}
          onChange={(e) => setForm({ ...form, valueProposition: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
        />
        Default agent for campaigns without a selection
      </label>
      <div className="flex gap-2 md:col-span-2">
        {editingId ? (
          <>
            <Button
              onClick={() => update.mutate()}
              disabled={
                !form.agentName ||
                !form.retellAgentId ||
                !form.retellPhoneNumber ||
                update.isPending
              }
            >
              Save changes
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            onClick={() => create.mutate()}
            disabled={
              !form.agentName ||
              !form.retellAgentId ||
              !form.retellPhoneNumber ||
              create.isPending
            }
          >
            Save agent
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Retell credentials and persona for outbound calling
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowCreate((v) => !v);
          }}
        >
          Add agent
        </Button>
      </div>

      {showCreate || editingId ? formCard : null}

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : !data?.length ? (
        <EmptyState
          title="No agents yet"
          description="Add a Retell agent ID and phone number to start dialing campaigns."
        />
      ) : (
        <div className="grid gap-4">
          {data.map((agent) => (
            <Card key={agent.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl">{agent.agentName}</h2>
                    {agent.isDefault ? <Badge tone="success">Default</Badge> : null}
                    <Badge>{agent.companyName}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Agent ID: {agent.retellAgentId || '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Phone: {agent.retellPhoneNumber || '—'}
                  </p>
                  {agent.primaryObjective ? (
                    <p className="mt-2 text-sm">{agent.primaryObjective}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="info">{agent._count?.campaigns ?? 0} campaigns</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => startEdit(agent)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(agent.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
