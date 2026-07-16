import { Body, Controller, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import {
  createLeadSchema,
  updateLeadSchema,
  leadFilterSchema,
  CreateLeadInput,
} from '@closerai/shared';
import { LeadsService } from './leads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly audit: AuditLogsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(leadFilterSchema)) query: Parameters<LeadsService['list']>[1],
  ) {
    return this.leadsService.list(user.organizationId, query);
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: SessionUser,
    @Query(new ZodValidationPipe(leadFilterSchema)) query: Parameters<LeadsService['list']>[1],
    @Res() res: Response,
  ) {
    const data = await this.leadsService.list(user.organizationId, {
      ...query,
      page: 1,
      pageSize: 1000,
    });
    const header = 'firstName,lastName,email,phone,companyName,status,pipelineStage,estimatedDealValue\n';
    const rows = data.items
      .map((l) =>
        [l.firstName, l.lastName, l.email, l.phone, l.companyName, l.status, l.pipelineStage, l.estimatedDealValue]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send(header + rows);
  }

  @Post('import')
  async import(
    @CurrentUser() user: SessionUser,
    @Body() body: { rows: CreateLeadInput[] },
  ) {
    const result = await this.leadsService.importCsv(user.organizationId, body.rows ?? []);
    await this.audit.log(user.organizationId, user.id, 'LEADS_IMPORTED', 'Lead', null, {
      count: result.created,
    });
    return result;
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.leadsService.get(user.organizationId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadInput,
  ) {
    const lead = await this.leadsService.create(user.organizationId, body);
    await this.audit.log(user.organizationId, user.id, 'LEAD_CREATED', 'Lead', lead.id);
    return lead;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: CreateLeadInput,
  ) {
    const lead = await this.leadsService.update(user.organizationId, id, body);
    await this.audit.log(user.organizationId, user.id, 'LEAD_UPDATED', 'Lead', id);
    return lead;
  }
}
