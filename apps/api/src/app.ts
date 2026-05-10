import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/households/:householdId/expenses", expensesRouter);
app.use("/api/households/:householdId/categories", categoriesRouter);

app.use(errorMiddleware);
