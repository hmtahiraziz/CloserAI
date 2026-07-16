# Retell setup

1. Create a Retell account and API key (webhook-capable key).
2. Create a **Conversation Flow** agent (not a custom LLM WebSocket).
3. Select a Retell-managed response engine / voice.
4. Import knowledge-base documents from `docs/retell-knowledge-base/`.
5. Add dynamic variables listed in README / agent prompt.
6. Create custom functions pointing to:
   - `POST {API_URL}/api/retell/functions/get_lead_context`
   - `.../save_call_discovery`
   - `.../check_availability`
   - `.../book_meeting`
   - `.../schedule_callback`
   - `.../mark_do_not_call`
   - `.../update_lead_status`
   - `.../get_pricing_information`
   - `.../create_human_handoff`
7. Enable transfer-call and end-call tools.
8. Configure custom post-call analysis fields (see webhook docs).
9. Purchase/import a phone number; bind the outbound agent (required for **phone** outbound only).
10. Set webhook URL to `{public_api}/api/webhooks/retell` for `call_started`, `call_ended`, `call_analyzed`.
11. Test from the Retell dashboard, then set `RETELL_API_KEY`, `RETELL_AGENT_ID`, `RETELL_PHONE_NUMBER` in `.env`.
12. Expose local API via tunnel (ngrok/cloudflared) for webhooks and functions during development.

## Browser web call (no phone number)

CloserAI includes an in-app **Test Web Call** on each lead detail page.

Requirements:
- `RETELL_API_KEY`
- `RETELL_AGENT_ID` (or campaign `retellAgentId`)
- An **ACTIVE** campaign
- Browser microphone permission

Not required for web call:
- `RETELL_PHONE_NUMBER`
- Lead phone validity (still enforced for phone outbound)

Flow:
1. Open a lead in CloserAI.
2. Click **Start Web Call**.
3. Allow mic access; speak with the agent.
4. Hang up when done. Retell webhooks still update the call record (use ngrok so webhooks reach your API).

API: `POST /api/leads/:leadId/web-calls` with `{ "campaignId": "..." }` returns `{ call, accessToken, retellCallId }`.
The frontend uses `retell-client-js-sdk` with that access token.
