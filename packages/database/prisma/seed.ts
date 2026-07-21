import { PrismaClient, UserRole, LeadStatus, PipelineStage, CampaignStatus, CallStatus, CallOutcome, Sentiment, SalesStrategy, BudgetLevel, AuthorityLevel, NeedLevel, TimelineLevel, ObjectionCategory, ObjectionSeverity, AppointmentStatus, MeetingType, CompetitorSentiment, TransferType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PRICING = {
  starter: {
    package: 'Starter Automation',
    approved_price_range: '$1,500 – $3,500 / month',
    included_features: [
      'One focused workflow automation',
      'Email + CRM sync',
      'Basic analytics dashboard',
      'Email support',
    ],
    limitations: ['Single workflow', 'Up to 2 integrations', 'No custom model training'],
    requires_custom_quote: false,
  },
  growth: {
    package: 'Growth Automation',
    approved_price_range: '$4,000 – $9,000 / month',
    included_features: [
      'Multiple connected workflows',
      'Up to 8 integrations',
      'Lead routing + support automation',
      'Dedicated success manager',
    ],
    limitations: ['No on-prem deployment', 'Standard SLA'],
    requires_custom_quote: false,
  },
  custom: {
    package: 'Custom AI Operations',
    approved_price_range: 'Discovery-based (typically $12,000+ / month)',
    included_features: [
      'Custom automation systems',
      'Advanced document processing',
      'Security review support',
      'Priority engineering',
    ],
    limitations: ['Requires discovery workshop'],
    requires_custom_quote: true,
  },
};

async function main() {
  console.log('Seeding CloserAI demo data...');

  await prisma.webhookProcessingJob.deleteMany();
  await prisma.callEvent.deleteMany();
  await prisma.toolExecution.deleteMany();
  await prisma.objection.deleteMany();
  await prisma.competitorMention.deleteMany();
  await prisma.qualification.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.humanHandoff.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.call.deleteMany();
  await prisma.campaignLead.deleteMany();
  await prisma.agentConfiguration.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.organizationSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'AutomateFlow Sales',
      slug: 'automateflow',
      timezone: 'America/New_York',
      settings: {
        create: {
          businessHoursJson: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: null,
            sunday: null,
          },
          defaultMeetingDurationMinutes: 30,
          transferNumber: '+15555550199',
          transferType: TransferType.WARM,
          retellAgentId: process.env.RETELL_AGENT_ID || 'agent_demo_placeholder',
          retellPhoneNumber: process.env.RETELL_PHONE_NUMBER || '+15555550100',
          complianceRules:
            'Disclose AI identity when asked. Honor do-not-call immediately. Do not invent pricing.',
          pricingConfig: PRICING,
        },
      },
    },
  });

  const passwordHash = await argon2.hash('DemoPass123!');

  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Alex Morgan',
      email: 'admin@closerai.demo',
      passwordHash,
      role: UserRole.ADMIN,
      phone: '+15555550101',
    },
  });

  const salesRep = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: 'Jordan Lee',
      email: 'rep@closerai.demo',
      passwordHash,
      role: UserRole.SALES_REP,
      phone: '+15555550102',
    },
  });

  const agent = await prisma.agentConfiguration.create({
    data: {
      organizationId: org.id,
      agentName: 'Ava',
      companyName: 'AutomateFlow',
      retellAgentId: process.env.RETELL_AGENT_ID || 'agent_demo_placeholder',
      retellPhoneNumber: process.env.RETELL_PHONE_NUMBER || '+15555550100',
      isDefault: true,
      agentPersona: 'Professional, consultative, calm AI sales assistant',
      primaryObjective: 'Qualify prospects and book discovery meetings',
      openingMessage:
        'Hi {{first_name}}, this is Ava, the AI sales assistant from AutomateFlow. Is now a reasonable time for a quick conversation?',
      valueProposition:
        'AutomateFlow helps SMBs automate lead handling, support, documents, and CRM workflows.',
      qualificationRules: 'Collect Budget, Authority, Need, Timeline naturally.',
      objectionRules: 'Acknowledge, clarify, answer from knowledge base, confirm resolution.',
      transferRules: 'Transfer on high intent, explicit request, or sensitive contract questions.',
      bookingRules: 'Offer 3–5 slots; confirm timezone and email before booking.',
      complianceRules: 'Disclose AI when asked. Honor DNC. Never invent facts.',
    },
  });

  const campaign1 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'SMB Workflow Outreach Q3',
      description: 'Outbound qualification for SMB AI workflow automation prospects.',
      status: CampaignStatus.ACTIVE,
      agentConfigurationId: agent.id,
      retellAgentId: agent.retellAgentId,
      retellPhoneNumber: agent.retellPhoneNumber,
      productName: 'AutomateFlow',
      targetAudience: 'SMB operations and growth leaders',
      defaultObjective: 'Qualify BANT and book a 30-minute discovery demo',
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      organizationId: org.id,
      name: 'Support Automation Expansion',
      description: 'Target companies with high support ticket volume.',
      status: CampaignStatus.ACTIVE,
      agentConfigurationId: agent.id,
      retellAgentId: agent.retellAgentId,
      retellPhoneNumber: agent.retellPhoneNumber,
      productName: 'AutomateFlow',
      targetAudience: 'Customer support directors at mid-market firms',
      defaultObjective: 'Identify support automation pain and book demo',
    },
  });

  await prisma.agentConfiguration.update({
    where: { id: agent.id },
    data: { campaignId: campaign1.id },
  });

  const leadDefs = [
    { firstName: 'Sarah', lastName: 'Chen', companyName: 'BrightLedger', industry: 'Accounting', companySize: '25-50', jobTitle: 'COO', phone: '+15551000001', status: LeadStatus.MEETING_BOOKED, stage: PipelineStage.DEMO_BOOKED, pain: 'Manual invoice follow-ups', value: 18000 },
    { firstName: 'Marcus', lastName: 'Nguyen', companyName: 'ParcelPath', industry: 'Logistics', companySize: '51-100', jobTitle: 'VP Operations', phone: '+15551000002', status: LeadStatus.QUALIFIED, stage: PipelineStage.QUALIFIED, pain: 'Dispatch coordination is slow', value: 42000 },
    { firstName: 'Elena', lastName: 'Rodriguez', companyName: 'CareSync Clinic', industry: 'Healthcare', companySize: '11-25', jobTitle: 'Practice Manager', phone: '+15551000003', status: LeadStatus.CALLBACK_REQUESTED, stage: PipelineStage.DISCOVERY, pain: 'Patient intake paperwork', value: 12000 },
    { firstName: 'James', lastName: 'Whitfield', companyName: 'Northwind Retail', industry: 'Retail', companySize: '101-250', jobTitle: 'CTO', phone: '+15551000004', status: LeadStatus.CONTACTED, stage: PipelineStage.DISCOVERY, pain: 'CRM data entry', value: 55000 },
    { firstName: 'Priya', lastName: 'Patel', companyName: 'Lumen Legal', industry: 'Legal', companySize: '25-50', jobTitle: 'Operations Director', phone: '+15551000005', status: LeadStatus.UNQUALIFIED, stage: PipelineStage.LOST, pain: 'Document review bottlenecks', value: 8000 },
    { firstName: 'David', lastName: 'Okoye', companyName: 'GreenGrid Energy', industry: 'Energy', companySize: '51-100', jobTitle: 'Head of Growth', phone: '+15551000006', status: LeadStatus.READY_TO_CALL, stage: PipelineStage.NEW_LEAD, pain: 'Lead routing delays', value: 30000 },
    { firstName: 'Hannah', lastName: 'Brooks', companyName: 'Summit SaaS', industry: 'Software', companySize: '25-50', jobTitle: 'CEO', phone: '+15551000007', status: LeadStatus.MEETING_BOOKED, stage: PipelineStage.DEMO_BOOKED, pain: 'Support ticket overload', value: 36000 },
    { firstName: 'Omar', lastName: 'Hassan', companyName: 'FleetForge', industry: 'Transportation', companySize: '101-250', jobTitle: 'COO', phone: '+15551000008', status: LeadStatus.CONTACTED, stage: PipelineStage.DISCOVERY, pain: 'Driver scheduling chaos', value: 48000 },
    { firstName: 'Lily', lastName: 'Zhang', companyName: 'Bloom Beauty', industry: 'Consumer Goods', companySize: '11-25', jobTitle: 'Founder', phone: '+15551000009', status: LeadStatus.NEW, stage: PipelineStage.NEW_LEAD, pain: 'Order exception handling', value: 9000 },
    { firstName: 'Chris', lastName: 'Walker', companyName: 'Apex Mortgage', industry: 'Finance', companySize: '51-100', jobTitle: 'VP Sales', phone: '+15551000010', status: LeadStatus.QUALIFIED, stage: PipelineStage.PROPOSAL, pain: 'Lead qualification capacity', value: 62000 },
    { firstName: 'Nina', lastName: 'Volkov', companyName: 'Orbit Media', industry: 'Marketing', companySize: '25-50', jobTitle: 'Managing Partner', phone: '+15551000011', status: LeadStatus.DO_NOT_CALL, stage: PipelineStage.LOST, pain: 'Client reporting automation', value: 15000 },
    { firstName: 'Tom', lastName: 'Garcia', companyName: 'BuildRight', industry: 'Construction', companySize: '51-100', jobTitle: 'Director of Ops', phone: '+15551000012', status: LeadStatus.CONTACTED, stage: PipelineStage.DISCOVERY, pain: 'Subcontractor coordination', value: 27000 },
    { firstName: 'Aisha', lastName: 'Johnson', companyName: 'Nova EdTech', industry: 'Education', companySize: '25-50', jobTitle: 'COO', phone: '+15551000013', status: LeadStatus.READY_TO_CALL, stage: PipelineStage.NEW_LEAD, pain: 'Enrollment follow-ups', value: 22000 },
    { firstName: 'Ben', lastName: 'Keller', companyName: 'Pulse Fitness', industry: 'Fitness', companySize: '11-25', jobTitle: 'Owner', phone: '+15551000014', status: LeadStatus.UNQUALIFIED, stage: PipelineStage.LOST, pain: 'Membership churn outreach', value: 5000 },
    { firstName: 'Rachel', lastName: 'Kim', companyName: 'Silverline Insurance', industry: 'Insurance', companySize: '101-250', jobTitle: 'Claims Ops Lead', phone: '+15551000015', status: LeadStatus.MEETING_BOOKED, stage: PipelineStage.DEMO_BOOKED, pain: 'Claims triage volume', value: 75000 },
    { firstName: 'Victor', lastName: 'Almeida', companyName: 'Coastal Foods', industry: 'Food & Beverage', companySize: '51-100', jobTitle: 'VP Supply Chain', phone: '+15551000016', status: LeadStatus.CONTACTED, stage: PipelineStage.DISCOVERY, pain: 'Purchase order exceptions', value: 33000 },
    { firstName: 'Grace', lastName: 'Murphy', companyName: 'Helix Biotech', industry: 'Biotech', companySize: '25-50', jobTitle: 'Lab Operations Manager', phone: '+15551000017', status: LeadStatus.CALLBACK_REQUESTED, stage: PipelineStage.DISCOVERY, pain: 'Lab request routing', value: 28000 },
    { firstName: 'Sam', lastName: 'Torres', companyName: 'CityHire Staffing', industry: 'Staffing', companySize: '51-100', jobTitle: 'CEO', phone: '+15551000018', status: LeadStatus.QUALIFIED, stage: PipelineStage.QUALIFIED, pain: 'Candidate screening backlog', value: 40000 },
    { firstName: 'Olivia', lastName: 'Bennett', companyName: 'Evergreen Realty', industry: 'Real Estate', companySize: '11-25', jobTitle: 'Managing Broker', phone: '+15551000019', status: LeadStatus.NEW, stage: PipelineStage.NEW_LEAD, pain: 'Lead response time', value: 11000 },
    { firstName: 'Kevin', lastName: 'Park', companyName: 'Datum Analytics', industry: 'Software', companySize: '25-50', jobTitle: 'Head of Customer Success', phone: '+15551000020', status: LeadStatus.CONVERTED, stage: PipelineStage.WON, pain: 'CS onboarding workflows', value: 52000 },
    { firstName: 'Mia', lastName: 'Foster', companyName: 'Harbor Dental Group', industry: 'Healthcare', companySize: '25-50', jobTitle: 'Regional Manager', phone: '+15551000021', status: LeadStatus.READY_TO_CALL, stage: PipelineStage.NEW_LEAD, pain: 'Appointment no-show follow-up', value: 19000 },
    { firstName: 'Daniel', lastName: 'Ruiz', companyName: 'Atlas Manufacturing', industry: 'Manufacturing', companySize: '101-250', jobTitle: 'Plant Manager', phone: '+15551000022', status: LeadStatus.CONTACTED, stage: PipelineStage.DISCOVERY, pain: 'Work order status chasing', value: 44000 },
  ];

  const leads = [];
  for (let i = 0; i < leadDefs.length; i++) {
    const d = leadDefs[i];
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: d.firstName,
        lastName: d.lastName,
        email: `${d.firstName.toLowerCase()}.${d.lastName.toLowerCase()}@example.com`,
        phone: d.phone,
        companyName: d.companyName,
        jobTitle: d.jobTitle,
        companySize: d.companySize,
        industry: d.industry,
        website: `https://www.${d.companyName.toLowerCase().replace(/\s+/g, '')}.example`,
        country: 'United States',
        timezone: 'America/New_York',
        source: i % 3 === 0 ? 'Website form' : i % 3 === 1 ? 'LinkedIn' : 'Referral',
        status: d.status,
        pipelineStage: d.stage,
        estimatedDealValue: d.value,
        knownPainPoint: d.pain,
        notes: `Prospect interested in automation around: ${d.pain}`,
        doNotCall: d.status === LeadStatus.DO_NOT_CALL,
        lastContactedAt: d.status === LeadStatus.NEW || d.status === LeadStatus.READY_TO_CALL ? null : new Date(Date.now() - (i + 1) * 86400000),
        nextFollowUpAt: d.status === LeadStatus.CALLBACK_REQUESTED ? new Date(Date.now() + 2 * 86400000) : null,
      },
    });
    leads.push(lead);

    await prisma.campaignLead.create({
      data: {
        campaignId: i % 2 === 0 ? campaign1.id : campaign2.id,
        leadId: lead.id,
        status: 'CALLED',
        attemptCount: d.status === LeadStatus.NEW || d.status === LeadStatus.READY_TO_CALL ? 0 : 1 + (i % 3),
        lastAttemptAt: d.status === LeadStatus.NEW || d.status === LeadStatus.READY_TO_CALL ? null : new Date(Date.now() - (i + 1) * 86400000),
      },
    });
  }

  const callScenarios: Array<{
    leadIdx: number;
    outcome: CallOutcome;
    status: CallStatus;
    score: number;
    qualified: boolean;
    sentiment: Sentiment;
    strategy: SalesStrategy;
    duration: number;
    objections?: Array<{ category: ObjectionCategory; statement: string; resolved: boolean; severity: ObjectionSeverity }>;
    competitors?: Array<{ name: string; context: string; sentiment: CompetitorSentiment }>;
    budget: BudgetLevel;
    authority: AuthorityLevel;
    need: NeedLevel;
    timeline: TimelineLevel;
    meeting?: boolean;
  }> = [
    { leadIdx: 0, outcome: CallOutcome.MEETING_BOOKED, status: CallStatus.COMPLETED, score: 88, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.CONSULTATIVE, duration: 742, objections: [{ category: ObjectionCategory.TIMING, statement: 'We are mid-quarter already.', resolved: true, severity: ObjectionSeverity.MEDIUM }], competitors: [{ name: 'Zapier', context: 'Using Zapier for simple syncs', sentiment: CompetitorSentiment.NEUTRAL }], budget: BudgetLevel.HIGH, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.HIGH, timeline: TimelineLevel.WITHIN_30_DAYS, meeting: true },
    { leadIdx: 1, outcome: CallOutcome.QUALIFIED_NO_MEETING, status: CallStatus.COMPLETED, score: 76, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.ROI, duration: 610, objections: [{ category: ObjectionCategory.BUDGET, statement: 'Need CFO approval for anything over 5k.', resolved: false, severity: ObjectionSeverity.HIGH }], budget: BudgetLevel.MEDIUM, authority: AuthorityLevel.EVALUATOR, need: NeedLevel.HIGH, timeline: TimelineLevel.WITHIN_90_DAYS },
    { leadIdx: 2, outcome: CallOutcome.CALLBACK_REQUESTED, status: CallStatus.COMPLETED, score: 54, qualified: false, sentiment: Sentiment.NEUTRAL, strategy: SalesStrategy.DISCOVERY, duration: 180, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.INFLUENCER, need: NeedLevel.MEDIUM, timeline: TimelineLevel.UNKNOWN },
    { leadIdx: 3, outcome: CallOutcome.FOLLOW_UP_REQUIRED, status: CallStatus.COMPLETED, score: 61, qualified: false, sentiment: Sentiment.MIXED, strategy: SalesStrategy.EDUCATIONAL, duration: 420, objections: [{ category: ObjectionCategory.SECURITY, statement: 'Need to know where data is stored.', resolved: true, severity: ObjectionSeverity.MEDIUM }], budget: BudgetLevel.MEDIUM, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.MEDIUM, timeline: TimelineLevel.OVER_90_DAYS },
    { leadIdx: 4, outcome: CallOutcome.NOT_QUALIFIED, status: CallStatus.COMPLETED, score: 22, qualified: false, sentiment: Sentiment.NEUTRAL, strategy: SalesStrategy.DISCOVERY, duration: 310, budget: BudgetLevel.LOW, authority: AuthorityLevel.INFLUENCER, need: NeedLevel.LOW, timeline: TimelineLevel.NO_TIMELINE },
    { leadIdx: 7, outcome: CallOutcome.NO_ANSWER, status: CallStatus.NO_ANSWER, score: 0, qualified: false, sentiment: Sentiment.UNKNOWN, strategy: SalesStrategy.DISCOVERY, duration: 0, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.UNKNOWN, need: NeedLevel.UNKNOWN, timeline: TimelineLevel.UNKNOWN },
    { leadIdx: 6, outcome: CallOutcome.MEETING_BOOKED, status: CallStatus.COMPLETED, score: 91, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.FAST_CLOSE, duration: 800, objections: [{ category: ObjectionCategory.PRICE, statement: 'Is this cheaper than hiring another agent?', resolved: true, severity: ObjectionSeverity.MEDIUM }], competitors: [{ name: 'Intercom', context: 'Evaluating Intercom Fin', sentiment: CompetitorSentiment.NEGATIVE }], budget: BudgetLevel.CONFIRMED, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.URGENT, timeline: TimelineLevel.IMMEDIATE, meeting: true },
    { leadIdx: 8, outcome: CallOutcome.VOICEMAIL, status: CallStatus.VOICEMAIL, score: 0, qualified: false, sentiment: Sentiment.UNKNOWN, strategy: SalesStrategy.DISCOVERY, duration: 45, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.UNKNOWN, need: NeedLevel.UNKNOWN, timeline: TimelineLevel.UNKNOWN },
    { leadIdx: 9, outcome: CallOutcome.QUALIFIED_NO_MEETING, status: CallStatus.COMPLETED, score: 82, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.COMPETITOR_REPLACEMENT, duration: 690, competitors: [{ name: 'Salesforce Einstein', context: 'Current CRM AI add-on feels limited', sentiment: CompetitorSentiment.NEGATIVE }], budget: BudgetLevel.HIGH, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.HIGH, timeline: TimelineLevel.WITHIN_30_DAYS },
    { leadIdx: 10, outcome: CallOutcome.DO_NOT_CALL, status: CallStatus.COMPLETED, score: 10, qualified: false, sentiment: Sentiment.NEGATIVE, strategy: SalesStrategy.DISCOVERY, duration: 95, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.UNKNOWN, need: NeedLevel.LOW, timeline: TimelineLevel.NO_TIMELINE },
    { leadIdx: 11, outcome: CallOutcome.BUSY, status: CallStatus.BUSY, score: 0, qualified: false, sentiment: Sentiment.UNKNOWN, strategy: SalesStrategy.DISCOVERY, duration: 0, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.UNKNOWN, need: NeedLevel.UNKNOWN, timeline: TimelineLevel.UNKNOWN },
    { leadIdx: 14, outcome: CallOutcome.MEETING_BOOKED, status: CallStatus.COMPLETED, score: 94, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.URGENCY, duration: 880, objections: [{ category: ObjectionCategory.IMPLEMENTATION_COMPLEXITY, statement: 'Worried about disrupting claims ops.', resolved: true, severity: ObjectionSeverity.HIGH }], budget: BudgetLevel.CONFIRMED, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.URGENT, timeline: TimelineLevel.IMMEDIATE, meeting: true },
    { leadIdx: 15, outcome: CallOutcome.NOT_INTERESTED, status: CallStatus.COMPLETED, score: 28, qualified: false, sentiment: Sentiment.NEGATIVE, strategy: SalesStrategy.CONSULTATIVE, duration: 240, objections: [{ category: ObjectionCategory.NOT_INTERESTED, statement: 'We already rebuilt internal tools.', resolved: false, severity: ObjectionSeverity.HIGH }], budget: BudgetLevel.MEDIUM, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.LOW, timeline: TimelineLevel.NO_TIMELINE },
    { leadIdx: 17, outcome: CallOutcome.TRANSFERRED_TO_HUMAN, status: CallStatus.COMPLETED, score: 85, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.CONSULTATIVE, duration: 520, budget: BudgetLevel.HIGH, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.HIGH, timeline: TimelineLevel.WITHIN_30_DAYS },
    { leadIdx: 19, outcome: CallOutcome.MEETING_BOOKED, status: CallStatus.COMPLETED, score: 90, qualified: true, sentiment: Sentiment.POSITIVE, strategy: SalesStrategy.ROI, duration: 760, budget: BudgetLevel.CONFIRMED, authority: AuthorityLevel.DECISION_MAKER, need: NeedLevel.HIGH, timeline: TimelineLevel.WITHIN_30_DAYS, meeting: true },
    { leadIdx: 21, outcome: CallOutcome.FAILED, status: CallStatus.FAILED, score: 0, qualified: false, sentiment: Sentiment.UNKNOWN, strategy: SalesStrategy.DISCOVERY, duration: 0, budget: BudgetLevel.UNKNOWN, authority: AuthorityLevel.UNKNOWN, need: NeedLevel.UNKNOWN, timeline: TimelineLevel.UNKNOWN },
  ];

  for (let i = 0; i < callScenarios.length; i++) {
    const s = callScenarios[i];
    const lead = leads[s.leadIdx];
    const started = new Date(Date.now() - (i + 2) * 86400000 - 3600000);
    const ended = new Date(started.getTime() + s.duration * 1000);
    const campaignId = s.leadIdx % 2 === 0 ? campaign1.id : campaign2.id;

    const call = await prisma.call.create({
      data: {
        organizationId: org.id,
        leadId: lead.id,
        campaignId,
        retellCallId: `retell_seed_${i + 1}`,
        direction: 'OUTBOUND',
        status: s.status,
        startedAt: s.duration > 0 || s.status !== CallStatus.FAILED ? started : null,
        endedAt: s.status !== CallStatus.QUEUED ? ended : null,
        durationSeconds: s.duration,
        disconnectionReason: s.outcome === CallOutcome.NO_ANSWER ? 'dial_no_answer' : s.outcome === CallOutcome.BUSY ? 'dial_busy' : 'agent_hangup',
        recordingUrl: s.duration > 60 ? `https://recordings.example.com/seed/${i + 1}.mp3` : null,
        transcript:
          s.duration > 60
            ? `Agent: Hi ${lead.firstName}, this is Ava from AutomateFlow.\nUser: Hi, yes this is ${lead.firstName}.\nAgent: I understand ${lead.knownPainPoint} has been a challenge. Could you share how your team handles that today?\nUser: We mostly do it manually in spreadsheets.\nAgent: Thanks — that helps. Would a short discovery demo next week be useful?`
            : null,
        transcriptObject:
          s.duration > 60
            ? [
                { role: 'agent', content: `Hi ${lead.firstName}, this is Ava from AutomateFlow.` },
                { role: 'user', content: `Hi, yes this is ${lead.firstName}.` },
                { role: 'agent', content: `I understand ${lead.knownPainPoint} has been a challenge.` },
              ]
            : undefined,
        callSummary: s.score > 0 ? `${lead.firstName} discussed ${lead.knownPainPoint}. Outcome: ${s.outcome}.` : null,
        sentiment: s.sentiment,
        callOutcome: s.outcome,
        qualified: s.qualified,
        leadScore: s.score || null,
        closeProbability: s.score > 0 ? Math.max(5, s.score - 8) : null,
        buyingIntentScore: s.score > 0 ? Math.max(0, s.score - 5) : null,
        salesStrategyUsed: s.strategy,
        recommendedNextAction:
          s.meeting
            ? 'Prepare demo agenda and confirm attendees.'
            : s.outcome === CallOutcome.CALLBACK_REQUESTED
              ? 'Call back at the requested time.'
              : s.qualified
                ? 'Send ROI one-pager and propose meeting times.'
                : 'Close loop or nurture sequence.',
        isSimulated: true,
        metadata: { seed: true },
      },
    });

    if (s.score > 0) {
      await prisma.qualification.create({
        data: {
          callId: call.id,
          budgetLevel: s.budget,
          budgetDetails: `Budget signal: ${s.budget}`,
          authorityLevel: s.authority,
          authorityDetails: `Authority signal: ${s.authority}`,
          needLevel: s.need,
          needDetails: lead.knownPainPoint,
          timelineLevel: s.timeline,
          timelineDetails: `Timeline: ${s.timeline}`,
          painPoints: [lead.knownPainPoint],
          businessGoals: ['Reduce manual work', 'Improve response time'],
          currentProcess: 'Mostly manual / spreadsheet-driven',
          decisionProcess: 'Internal evaluation then leadership sign-off',
          successCriteria: 'Measurable time savings within 60 days',
        },
      });
    }

    if (s.objections) {
      for (const o of s.objections) {
        await prisma.objection.create({
          data: {
            callId: call.id,
            category: o.category,
            statement: o.statement,
            severity: o.severity,
            resolved: o.resolved,
            responseUsed: o.resolved ? 'Acknowledged concern and shared relevant policy from KB.' : null,
            resolutionNotes: o.resolved ? 'Prospect accepted explanation.' : 'Needs follow-up.',
            timestampSeconds: 120,
          },
        });
      }
    }

    if (s.competitors) {
      for (const c of s.competitors) {
        await prisma.competitorMention.create({
          data: {
            callId: call.id,
            competitorName: c.name,
            context: c.context,
            sentiment: c.sentiment,
            timestampSeconds: 200,
          },
        });
      }
    }

    if (s.meeting) {
      const start = new Date(Date.now() + (i + 3) * 86400000);
      start.setUTCHours(15, 0, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      await prisma.appointment.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          callId: call.id,
          title: `AutomateFlow discovery — ${lead.companyName}`,
          startTime: start,
          endTime: end,
          timezone: 'America/New_York',
          status: AppointmentStatus.SCHEDULED,
          meetingType: MeetingType.DEMO,
          meetingUrl: `https://meet.closerai.demo/${call.id}`,
          notes: 'Booked by Ava during outbound call',
        },
      });
    }

    if (s.outcome === CallOutcome.CALLBACK_REQUESTED) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          callId: call.id,
          type: 'CALLBACK',
          scheduledFor: new Date(Date.now() + 2 * 86400000),
          status: 'PENDING',
          notes: 'Prospect asked to call back later this week.',
        },
      });
    }

    if (s.outcome === CallOutcome.TRANSFERRED_TO_HUMAN) {
      await prisma.humanHandoff.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          callId: call.id,
          reason: 'High purchase intent — requested specialist',
          urgency: 'HIGH',
          summary: 'Prospect ready to discuss contract terms.',
          transferNumber: '+15555550199',
          salesRepName: salesRep.name,
          transferType: TransferType.WARM,
        },
      });
    }
  }

  // Past completed appointment for converted lead
  await prisma.appointment.create({
    data: {
      organizationId: org.id,
      leadId: leads[19].id,
      title: 'AutomateFlow kickoff — Datum Analytics',
      startTime: new Date(Date.now() - 5 * 86400000),
      endTime: new Date(Date.now() - 5 * 86400000 + 1800000),
      timezone: 'America/New_York',
      status: AppointmentStatus.COMPLETED,
      meetingType: MeetingType.DEMO,
      meetingUrl: 'https://meet.closerai.demo/past-datum',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      action: 'SEED_COMPLETED',
      entityType: 'Organization',
      entityId: org.id,
      metadata: { leads: leads.length, campaigns: 2 },
    },
  });

  console.log('Seed complete.');
  console.log('Demo credentials:');
  console.log('  Admin: admin@closerai.demo / DemoPass123!');
  console.log('  Rep:   rep@closerai.demo / DemoPass123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
