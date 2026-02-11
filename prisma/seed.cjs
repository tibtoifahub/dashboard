const { PrismaClient, Role, Profession, ModuleStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Admin user - измените логин и пароль на свои
  const adminLogin = process.env.ADMIN_LOGIN || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  if (adminPassword === "ChangeMe123!") {
    console.warn("⚠️  ВНИМАНИЕ: Используется пароль по умолчанию! Установите ADMIN_PASSWORD в переменных окружения.");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Example region
  const region = await prisma.region.create({
    data: {
      name: "Tashkent Region"
    }
  });

  // A few brigades with placeholder candidates
  async function createBrigadeWithSlots(name) {
    const brigade = await prisma.medicalBrigade.create({
      data: {
        name,
        regionId: region.id
      }
    });

    // 1 doctor slot
    await prisma.candidate.create({
      data: {
        fullName: "",
        pinfl: `VACANT-D-${brigade.id}`,
        profession: Profession.DOCTOR,
        regionId: region.id,
        brigadeId: brigade.id
      }
    });

    // 4 nurse slots
    for (let i = 0; i < 4; i++) {
      await prisma.candidate.create({
        data: {
          fullName: "",
          pinfl: `VACANT-N-${brigade.id}-${i + 1}`,
          profession: Profession.NURSE,
          regionId: region.id,
          brigadeId: brigade.id
        }
      });
    }

    return brigade;
  }

  await createBrigadeWithSlots("Brigade 1");
  await createBrigadeWithSlots("Brigade 2");

  // Sample candidate with some certificates and module results
  const sampleBrigade = await prisma.medicalBrigade.findFirst({
    where: { regionId: region.id }
  });

  if (sampleBrigade) {
    const sampleCandidate = await prisma.candidate.create({
      data: {
        fullName: "Sample Doctor",
        pinfl: "12345678901234",
        profession: Profession.DOCTOR,
        regionId: region.id,
        brigadeId: sampleBrigade.id,
        cert1: true,
        cert2: true,
        cert3: false,
        cert4: false
      }
    });

    await prisma.moduleResult.create({
      data: {
        candidateId: sampleCandidate.id,
        moduleNumber: 1,
        status: ModuleStatus.PASSED,
        attemptNumber: 1,
        isRetake: false
      }
    });
  }

  // Create admin user
  await prisma.user.upsert({
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

