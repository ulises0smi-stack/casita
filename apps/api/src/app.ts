import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { healthRouter } from "./modules/health/health.routes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/health", healthRouter);

app.use(errorMiddleware);
