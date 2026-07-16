'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Mic, MicOff, PhoneOff, Headphones } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { Badge, Button, Card } from '@/components/ui';
import Link from 'next/link';

type WebCallSession = {
  call: { id: string };
  accessToken: string;
  retellCallId: string;
};

type TranscriptLine = { role: string; content: string };

type Props = {
  leadId: string;
  campaignId?: string;
  disabled?: boolean;
};

export function WebCallPanel({ leadId, campaignId, disabled }: Props) {
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'live' | 'ended' | 'error'>('idle');
  const [agentTalking, setAgentTalking] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const clientRef = useRef<{
    startCall: (c: { accessToken: string }) => Promise<void>;
    stopCall: () => void;
    mute: () => void;
    unmute: () => void;
    on: (event: string, cb: (...args: unknown[]) => void) => void;
    off: (event: string, cb: (...args: unknown[]) => void) => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      try {
        clientRef.current?.stopCall();
      } catch {
        // ignore
      }
    };
  }, []);

  async function startWebCall() {
    if (!campaignId) {
      toast.error('No active campaign. Activate a campaign first.');
      return;
    }
    setStarting(true);
    setStatus('connecting');
    setLines([]);
    try {
      const session = await api<WebCallSession>(`/leads/${leadId}/web-calls`, {
        method: 'POST',
        body: JSON.stringify({ campaignId }),
      });

      const { RetellWebClient } = await import('retell-client-js-sdk');
      const client = new RetellWebClient();
      clientRef.current = client as unknown as typeof clientRef.current;

      const onStarted = () => {
        setActive(true);
        setStatus('live');
        toast.success('Web call connected — speak with your mic');
      };
      const onEnded = () => {
        setActive(false);
        setStatus('ended');
        setAgentTalking(false);
        toast.message('Web call ended. Analysis will appear when Retell webhooks arrive.');
      };
      const onError = (err: unknown) => {
        setStatus('error');
        setActive(false);
        toast.error(err instanceof Error ? err.message : 'Web call error');
      };
      const onUpdate = (update: unknown) => {
        const u = update as {
          transcript?: string;
          transcript_with_tool_calls?: Array<{ role?: string; content?: string }>;
        };
        if (Array.isArray(u.transcript_with_tool_calls)) {
          setLines(
            u.transcript_with_tool_calls
              .filter((t) => t.content)
              .map((t) => ({ role: t.role || 'unknown', content: String(t.content) })),
          );
        } else if (typeof u.transcript === 'string' && u.transcript.trim()) {
          setLines([{ role: 'transcript', content: u.transcript }]);
        }
      };

      client.on('call_started', onStarted);
      client.on('call_ended', onEnded);
      client.on('error', onError);
      client.on('update', onUpdate);
      client.on('agent_start_talking', () => setAgentTalking(true));
      client.on('agent_stop_talking', () => setAgentTalking(false));

      setCallId(session.call.id);
      await client.startCall({ accessToken: session.accessToken });
      // Session is live once startCall resolves; call_started may also fire
      setActive(true);
      setStatus((s) => (s === 'connecting' ? 'live' : s));
    } catch (e) {
      setStatus('error');
      toast.error(e instanceof ApiClientError ? e.message : 'Failed to start web call');
    } finally {
      setStarting(false);
    }
  }

  function hangUp() {
    try {
      clientRef.current?.stopCall();
    } catch {
      // ignore
    }
    setActive(false);
    setStatus('ended');
    setAgentTalking(false);
  }

  function toggleMute() {
    if (!clientRef.current) return;
    if (muted) {
      clientRef.current.unmute();
      setMuted(false);
    } else {
      clientRef.current.mute();
      setMuted(true);
    }
  }

  return (
    <Card className="space-y-4 border-teal-200/80 bg-gradient-to-br from-white to-teal-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-teal-800" />
            <h2 className="font-semibold">Test Web Call</h2>
            <Badge tone="info">No phone required</Badge>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Talk to the Retell agent in your browser with mic and speakers. Needs{' '}
            <code className="text-xs">RETELL_API_KEY</code> + <code className="text-xs">RETELL_AGENT_ID</code>{' '}
            — not a Retell phone number.
          </p>
        </div>
        {!active ? (
          <Button disabled={disabled || starting || !campaignId} onClick={startWebCall}>
            {starting ? 'Connecting…' : 'Start Web Call'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={toggleMute}>
              {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button variant="danger" onClick={hangUp}>
              <PhoneOff className="h-4 w-4" />
              End call
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Badge tone={status === 'live' ? 'success' : status === 'error' ? 'danger' : 'default'}>
          Status: {status}
        </Badge>
        {agentTalking ? <Badge tone="warning">Agent speaking</Badge> : null}
        {callId ? (
          <Link href={`/calls/${callId}`} className="text-primary hover:underline">
            Open call record →
          </Link>
        ) : null}
      </div>

      {lines.length > 0 ? (
        <div className="max-h-56 overflow-auto rounded-md border bg-white p-3 text-sm">
          {lines.map((line, i) => (
            <p key={`${i}-${line.content.slice(0, 12)}`} className="mb-2 last:mb-0">
              <span className="font-medium capitalize text-slate-700">{line.role}: </span>
              <span className="text-slate-600">{line.content}</span>
            </p>
          ))}
        </div>
      ) : active ? (
        <p className="text-sm text-muted-foreground">Live transcript will appear as you talk…</p>
      ) : null}
    </Card>
  );
}
