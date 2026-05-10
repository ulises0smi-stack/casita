import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3).default("EUR"),
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
});

export const updateExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(500).optional().nullable(),
  date: z.string().datetime().optional(),
});

export const expenseQuerySchema = z.object({
  categoryId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseQueryInput = z.infer<typeof expenseQuerySchema>;