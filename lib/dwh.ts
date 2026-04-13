import { PrismaClient } from "./generated/dwh-client";

const globalForDwh = globalThis as unknown as { dwh: PrismaClient };

export const dwh =
  globalForDwh.dwh ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForDwh.dwh = dwh;
