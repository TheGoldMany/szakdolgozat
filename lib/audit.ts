import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

interface LogAuditInput {
  actorId:     string;
  action:      AuditAction;
  targetType:  string;
  targetId:    string;
  targetName?: string | null;
  reason?:     string | null;
}

/**
 * Adminisztrátori művelet naplózása.
 *
 * Szándékosan "tűzz és felejtsd el": a naplózás hibája soha nem buktathatja
 * meg magát a műveletet, ezért a hívó nem várja meg és a hibát elnyeljük.
 */
export function logAudit(input: LogAuditInput): void {
  prisma.auditLog
    .create({
      data: {
        actorId:    input.actorId,
        action:     input.action,
        targetType: input.targetType,
        targetId:   input.targetId,
        targetName: input.targetName ?? null,
        reason:     input.reason ?? null,
      },
    })
    .catch((err) => console.error("[audit]", input.action, err));
}
