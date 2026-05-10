import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../lib/errors.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "@casita/shared";

function toCategoryDTO(category: {
  id: string;
  householdId: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: "income" | "expense";
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}) {
  return {
    id: category.id,
    householdId: category.householdId,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    order: category.order,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    version: category.version,
    deletedAt: category.deletedAt?.toISOString() ?? null,
  };
}

export async function listCategories(householdId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const categories = await prisma.category.findMany({
    where: { householdId, deletedAt: null },
    orderBy: [{ type: "asc" }, { order: "asc" }],
  });

  return categories.map(toCategoryDTO);
}

export async function getCategory(householdId: string, categoryId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, deletedAt: null },
  });

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return toCategoryDTO(category);
}

export async function createCategory(
  householdId: string,
  userId: string,
  input: CreateCategoryInput
) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const existing = await prisma.category.findFirst({
    where: { householdId, name: input.name, deletedAt: null },
  });
  if (existing) {
    throw new ConflictError("Category with this name already exists");
  }

  const category = await prisma.category.create({
    data: {
      householdId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      type: input.type,
      order: input.order,
    },
  });

  return toCategoryDTO(category);
}

export async function updateCategory(
  householdId: string,
  categoryId: string,
  userId: string,
  input: UpdateCategoryInput
) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, deletedAt: null },
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  if (input.name && input.name !== category.name) {
    const existing = await prisma.category.findFirst({
      where: { householdId, name: input.name, deletedAt: null, id: { not: categoryId } },
    });
    if (existing) {
      throw new ConflictError("Category with this name already exists");
    }
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.order !== undefined && { order: input.order }),
      version: { increment: 1 },
    },
  });

  return toCategoryDTO(updated);
}

export async function deleteCategory(householdId: string, categoryId: string, userId: string) {
  const member = await prisma.member.findFirst({
    where: { householdId, userId, deletedAt: null },
  });
  if (!member) {
    throw new ForbiddenError("Not a member of this household");
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, householdId, deletedAt: null },
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }

  const expenseCount = await prisma.expense.count({
    where: { categoryId, deletedAt: null },
  });
  if (expenseCount > 0) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
  } else {
    await prisma.category.delete({ where: { id: categoryId } });
  }

  return { success: true };
}