const { PrismaClient, Role, Profession, ModuleStatus } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Default admin user
  const adminLogin = "admin";
  const adminPassword = "2020331";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Example region - use upsert to handle existing region
  const region = await prisma.region.upsert({
    where: { name: "Tashkent Region" },
    create: {
      name: "Tashkent Region"
    },
    update: {}
  });

  // A few brigades with placeholder candidates
  async function createBrigadeWithSlots(name) {
    // Check if brigade already exists
    let brigade = await prisma.medicalBrigade.findFirst({
      where: {
        name,
        regionId: region.id
      }
    });

    if (!brigade) {
      brigade = await prisma.medicalBrigade.create({
        data: {
          name,
          regionId: region.id
        }
      });

      // 1 doctor slot
      await prisma.candidate.createMany({
        data: [{
          fullName: "",
          pinfl: `VACANT-D-${brigade.id}`,
          profession: Profession.DOCTOR,
          regionId: region.id,
          brigadeId: brigade.id
        }],
        skipDuplicates: true
      });

      // 4 nurse slots
      const nurseSlots = [];
      for (let i = 0; i < 4; i++) {
        nurseSlots.push({
          fullName: "",
          pinfl: `VACANT-N-${brigade.id}-${i + 1}`,
          profession: Profession.NURSE,
          regionId: region.id,
          brigadeId: brigade.id
        });
      }
      await prisma.candidate.createMany({
        data: nurseSlots,
        skipDuplicates: true
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
    const samplePinfl = "12345678901234";
    let sampleCandidate = await prisma.candidate.findUnique({
      where: { pinfl: samplePinfl }
    });

    if (!sampleCandidate) {
      sampleCandidate = await prisma.candidate.create({
        data: {
          fullName: "Sample Doctor",
          pinfl: samplePinfl,
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

  console.log("✅ Seed completed successfully!");
  console.log(`   Admin login: ${adminLogin}`);
  console.log(`   Admin password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

