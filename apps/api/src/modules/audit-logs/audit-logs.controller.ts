import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@closerai/shared';
import { AuditLogsService } from './audit-logs.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { Roles } from '../../common/guards/auth.guard';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly audit: AuditLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(
    @CurrentUser() user: SessionUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list(user.organizationId, Number(page) || 1, Number(pageSize) || 50);
  }
}
