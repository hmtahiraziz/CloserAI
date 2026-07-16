# Architecture

## System context

```mermaid
flowchart LR
  Manager[SalesManager]
  Web[NextJsDashboard]
  Api[NestJsApi]
  Db[(PostgreSQL)]
  Retell[RetellAI]
  Prospect[ProspectPhone]

  Manager --> Web --> Api --> Db
  Api -->|createPhoneCall| Retell
  Retell -->|voice| Prospect
  Retell -->|custom functions| Api
  Retell -->|webhooks| Api
```

## Containers

```mermaid
flowchart TB
  subgraph closerai [CloserAI]
    web[apps/web]
    api[apps/api]
    shared[packages/shared]
    database[packages/database]
  end
  pg[(Postgres)]
  retell[Retell Cloud]

  web --> api
  api --> database --> pg
  api --> retell
  retell --> api
  api --> shared
  web --> shared
```

## Outbound call sequence

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  participant Retell
  UI->>API: POST /api/leads/:id/calls
  API->>DB: Create Call QUEUED
  API->>Retell: createPhoneCall + dynamic vars
  Retell-->>API: call_id
  API->>DB: Store retellCallId, lead CALLING
  API-->>UI: Call record
```

## Webhook sequence

```mermaid
sequenceDiagram
  participant Retell
  participant API
  participant CallEvent
  participant Processor
  participant DB
  Retell->>API: POST /api/webhooks/retell
  API->>API: Verify signature raw body
  API->>CallEvent: Insert idempotent hash
  API-->>Retell: 200
  API->>Processor: Process event
  Processor->>DB: Update Call/Lead/Qualification
```

## Meeting booking sequence

```mermaid
sequenceDiagram
  participant Agent as RetellAgent
  participant Fn as RetellFunctions
  participant Appt as AppointmentsService
  participant DB
  Agent->>Fn: check_availability
  Fn->>Appt: weekly schedule slots
  Appt-->>Agent: ISO slots
  Agent->>Fn: book_meeting
  Fn->>Appt: book idempotent
  Appt->>DB: Appointment + lead MEETING_BOOKED
  Fn-->>Agent: confirmation
```

## Security boundaries

- HTTP-only session cookies; CSRF companion cookie
- Org-scoped data access on every query
- Retell API key never exposed to the browser
- Webhook and custom-function HMAC verification on raw body
- DNC enforced in LeadsService and CallsService
- Admin-only raw payload debugging and demo simulation

## Ownership

| Concern | Owner |
|---------|-------|
| Voice, LLM reasoning, KB retrieval, ASR/TTS | Retell |
| Auth, leads, campaigns, analytics UI | CloserAI |
| Custom function business logic | CloserAI |
| Post-call structured analysis generation | Retell |
| Analysis validation & persistence | CloserAI |
