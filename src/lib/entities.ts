// Validation for everything the admin screen can add or edit.
import { z } from "zod";
import type { EntityKind } from "./types";

const name = z.string().trim().min(1, "Required").max(120);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, e.g. 07:50");
const id = z.string().min(1);
const sort = z.number().int().min(0).max(100000);
// stored lower-case so sign-in matching ignores capitals; "" counts as no email
const cleanEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() || null : v);
const email = z.preprocess(cleanEmail, z.email("Not a valid email").max(200));
const optionalEmail = z.preprocess(cleanEmail, z.email("Not a valid email").max(200).nullable());

export const entitySchemas = {
  groups: z.object({ id: id.optional(), name, sort }),
  rooms: z.object({ id: id.optional(), code: name, active: z.boolean(), sort }),
  sections: z.object({
    id: id.optional(),
    name,
    groupId: id.nullable(),
    roomId: id.nullable(),
    active: z.boolean(),
    sort,
  }),
  rounds: z.object({
    id: id.optional(),
    name,
    startTime: hhmm,
    countsKind: z.enum(["none", "attendance", "non_attempting"]),
    sort,
  }),
  checks: z.object({
    id: id.optional(),
    roundId: id,
    audience: z.enum(["invigilator", "floor_incharge", "both"]),
    instruction: z.string().trim().max(500),
    question: name.max(300),
    minSeconds: z.number().int().min(0).max(300),
    active: z.boolean(),
    sort,
  }),
  staff: z.object({
    id: id.optional(),
    name,
    email: optionalEmail,
    role: z.enum(["teacher", "floor_incharge"]),
    active: z.boolean(),
  }),
  admins: z.object({
    id: id.optional(),
    name: z.string().trim().max(120),
    email,
    role: z.enum(["owner", "admin", "coordinator"]),
  }),
} satisfies Record<EntityKind, z.ZodType>;

export type EntityInput<K extends EntityKind> = z.infer<(typeof entitySchemas)[K]>;

export const schoolSchema = z.object({
  name: name,
  timezone: z.string().min(1).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone"),
  endTime: hhmm,
  bufferMinutes: z.number().int().min(0).max(240),
  testWeekdays: z.array(z.number().int().min(1).max(7)).max(7),
  qrRotateDays: z.number().int().min(0).max(365),
});

export function newToken() {
  return crypto.randomUUID().replaceAll("-", "");
}
