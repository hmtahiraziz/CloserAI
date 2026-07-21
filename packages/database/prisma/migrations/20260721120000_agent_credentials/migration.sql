-- AlterTable
ALTER TABLE "AgentConfiguration" ADD COLUMN "retellAgentId" TEXT;
ALTER TABLE "AgentConfiguration" ADD COLUMN "retellPhoneNumber" TEXT;
ALTER TABLE "AgentConfiguration" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "agentConfigurationId" TEXT;

-- CreateIndex
CREATE INDEX "AgentConfiguration_isDefault_idx" ON "AgentConfiguration"("isDefault");

-- CreateIndex
CREATE INDEX "Campaign_agentConfigurationId_idx" ON "Campaign"("agentConfigurationId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_agentConfigurationId_fkey" FOREIGN KEY ("agentConfigurationId") REFERENCES "AgentConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
