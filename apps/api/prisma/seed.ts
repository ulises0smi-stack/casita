import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

config();

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = process.env.DEFAULT_CATEGORIES
  ? process.env.DEFAULT_CATEGORIES.split(",")
  : ["Comida", "Transporte", "Servicios", "Ocio", "Otros"];

const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? "test@casita.local";
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";

async function main() {
  console.log("🌱 Starting seed...\n");

  const existingUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  if (existingUser) {
    console.log(`⚠️  User ${SEED_USER_EMAIL} already exists. Skipping seed.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`📧 Creating user: ${SEED_USER_EMAIL}`);
  const passwordHash = await hash(SEED_USER_PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      email: SEED_USER_EMAIL,
      passwordHash,
      firstName: "Test",
      lastName: "User",
    },
  });
  console.log(`✅ User created: ${user.id}`);

  console.log(`\n🏠 Creating household: Mi Casa`);
  const household = await prisma.household.create({
    data: {
      name: "Mi Casa",
      description: "Hogar de prueba",
      defaultCurrency: "EUR",
      createdBy: user.id,
    },
  });
  console.log(`✅ Household created: ${household.id}`);
  console.log(`   Invite code: ${household.inviteCode}`);

  console.log(`\n👤 Creating membership (admin)`);
  await prisma.member.create({
    data: {
      householdId: household.id,
      userId: user.id,
      role: "admin",
    },
  });
  console.log(`✅ Member created`);

  console.log(`\n📂 Creating categories (${DEFAULT_CATEGORIES.length})`);
  const categoryIcons: Record<string, string> = {
    Comida: "🍔",
    Transporte: "🚗",
    Servicios: "💡",
    Ocio: "🎮",
    Otros: "📦",
  };

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const name = DEFAULT_CATEGORIES[i].trim();
    const category = await prisma.category.create({
      data: {
        householdId: household.id,
        name,
        icon: categoryIcons[name] ?? "📌",
        color: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][i % 5],
        type: name === "Ingresos" ? "income" : "expense",
        order: i,
      },
    });
    console.log(`   ✅ ${name} (${category.id})`);
  }

  console.log("\n✨ Seed completed successfully!");
  console.log(`\n📋 Summary:`);
  console.log(`   User: ${SEED_USER_EMAIL}`);
  console.log(`   Password: ${SEED_USER_PASSWORD}`);
  console.log(`   Household: ${household.name}`);
  console.log(`   Invite code: ${household.inviteCode}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });