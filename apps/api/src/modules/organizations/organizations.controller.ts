import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateOrganizationSchema, updateSettingsSchema, UserRole } from '@closerai/shared';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/guards/auth.guard';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get('me')
  me(@CurrentUser() user: SessionUser) {
    return this.orgs.get(user.organizationId);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: Parameters<OrganizationsService['update']>[1],
  ) {
    return this.orgs.update(user.organizationId, body);
  }

  @Patch('me/settings')
  @Roles(UserRole.ADMIN)
  updateSettings(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: Parameters<OrganizationsService['updateSettings']>[1],
  ) {
    return this.orgs.updateSettings(user.organizationId, body);
  }
}
