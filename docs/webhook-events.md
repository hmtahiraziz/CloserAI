# Webhook events

`POST /api/webhooks/retell`

## Verification

Use raw body + `X-Retell-Signature` (`v=<ts>,d=<hmac>`). HMAC-SHA256 over `rawBody + timestamp` with API key. Reject if outside tolerance.

## Idempotency

`CallEvent` unique on `(retellCallId, eventType, payloadHash)`. Duplicates return 200 without re-applying domain effects.

## Events

- **call_started** — Call IN_PROGRESS, lead CALLING
- **call_ended** — duration, disconnect, transcript/recording; telephony outcomes; attempt counters
- **call_analyzed** — validate custom fields; upsert Qualification; objections; competitors; lead/pipeline mapping

Unknown events are stored, not domain-processed. Processing failures are recorded on the job for retry.
