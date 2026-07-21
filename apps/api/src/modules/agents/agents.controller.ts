import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createAgentSchema, updateAgentSchema } from '@closerai/shared';
import { AgentsService } from './agents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agents: AgentsService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.agents.list(user.organizationId);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.agents.get(user.organizationId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createAgentSchema)) body: Parameters<AgentsService['create']>[1],
  ) {
    const agent = await this.agents.create(user.organizationId, body);
    await this.audit.log(user.organizationId, user.id, 'AGENT_CREATED', 'AgentConfiguration', agent.id);
    return agent;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: Parameters<AgentsService['update']>[2],
  ) {
    const agent = await this.agents.update(user.organizationId, id, body);
    await this.audit.log(user.organizationId, user.id, 'AGENT_UPDATED', 'AgentConfiguration', id);
    return agent;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    const result = await this.agents.remove(user.organizationId, id);
    await this.audit.log(user.organizationId, user.id, 'AGENT_DELETED', 'AgentConfiguration', id);
    return result;
  }
}
