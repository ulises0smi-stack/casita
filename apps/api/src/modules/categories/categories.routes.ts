import { Router } from "express";
import * as categoriesController from "./categories.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHouseholdMember } from "../../middleware/household.middleware.js";
import { createCategorySchema, updateCategorySchema } from "@casita/shared";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireHouseholdMember);

router.get("/", categoriesController.list);
router.get("/:id", categoriesController.get);
router.post("/", validate(createCategorySchema), categoriesController.create);
router.put("/:id", validate(updateCategorySchema), categoriesController.update);
router.delete("/:id", categoriesController.remove);

export const categoriesRouter = router;