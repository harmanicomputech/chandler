import crypto from 'node:crypto';
import { z } from 'zod';
export const Itin = z.object({
  title: z.string().trim().min(1).max(120),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  interests: z.array(z.string().max(40)).max(12).default([]),
  days: z.array(z.object({ day: z.number().int().min(1).max(30), items: z.array(z.object({ kind: z.enum(['listing', 'event']), id: z.number().int().positive(), note: z.string().max(300).optional() })).max(40) })).max(30),
});
export type ItinT = z.infer<typeof Itin>;
export const hashToken = (t: string) => crypto.createHash('sha256').update(t).digest('hex');
