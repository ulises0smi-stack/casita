import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../lib/errors.js";
import type { CreateExpenseInput, UpdateExpenseInput } from "@casita/shared";

function toExpenseDTO(expense: {
  id: string;
  householdId: string;
  categoryId: string;
  addedBy: string;
  amount: Prisma.Decimal;
  currency: string;
  description: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
  category: { id: string; name: string; icon: string | null; color: string | null };
  addedByUser: { id: string; email: string; firstName: string | null; lastName: string | null };
}) {
  return {
    id: expense.id,
    householdId: expense.householdId,
    categoryId: expense.categoryId,
    category: {
      id: expense.category.id,
      name: expense.category.name,
      icon: expense.category.icon,
      color: expense.category.color,
    },
    addedBy: expense.addedBy,
    addedByUser: {
      id: expense.addedByUser.id,
      email: expense.addedByUser.email,
      firstName: expense.addedByUser.firstName,
      lastName: expense.addedByUser.lastName,
    },
    amount: expense.amount.toString(),
    currency: expense.currency,
    description: expense.description,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    version: expense.version,
    deletedAt: expense.deletedAt?.toISOString() ?? null,
  };
}

export async function listExpenses(
  householdId: string,
  userId: string,
  filters: {
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const where: Prisma.ExpenseWhereInput = {
    householdId,
    deletedAt: null,
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.startDate || filters.endDate
      ? {
          date: {
            ...(filters.startDate && { gte: new Date(filters.startDate) }),
            ...(filters.endDate && { lte: new Date(filters.endDate) }),
          },
        }
      : {}),
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        addedByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data: expenses.map(toExpenseDTO),
    total,
    limit: filters.limit ?? 50,
    offset: filters.offset ?? 0,
  };
}

export async function getExpense(householdId: string, expenseId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, householdId, deletedAt: null },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      addedByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  if (!expense) {
    throw new NotFoundError("Expense not found");
  }

  return toExpenseDTO(expense);
}

export async function createExpense(
  householdId: string,
  userId: string,
  input: CreateExpenseInput
) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const category = await prisma.category.findFirst({
    where: { id: input.categoryId, householdId, deletedAt: null },
  });
  if (!category) {
    throw new ValidationError("Category not found in this household");
  }

  const expense = await prisma.expense.create({
    data: {
      householdId,
      categoryId: input.categoryId,
      addedBy: userId,
      amount: new Prisma.Decimal(input.amount),
      currency: input.currency,
      description: input.description,
      date: new Date(input.date),
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      addedByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return toExpenseDTO(expense);
}

export async function updateExpense(
  householdId: string,
  expenseId: string,
  userId: string,
  input: UpdateExpenseInput
) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, householdId, deletedAt: null },
  });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, householdId, deletedAt: null },
    });
    if (!category) {
      throw new ValidationError("Category not found in this household");
    }
  }

  const updated = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.currency && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.date && { date: new Date(input.date) }),
      version: { increment: 1 },
    },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      addedByUser: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });

  return toExpenseDTO(updated);
}

export async function deleteExpense(householdId: string, expenseId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, householdId, deletedAt: null },
  });
  if (!expense) {
    throw new NotFoundError("Expense not found");
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { deletedAt: new Date(), version: { increment: 1 } },
  });

  return { success: true };
}