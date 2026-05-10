import { Router } from "express";
import { z } from "zod";
import * as authController from "./auth.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from "@casita/shared";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", validate(logoutSchema), authController.logout);

router.use(requireAuth);
router.get("/me", authController.me);
router.get("/sessions", authController.getSessions);
router.delete("/sessions/:sessionId", authController.revokeSession);

export const authRouter = router;