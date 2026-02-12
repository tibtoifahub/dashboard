const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminLogin = "admin";
  const adminPassword = "2020331";

  console.log(`Resetting password for user: ${adminLogin}`);

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { login: adminLogin },
    create: {
      login: adminLogin,
      passwordHash,
      role: Role.ADMIN
    },
    update: {
      passwordHash
    }
  });

  console.log(`✅ Admin user updated successfully!`);
  console.log(`   Login: ${user.login}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
