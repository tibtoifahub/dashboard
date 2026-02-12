import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const regionId = session.user.regionId ?? undefined;

  try {
    if (role === "ADMIN") {
      const regions = await prisma.region.findMany({
        include: {
          brigades: {
            select: {
              id: true,
              name: true,
              regionId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          candidates: {
            select: {
              id: true,
              fullName: true,
              pinfl: true,
              profession: true,
              regionId: true,
              brigadeId: true
            }
          }
        },
        orderBy: { id: "asc" }
      });
      return NextResponse.json(regions);
    }

    if (role === "REGION" && regionId) {
      const region = await prisma.region.findUnique({
        where: { id: regionId },
        include: {
          brigades: {
            select: {
              id: true,
              name: true,
              regionId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          candidates: {
            select: {
              id: true,
              fullName: true,
              pinfl: true,
              profession: true,
              regionId: true,
              brigadeId: true
            }
          }
        }
      });
      return NextResponse.json(region ? [region] : []);
    }

    return NextResponse.json([], { status: 200 });
  } catch (error: any) {
    console.error("Error fetching regions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, brigadeCount } = body as { name?: string; brigadeCount?: number };

  if (!name || typeof brigadeCount !== "number" || brigadeCount <= 0) {
    return NextResponse.json({ error: "name and brigadeCount are required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // Создаем регион
      const region = await tx.region.create({
        data: { name: name.trim() }
      });

      // Подготавливаем данные для массового создания бригад
      const brigadesData = Array.from({ length: brigadeCount }, (_, i) => ({
        name: `Brigade ${i + 1}`,
        regionId: region.id
      }));

      // Массовое создание бригад
      const brigades = await Promise.all(
        brigadesData.map((data) => tx.medicalBrigade.create({ data }))
      );

      // Подготавливаем данные для массового создания кандидатов
      const candidatesData: Array<{
        fullName: string;
        pinfl: string;
        profession: "DOCTOR" | "NURSE";
        regionId: number;
        brigadeId: number;
      }> = [];

      brigades.forEach((brigade) => {
        // 1 doctor slot
        candidatesData.push({
          fullName: "",
          pinfl: `VACANT-D-${region.id}-${brigade.id}`,
          profession: "DOCTOR",
          regionId: region.id,
          brigadeId: brigade.id
        });

        // 4 nurse slots
        for (let j = 0; j < 4; j++) {
          candidatesData.push({
            fullName: "",
            pinfl: `VACANT-N-${region.id}-${brigade.id}-${j + 1}`,
            profession: "NURSE",
            regionId: region.id,
            brigadeId: brigade.id
          });
        }
      });

      // Массовое создание кандидатов (разбиваем на батчи по 100 для избежания проблем с размером запроса)
      const batchSize = 100;
      for (let i = 0; i < candidatesData.length; i += batchSize) {
        const batch = candidatesData.slice(i, i + batchSize);
        await tx.candidate.createMany({
          data: batch,
          skipDuplicates: true
        });
      }

      return region;
    }, {
      timeout: 30000, // 30 секунд таймаут для больших транзакций
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error creating region:", error);
    
    // Проверяем на уникальность имени региона (Prisma error code P2002)
    if (error.code === "P2002" || error.message?.includes("Unique constraint") || error.message?.includes("unique")) {
      return NextResponse.json(
        { error: "Region with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create region" },
      { status: 500 }
    );
  }
}

// PATCH /api/regions — изменить число мед. бригад региона (только админ)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { brigadeCount: newCount } = body as { brigadeCount?: number };
  if (typeof newCount !== "number" || newCount <= 0) {
    return NextResponse.json({ error: "brigadeCount must be a positive number" }, { status: 400 });
  }

  const region = await prisma.region.findUnique({
    where: { id },
    include: { brigades: { orderBy: { id: "asc" } } }
  });
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  const currentCount = region.brigades.length;

  if (newCount === currentCount) {
    return NextResponse.json({ ...region, brigades: region.brigades });
  }

  if (newCount > currentCount) {
    const toAdd = newCount - currentCount;
    try {
      await prisma.$transaction(async (tx: any) => {
        // Создаем все бригады параллельно
        const brigadesData = Array.from({ length: toAdd }, (_, i) => ({
          name: `Brigade ${currentCount + i + 1}`,
          regionId: id
        }));

        const brigades = await Promise.all(
          brigadesData.map((data) => tx.medicalBrigade.create({ data }))
        );

        // Подготавливаем данные для массового создания кандидатов
        const candidatesData: Array<{
          fullName: string;
          pinfl: string;
          profession: "DOCTOR" | "NURSE";
          regionId: number;
          brigadeId: number;
        }> = [];

        brigades.forEach((brigade) => {
          // 1 doctor slot
          candidatesData.push({
            fullName: "",
            pinfl: `VACANT-D-${id}-${brigade.id}`,
            profession: "DOCTOR",
            regionId: id,
            brigadeId: brigade.id
          });

          // 4 nurse slots
          for (let j = 0; j < 4; j++) {
            candidatesData.push({
              fullName: "",
              pinfl: `VACANT-N-${id}-${brigade.id}-${j + 1}`,
              profession: "NURSE",
              regionId: id,
              brigadeId: brigade.id
            });
          }
        });

        // Массовое создание кандидатов
        const batchSize = 100;
        for (let i = 0; i < candidatesData.length; i += batchSize) {
          const batch = candidatesData.slice(i, i + batchSize);
          await tx.candidate.createMany({
            data: batch,
            skipDuplicates: true
          });
        }
      }, {
        timeout: 30000,
      });
    } catch (error: any) {
      console.error("Error updating brigades:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update brigades" },
        { status: 500 }
      );
    }
  } else {
    const toRemove = currentCount - newCount;
    const brigadesToDelete = region.brigades.slice(-toRemove).map((b: any) => b.id);
    const candidates = await prisma.candidate.findMany({
      where: { brigadeId: { in: brigadesToDelete } },
      select: { id: true }
    });
    const candidateIds = candidates.map((c: any) => c.id);

    await prisma.$transaction(async (tx: any) => {
      if (candidateIds.length > 0) {
        await tx.moduleResult.deleteMany({ where: { candidateId: { in: candidateIds } } });
      }
      await tx.candidate.deleteMany({ where: { brigadeId: { in: brigadesToDelete } } });
      await tx.medicalBrigade.deleteMany({ where: { id: { in: brigadesToDelete } } });
    });
  }

  const updated = await prisma.region.findUnique({
    where: { id },
    include: { brigades: true }
  });
  return NextResponse.json(updated);
}

// DELETE /api/regions — удаление региона и всех связанных данных (только админ)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : NaN;

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const region = await prisma.region.findUnique({ where: { id } });
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx: any) => {
    const candidates = await tx.candidate.findMany({ where: { regionId: id }, select: { id: true } });
    const candidateIds = candidates.map((c: any) => c.id);
    if (candidateIds.length > 0) {
      await tx.moduleResult.deleteMany({ where: { candidateId: { in: candidateIds } } });
    }
    await tx.candidate.deleteMany({ where: { regionId: id } });
    await tx.medicalBrigade.deleteMany({ where: { regionId: id } });
    await tx.user.deleteMany({ where: { regionId: id } });
    await tx.region.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}

