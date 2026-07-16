import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@closerai/database';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    organizationId: string,
    userId: string | null,
    action: string,
    entityType: string,
    entityId?: string | null,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: userId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async list(organizationId: string, page = 1, pageSize = 50) {
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.auditLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);
    return { items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }
}
