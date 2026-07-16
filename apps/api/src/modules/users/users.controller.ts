import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionUser } from '../auth/auth.service';
import { Roles } from '../../common/guards/auth.guard';
import { UserRole } from '@closerai/shared';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  list(@CurrentUser() user: SessionUser) {
    return this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
