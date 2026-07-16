-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SALES_REP');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'READY_TO_CALL', 'CALLING', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CALLBACK_REQUESTED', 'MEETING_BOOKED', 'DO_NOT_CALL', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('NEW_LEAD', 'DISCOVERY', 'QUALIFIED', 'DEMO_BOOKED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CampaignLeadStatus" AS ENUM ('PENDING', 'QUEUED', 'CALLED', 'COMPLETED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('MEETING_BOOKED', 'QUALIFIED_NO_MEETING', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'NOT_QUALIFIED', 'WRONG_PERSON', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'FAILED', 'DO_NOT_CALL', 'TRANSFERRED_TO_HUMAN', 'FOLLOW_UP_REQUIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SalesStrategy" AS ENUM ('DISCOVERY', 'CONSULTATIVE', 'ROI', 'COMPETITOR_REPLACEMENT', 'URGENCY', 'EDUCATIONAL', 'FAST_CLOSE');

-- CreateEnum
CREATE TYPE "BudgetLevel" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "AuthorityLevel" AS ENUM ('UNKNOWN', 'INFLUENCER', 'EVALUATOR', 'DECISION_MAKER');

-- CreateEnum
CREATE TYPE "NeedLevel" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TimelineLevel" AS ENUM ('UNKNOWN', 'NO_TIMELINE', 'OVER_90_DAYS', 'WITHIN_90_DAYS', 'WITHIN_30_DAYS', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "ObjectionCategory" AS ENUM ('PRICE', 'BUDGET', 'TIMING', 'AUTHORITY', 'COMPETITOR', 'TRUST', 'FEATURE_GAP', 'NOT_INTERESTED', 'NEEDS_MORE_INFORMATION', 'INTERNAL_RESOURCES', 'IMPLEMENTATION_COMPLEXITY', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ObjectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('DISCOVERY', 'DEMO', 'PROPOSAL', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('CALLBACK', 'EMAIL', 'MEETING_REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ToolExecutionStatus" AS ENUM ('SUCCESS', 'FAILURE', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "HandoffUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('COLD', 'WARM');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CompetitorSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessHoursJson" JSONB NOT NULL DEFAULT '{}',
    "defaultMeetingDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "transferNumber" TEXT,
    "transferType" "TransferType" NOT NULL DEFAULT 'WARM',
    "retellAgentId" TEXT,
    "retellPhoneNumber" TEXT,
    "complianceRules" TEXT,
    "pricingConfig" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SALES_REP',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "companySize" TEXT,
    "industry" TEXT,
    "website" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "source" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'NEW_LEAD',
    "estimatedDealValue" DECIMAL(12,2),
    "preferredCallTime" TEXT,
    "notes" TEXT,
    "doNotCall" BOOLEAN NOT NULL DEFAULT false,
    "knownPainPoint" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "retellAgentId" TEXT,
    "retellPhoneNumber" TEXT,
    "productName" TEXT NOT NULL DEFAULT 'AutomateFlow',
    "targetAudience" TEXT,
    "defaultObjective" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLead" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "CampaignLeadStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "retellCallId" TEXT,
    "direction" "CallDirection" NOT NULL DEFAULT 'OUTBOUND',
    "status" "CallStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "disconnectionReason" TEXT,
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "transcriptObject" JSONB,
    "callSummary" TEXT,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'UNKNOWN',
    "callOutcome" "CallOutcome" NOT NULL DEFAULT 'UNKNOWN',
    "qualified" BOOLEAN,
    "leadScore" INTEGER,
    "closeProbability" INTEGER,
    "buyingIntentScore" INTEGER,
    "salesStrategyUsed" "SalesStrategy",
    "recommendedNextAction" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "rawRetellPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "budgetLevel" "BudgetLevel" NOT NULL DEFAULT 'UNKNOWN',
    "budgetDetails" TEXT,
    "authorityLevel" "AuthorityLevel" NOT NULL DEFAULT 'UNKNOWN',
    "authorityDetails" TEXT,
    "needLevel" "NeedLevel" NOT NULL DEFAULT 'UNKNOWN',
    "needDetails" TEXT,
    "timelineLevel" "TimelineLevel" NOT NULL DEFAULT 'UNKNOWN',
    "timelineDetails" TEXT,
    "painPoints" JSONB,
    "businessGoals" JSONB,
    "currentProcess" TEXT,
    "decisionProcess" TEXT,
    "successCriteria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "category" "ObjectionCategory" NOT NULL DEFAULT 'OTHER',
    "statement" TEXT NOT NULL,
    "severity" "ObjectionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "responseUsed" TEXT,
    "resolutionNotes" TEXT,
    "timestampSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorMention" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "competitorName" TEXT NOT NULL,
    "context" TEXT,
    "sentiment" "CompetitorSentiment" NOT NULL DEFAULT 'UNKNOWN',
    "timestampSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitorMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "callId" TEXT,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "meetingType" "MeetingType" NOT NULL DEFAULT 'DEMO',
    "meetingUrl" TEXT,
    "notes" TEXT,
    "externalReference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallEvent" (
    "id" TEXT NOT NULL,
    "retellCallId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookProcessingJob" (
    "id" TEXT NOT NULL,
    "callEventId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolExecution" (
    "id" TEXT NOT NULL,
    "callId" TEXT,
    "toolName" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "status" "ToolExecutionStatus" NOT NULL DEFAULT 'SUCCESS',
    "executionTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "callId" TEXT,
    "type" "FollowUpType" NOT NULL DEFAULT 'CALLBACK',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "agentName" TEXT NOT NULL DEFAULT 'Ava',
    "companyName" TEXT NOT NULL DEFAULT 'AutomateFlow',
    "agentPersona" TEXT,
    "primaryObjective" TEXT,
    "openingMessage" TEXT,
    "valueProposition" TEXT,
    "qualificationRules" TEXT,
    "objectionRules" TEXT,
    "transferRules" TEXT,
    "bookingRules" TEXT,
    "complianceRules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanHandoff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "callId" TEXT,
    "reason" TEXT NOT NULL,
    "urgency" "HandoffUrgency" NOT NULL DEFAULT 'MEDIUM',
    "summary" TEXT,
    "transferNumber" TEXT NOT NULL,
    "salesRepName" TEXT,
    "transferType" "TransferType" NOT NULL DEFAULT 'WARM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_pipelineStage_idx" ON "Lead"("pipelineStage");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Lead_organizationId_pipelineStage_idx" ON "Lead"("organizationId", "pipelineStage");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignLead_campaignId_idx" ON "CampaignLead"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLead_leadId_idx" ON "CampaignLead"("leadId");

-- CreateIndex
CREATE INDEX "CampaignLead_status_idx" ON "CampaignLead"("status");

-- CreateIndex
CREATE INDEX "CampaignLead_nextAttemptAt_idx" ON "CampaignLead"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLead_campaignId_leadId_key" ON "CampaignLead"("campaignId", "leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_retellCallId_key" ON "Call"("retellCallId");

-- CreateIndex
CREATE INDEX "Call_organizationId_idx" ON "Call"("organizationId");

-- CreateIndex
CREATE INDEX "Call_leadId_idx" ON "Call"("leadId");

-- CreateIndex
CREATE INDEX "Call_campaignId_idx" ON "Call"("campaignId");

-- CreateIndex
CREATE INDEX "Call_retellCallId_idx" ON "Call"("retellCallId");

-- CreateIndex
CREATE INDEX "Call_status_idx" ON "Call"("status");

-- CreateIndex
CREATE INDEX "Call_callOutcome_idx" ON "Call"("callOutcome");

-- CreateIndex
CREATE INDEX "Call_createdAt_idx" ON "Call"("createdAt");

-- CreateIndex
CREATE INDEX "Call_organizationId_status_idx" ON "Call"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Call_organizationId_createdAt_idx" ON "Call"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_callId_key" ON "Qualification"("callId");

-- CreateIndex
CREATE INDEX "Objection_callId_idx" ON "Objection"("callId");

-- CreateIndex
CREATE INDEX "Objection_category_idx" ON "Objection"("category");

-- CreateIndex
CREATE INDEX "CompetitorMention_callId_idx" ON "CompetitorMention"("callId");

-- CreateIndex
CREATE INDEX "CompetitorMention_competitorName_idx" ON "CompetitorMention"("competitorName");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_idx" ON "Appointment"("organizationId");

-- CreateIndex
CREATE INDEX "Appointment_leadId_idx" ON "Appointment"("leadId");

-- CreateIndex
CREATE INDEX "Appointment_callId_idx" ON "Appointment"("callId");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_startTime_idx" ON "Appointment"("organizationId", "startTime");

-- CreateIndex
CREATE INDEX "CallEvent_retellCallId_idx" ON "CallEvent"("retellCallId");

-- CreateIndex
CREATE INDEX "CallEvent_eventType_idx" ON "CallEvent"("eventType");

-- CreateIndex
CREATE INDEX "CallEvent_createdAt_idx" ON "CallEvent"("createdAt");

-- CreateIndex
CREATE INDEX "CallEvent_processedAt_idx" ON "CallEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallEvent_retellCallId_eventType_payloadHash_key" ON "CallEvent"("retellCallId", "eventType", "payloadHash");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_status_createdAt_idx" ON "WebhookProcessingJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookProcessingJob_callEventId_idx" ON "WebhookProcessingJob"("callEventId");

-- CreateIndex
CREATE INDEX "ToolExecution_callId_idx" ON "ToolExecution"("callId");

-- CreateIndex
CREATE INDEX "ToolExecution_toolName_idx" ON "ToolExecution"("toolName");

-- CreateIndex
CREATE INDEX "ToolExecution_createdAt_idx" ON "ToolExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_idempotencyKey_key" ON "FollowUp"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_callId_idx" ON "FollowUp"("callId");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledFor_idx" ON "FollowUp"("scheduledFor");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "AgentConfiguration_organizationId_idx" ON "AgentConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "AgentConfiguration_campaignId_idx" ON "AgentConfiguration"("campaignId");

-- CreateIndex
CREATE INDEX "HumanHandoff_organizationId_idx" ON "HumanHandoff"("organizationId");

-- CreateIndex
CREATE INDEX "HumanHandoff_leadId_idx" ON "HumanHandoff"("leadId");

-- CreateIndex
CREATE INDEX "HumanHandoff_callId_idx" ON "HumanHandoff"("callId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLead" ADD CONSTRAINT "CampaignLead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objection" ADD CONSTRAINT "Objection_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorMention" ADD CONSTRAINT "CompetitorMention_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookProcessingJob" ADD CONSTRAINT "WebhookProcessingJob_callEventId_fkey" FOREIGN KEY ("callEventId") REFERENCES "CallEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConfiguration" ADD CONSTRAINT "AgentConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentConfiguration" ADD CONSTRAINT "AgentConfiguration_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

