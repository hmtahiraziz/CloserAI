import { z } from 'zod';
import {
  AppointmentStatus,
  AuthorityLevel,
  BudgetLevel,
  CallOutcome,
  CampaignStatus,
  LeadStatus,
  MeetingType,
  NeedLevel,
  ObjectionCategory,
  ObjectionSeverity,
  PipelineStage,
  SalesStrategy,
  TimelineLevel,
  UserRole,
} from './enums';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(5).max(30),
  companyName: z.string().min(1).max(200),
  jobTitle: z.string().max(150).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  pipelineStage: z.nativeEnum(PipelineStage).optional(),
  estimatedDealValue: z.number().nonnegative().optional().nullable(),
  preferredCallTime: z.string().max(200).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  /** Optional campaign to assign the lead to on create */
  campaignId: z.string().cuid().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema
  .omit({ campaignId: true })
  .partial()
  .extend({
    doNotCall: z.boolean().optional(),
    nextFollowUpAt: z.string().datetime().optional().nullable(),
  });

export const leadFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  pipelineStage: z.nativeEnum(PipelineStage).optional(),
  campaignId: z.string().cuid().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  /** Prefer selecting an agent from the Agents tab; credentials resolve from that agent. */
  agentConfigurationId: z.string().cuid().optional().nullable(),
  retellAgentId: z.string().max(200).optional().nullable(),
  retellPhoneNumber: z.string().max(30).optional().nullable(),
  productName: z.string().max(200).default('AutomateFlow'),
  targetAudience: z.string().max(500).optional().nullable(),
  defaultObjective: z.string().max(500).optional().nullable(),
  status: z.nativeEnum(CampaignStatus).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const createAgentSchema = z.object({
  agentName: z.string().min(1).max(100),
  companyName: z.string().min(1).max(200).default('AutomateFlow'),
  retellAgentId: z.string().min(1).max(200),
  retellPhoneNumber: z.string().min(5).max(30),
  isDefault: z.boolean().optional(),
  agentPersona: z.string().max(2000).optional().nullable(),
  primaryObjective: z.string().max(1000).optional().nullable(),
  openingMessage: z.string().max(2000).optional().nullable(),
  valueProposition: z.string().max(2000).optional().nullable(),
  qualificationRules: z.string().max(5000).optional().nullable(),
  objectionRules: z.string().max(5000).optional().nullable(),
  transferRules: z.string().max(5000).optional().nullable(),
  bookingRules: z.string().max(5000).optional().nullable(),
  complianceRules: z.string().max(5000).optional().nullable(),
  campaignId: z.string().cuid().optional().nullable(),
});

export const updateAgentSchema = createAgentSchema.partial();


export const startCallSchema = z.object({
  campaignId: z.string().cuid(),
  idempotencyKey: z.string().max(100).optional(),
});

/** Same payload as phone outbound; no destination number required (browser mic). */
export const startWebCallSchema = startCallSchema;

export const bookMeetingArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  start_time: z.string().min(1),
  timezone: z.string().min(1),
  email: z.string().email(),
  meeting_purpose: z.string().max(500).optional(),
});

export const checkAvailabilityArgsSchema = z.object({
  lead_id: z.string().min(1),
  preferred_date: z.string().min(1),
  timezone: z.string().min(1),
  meeting_duration_minutes: z.coerce.number().int().min(15).max(120).default(30),
});

export const scheduleCallbackArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  callback_time: z.string().min(1),
  timezone: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export const markDoNotCallArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export const updateLeadStatusArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  status: z.nativeEnum(LeadStatus),
  notes: z.string().max(2000).optional(),
});

export const getLeadContextArgsSchema = z.object({
  lead_id: z.string().min(1),
});

export const saveCallDiscoveryArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  pain_points: z.array(z.string()).optional(),
  business_goals: z.array(z.string()).optional(),
  current_process: z.string().optional(),
  tools_used: z.array(z.string()).optional(),
  decision_process: z.string().optional(),
  notes: z.string().optional(),
});

export const getPricingArgsSchema = z.object({
  package_name: z.string().min(1),
  company_size: z.string().optional(),
  requested_requirements: z.string().optional(),
});

export const createHandoffArgsSchema = z.object({
  lead_id: z.string().min(1),
  call_id: z.string().min(1),
  reason: z.string().min(1).max(1000),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  summary: z.string().max(2000).optional(),
});

export const objectionAnalysisSchema = z.object({
  category: z.nativeEnum(ObjectionCategory).or(z.string()),
  statement: z.string(),
  severity: z.nativeEnum(ObjectionSeverity).or(z.string()).optional(),
  resolved: z.boolean().optional(),
  response_used: z.string().optional(),
  resolution_notes: z.string().optional(),
  timestamp_seconds: z.number().optional(),
});

export const competitorAnalysisSchema = z.object({
  competitor_name: z.string(),
  context: z.string().optional(),
  sentiment: z.string().optional(),
  timestamp_seconds: z.number().optional(),
});

export const postCallAnalysisSchema = z.object({
  call_outcome: z.nativeEnum(CallOutcome).or(z.string()).optional(),
  qualified: z.boolean().optional(),
  lead_score: z.number().min(0).max(100).optional(),
  close_probability: z.number().min(0).max(100).optional(),
  buying_intent_score: z.number().min(0).max(100).optional(),
  budget_level: z.nativeEnum(BudgetLevel).or(z.string()).optional(),
  budget_details: z.string().optional(),
  authority_level: z.nativeEnum(AuthorityLevel).or(z.string()).optional(),
  authority_details: z.string().optional(),
  need_level: z.nativeEnum(NeedLevel).or(z.string()).optional(),
  need_details: z.string().optional(),
  timeline_level: z.nativeEnum(TimelineLevel).or(z.string()).optional(),
  timeline_details: z.string().optional(),
  pain_points: z.array(z.string()).optional(),
  business_goals: z.array(z.string()).optional(),
  current_process: z.string().optional(),
  objections: z.array(objectionAnalysisSchema).optional(),
  competitors_mentioned: z.array(competitorAnalysisSchema).optional(),
  sales_strategy_used: z.nativeEnum(SalesStrategy).or(z.string()).optional(),
  recommended_next_action: z.string().optional(),
  meeting_booked: z.boolean().optional(),
  callback_requested: z.boolean().optional(),
  human_transfer_requested: z.boolean().optional(),
  do_not_call_requested: z.boolean().optional(),
  summary_for_sales_rep: z.string().optional(),
});

export const createAppointmentSchema = z.object({
  leadId: z.string().cuid(),
  callId: z.string().cuid().optional(),
  title: z.string().min(1).max(200),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().min(1),
  meetingType: z.nativeEnum(MeetingType).optional(),
  meetingUrl: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export const updateSettingsSchema = z.object({
  businessHoursJson: z.record(z.unknown()).optional(),
  defaultMeetingDurationMinutes: z.number().int().min(15).max(120).optional(),
  transferNumber: z.string().max(30).optional().nullable(),
  transferType: z.enum(['COLD', 'WARM']).optional(),
  retellAgentId: z.string().max(200).optional().nullable(),
  retellPhoneNumber: z.string().max(30).optional().nullable(),
  complianceRules: z.string().max(5000).optional().nullable(),
  pricingConfig: z.record(z.unknown()).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type StartCallInput = z.infer<typeof startCallSchema>;
export type PostCallAnalysis = z.infer<typeof postCallAnalysisSchema>;
export type UserRoleType = `${UserRole}`;
