export interface RetellOutboundCallRequest {
  fromNumber: string;
  toNumber: string;
  agentId: string;
  metadata: {
    closerCallId: string;
    leadId: string;
    campaignId: string;
    organizationId: string;
  };
  retellLlmDynamicVariables: Record<string, string>;
}

export interface RetellOutboundCallResult {
  retellCallId: string;
  raw?: unknown;
}

export interface RetellWebCallRequest {
  agentId: string;
  metadata: {
    closerCallId: string;
    leadId: string;
    campaignId: string;
    organizationId: string;
    callType: 'web';
  };
  retellLlmDynamicVariables: Record<string, string>;
}

export interface RetellWebCallResult {
  retellCallId: string;
  accessToken: string;
  raw?: unknown;
}

export interface IRetellClient {
  createPhoneCall(req: RetellOutboundCallRequest): Promise<RetellOutboundCallResult>;
  createWebCall(req: RetellWebCallRequest): Promise<RetellWebCallResult>;
}

export interface IRetellSignatureVerifier {
  verify(
    rawBody: string,
    apiKey: string,
    signatureHeader: string,
    toleranceSeconds: number,
  ): boolean;
}

export interface RetellDynamicVariables {
  lead_id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  job_title: string;
  industry: string;
  company_size: string;
  lead_source: string;
  known_pain_point: string;
  previous_interaction_summary: string;
  product_name: string;
  sales_objective: string;
  assigned_sales_rep: string;
  sales_rep_phone: string;
  company_timezone: string;
  lead_timezone: string;
}

export type RetellWebhookEventType =
  | 'call_started'
  | 'call_ended'
  | 'call_analyzed'
  | string;

export interface RetellWebhookPayload {
  event: RetellWebhookEventType;
  call: Record<string, unknown>;
}
