import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

interface LogAuditInput {
  /** Null: automatikus futás (pl. ütemezett ETL), nincs bejelentkezett admin. */
  actorId:     string | null;
  action:      AuditAction;
  targetType:  string;
  targetId:    string;
  targetName?: string | null;
  reason?:     string | null;
}

/**
 * Adminisztrátori művelet naplózása.
 *
 * A naplózás hibája soha nem buktathatja meg magát a műveletet, ezért a hívó
 * nem várja meg, és a hibát elnyeljük.
 *
 * MIÉRT `after()`: korábban egy sima, el nem várt ígéret írta a sort. A Vercel
 * szerverless függvénye a válasz elküldése után leállhat, és ilyenkor a még
 * futó adatbázis-írás elveszett: a napló csak néha kapta meg a bejegyzést.
 * Az `after()` a platformnak jelzi, hogy a válasz után is van még dolga.
 * Kérésen kívül (teszt, szkript) nem hívható, ott a sima ígéret marad.
 */
export function logAudit(input: LogAuditInput): void {
  const write = () => writeAudit(input);
  try {
    after(write);
  } catch {
    void write();
  }
}

function writeAudit(input: LogAuditInput): Promise<unknown> {
  return prisma.auditLog
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
