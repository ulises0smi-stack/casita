import type { Request, Response } from "express";
import * as categoriesService from "./categories.service.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "@casita/shared";
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
  const categories = await categoriesService.listCategories(getHouseholdId(req.params), authReq.userId!);
  res.json(categories);
}

export async function get(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const category = await categoriesService.getCategory(
    getHouseholdId(req.params),
    getId(req.params),
    authReq.userId!
  );
  res.json(category);
}

export async function create(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const category = await categoriesService.createCategory(
    getHouseholdId(req.params),
    authReq.userId!,
    req.body as CreateCategoryInput
  );
  res.status(201).json(category);
}

export async function update(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  const category = await categoriesService.updateCategory(
    getHouseholdId(req.params),
    getId(req.params),
    authReq.userId!,
    req.body as UpdateCategoryInput
  );
  res.json(category);
}

export async function remove(req: Request, res: Response) {
  const authReq = req as AuthenticatedRequest;
  await categoriesService.deleteCategory(getHouseholdId(req.params), getId(req.params), authReq.userId!);
  res.json({ success: true });
}