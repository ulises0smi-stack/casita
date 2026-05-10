import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  type: z.enum(["income", "expense"]).default("expense"),
  order: z.number().int().min(0).default(0),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  type: z.enum(["income", "expense"]).optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;