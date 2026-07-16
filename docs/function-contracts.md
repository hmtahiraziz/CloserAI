# Retell custom function contracts

All endpoints: `POST /api/retell/functions/{name}`  
Headers: `X-Retell-Signature`, `Content-Type: application/json`  
Body: Retell function payload with `args` (or args-only mode).

| Function | Input | Output |
|----------|-------|--------|
| get_lead_context | lead_id | lead, previous_calls, pipeline, pain points, DNC |
| save_call_discovery | lead_id, call_id, discoveries | success, saved_fields |
| check_availability | lead_id, preferred_date, timezone, meeting_duration_minutes | 3–5 ISO slots |
| book_meeting | lead_id, call_id, start_time, timezone, email, meeting_purpose | appointment confirmation |
| schedule_callback | lead_id, call_id, callback_time, timezone, reason | follow_up_id |
| mark_do_not_call | lead_id, call_id, reason | success, lead_status |
| update_lead_status | lead_id, call_id, status, notes | success, current_status |
| get_pricing_information | package_name, company_size?, requirements? | configured package pricing |
| create_human_handoff | lead_id, call_id, reason, urgency, summary | transfer destination |

Failures return short agent-safe messages (never stack traces).
