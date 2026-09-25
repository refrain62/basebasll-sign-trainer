import { z } from "zod";

const nfcTrim = (value: string) => value.trim().normalize("NFC");

export const teamIdSchema = z.string().transform(nfcTrim).refine(
  (value) => /^[A-Za-z0-9_-]{4,40}$/.test(value),
  { message: "invalid team id" }
);

export const secretSchema = z.string().transform(nfcTrim).refine((value) => value.length <= 200, {
  message: "secret too long"
});

export const optionalTextSchema = (max: number) => z.string().transform((value) => nfcTrim(value).slice(0, max));
export const optionalBooleanSchema = z.boolean();
export const numericInputSchema = z.union([z.number(), z.string()]);
export const nullableNumericInputSchema = z.union([z.number(), z.string(), z.null()]);

export const playerAuthBodySchema = z.object({
  teamId: teamIdSchema,
  passphrase: secretSchema
}).strip();

export const teamAdminAuthBodySchema = z.object({
  teamId: teamIdSchema,
  password: secretSchema
}).strip();

export const teamAdminUpdateTeamBodySchema = z.object({
  teamId: teamIdSchema.optional(),
  name: z.string().optional(),
  passphrase: z.string().optional(),
  adminPassword: z.string().optional()
}).strip();

export const groupCreateBodySchema = z.object({
  teamId: teamIdSchema,
  name: z.string(),
  description: z.string().optional().default(""),
  youtubeUrl: z.string().optional().default("")
}).strip();

export const groupUpdateBodySchema = z.object({
  teamId: teamIdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  youtubeUrl: z.string().optional(),
  sortOrder: numericInputSchema.optional(),
  enabled: z.boolean().optional()
}).strip();

export const signCreateBodySchema = z.object({
  teamId: teamIdSchema,
  name: z.string(),
  groupId: nullableNumericInputSchema.optional(),
  youtubeUrl: z.string().optional().default(""),
  videoComment: z.string().optional().default("")
}).strip();

export const signUpdateBodySchema = z.object({
  teamId: teamIdSchema,
  name: z.string().optional(),
  groupId: nullableNumericInputSchema.optional(),
  sortOrder: numericInputSchema.optional(),
  enabled: z.boolean().optional()
}).strip();

export const videoCreateBodySchema = z.object({
  teamId: teamIdSchema,
  youtubeUrl: z.string(),
  comment: z.string().optional().default("")
}).strip();

export const videoUpdateBodySchema = z.object({
  teamId: teamIdSchema,
  youtubeUrl: z.string().optional(),
  comment: z.string().optional(),
  sortOrder: numericInputSchema.optional(),
  enabled: z.boolean().optional()
}).strip();

export const adminInviteBodySchema = z.object({
  teamId: teamIdSchema,
  kind: z.enum(["admin", "transfer"]).optional().default("admin"),
  creatorExit: z.boolean().optional().default(false),
  currentOwnerExit: z.boolean().optional(),
  expiresHours: numericInputSchema.optional()
}).strip().transform((value) => ({
  ...value,
  creatorExit: value.currentOwnerExit ?? value.creatorExit
}));

export const ownerTransferBodySchema = z.object({
  teamId: teamIdSchema,
  nextOwnerUserId: z.string().min(1).max(100).transform((value) => value.trim()).refine((value) => value.length > 0),
  currentOwnerExit: z.boolean().optional().default(false)
}).strip();

export const teamIdOnlyBodySchema = z.object({ teamId: teamIdSchema }).strip();

export const accountCreateTeamBodySchema = z.object({
  name: z.string(),
  passphrase: z.string()
}).strip();

export const accountDeleteBodySchema = z.object({
  confirm: z.string()
}).strip();

export const systemAuthBodySchema = z.object({
  secret: z.string()
}).strip();

export const systemCreateTeamBodySchema = z.object({
  name: z.string(),
  passphrase: z.string(),
  adminPassword: z.string()
}).strip();

export const systemUpdateTeamBodySchema = z.object({
  name: z.string().optional(),
  passphrase: z.string().optional(),
  adminPassword: z.string().optional(),
  status: z.enum(["active", "suspended"]).optional()
}).strip();

export const dataProtectionBodySchema = z.object({
  batchSize: numericInputSchema.optional(),
  maxBatches: numericInputSchema.optional()
}).strip();

export const emptyObjectSchema = z.object({}).strip();

export type PlayerAuthBody = z.infer<typeof playerAuthBodySchema>;
export type TeamAdminAuthBody = z.infer<typeof teamAdminAuthBodySchema>;
export type AccountCreateTeamBody = z.infer<typeof accountCreateTeamBodySchema>;
