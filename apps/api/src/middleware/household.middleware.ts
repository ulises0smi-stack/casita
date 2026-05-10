import type { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";

export async function requireHouseholdMember(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { householdId } = req.params;
  const userId = req.userId!;

  if (!householdId) {
    throw new NotFoundError("Household not found");
  }

  const member = await prisma.member.findFirst({
    where: {
      householdId,
      userId,
      deletedAt: null,
    },
  });

  if (!member) {
    throw new ForbiddenError("You are not a member of this household");
  }

  req.memberRole = member.role;
  next();
}

declare module "express" {
  export interface Request {
    memberRole?: "admin" | "member";
  }
}