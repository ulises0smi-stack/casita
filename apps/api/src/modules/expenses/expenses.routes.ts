import { Router } from "express";
import * as expensesController from "./expenses.controller.js";
import { validate, validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHouseholdMember } from "../../middleware/household.middleware.js";
import { createExpenseSchema, updateExpenseSchema, expenseQuerySchema } from "@casita/shared";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireHouseholdMember);

router.get("/", validateQuery(expenseQuerySchema), expensesController.list);
router.get("/:id", expensesController.get);
router.post("/", validate(createExpenseSchema), expensesController.create);
router.put("/:id", validate(updateExpenseSchema), expensesController.update);
router.delete("/:id", expensesController.remove);

export const expensesRouter = router;