import type { Request, Response } from "express";
import * as expensesService from "./expenses.service.js";
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseQueryInput } from "@casita/shared";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

function getHouseholdId(params: Record<string, string | undefined>): string {
  const id = params.householdId;
  if (!id) throw new Error("householdId is required");
  return id;
}

function getId(params: Record<string, string | undefined>): string {
  const id = params.id;
  if (!id) throw new Error("id is required");
  return id;
}

export async function list(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const { householdId } = req.params;
  const query = req.query as unknown as ExpenseQueryInput;
  
  const result = await expensesService.listExpenses(
    getHouseholdId(req.params),
    authReq.userId!,
    {
      categoryId: query.categoryId,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    }
  );
  res.json(result);
}

export async function get(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const expense = await expensesService.getExpense(
    getHouseholdId(req.params),
    getId(req.params),
    authReq.userId!
  );
  res.json(expense);
}

export async function create(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const expense = await expensesService.createExpense(
    getHouseholdId(req.params),
    authReq.userId!,
    req.body as CreateExpenseInput
  );
  res.status(201).json(expense);
}

export async function update(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const expense = await expensesService.updateExpense(
    getHouseholdId(req.params),
    getId(req.params),
    authReq.userId!,
    req.body as UpdateExpenseInput
  );
  res.json(expense);
}

export async function remove(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  await expensesService.deleteExpense(
    getHouseholdId(req.params),
    getId(req.params),
    authReq.userId!
  );
  res.json({ success: true });
}