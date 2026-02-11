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

  if (role === "ADMIN") {
    const regions = await prisma.region.findMany({
      include: {
        brigades: true,
        candidates: true
      },
      orderBy: { id: "asc" }
    });
    return NextResponse.json(regions);
  }

  if (role === "REGION" && regionId) {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      include: { brigades: true, candidates: true }
    });
    return NextResponse.json(region ? [region] : []);
  }

  return NextResponse.json([], { status: 200 });
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

  const result = await prisma.$transaction(async (tx) => {
    const region = await tx.region.create({
      data: { name }
    });

    for (let i = 0; i < brigadeCount; i++) {
      const brigade = await tx.medicalBrigade.create({
        data: {
          name: `Brigade ${i + 1}`,
          regionId: region.id
        }
      });

      // 1 doctor slot
      await tx.candidate.create({
        data: {
          fullName: "",
          pinfl: `VACANT-D-${region.id}-${brigade.id}`,
          profession: "DOCTOR",
          regionId: region.id,
          brigadeId: brigade.id
        }
      });

      // 4 nurse slots
      for (let j = 0; j < 4; j++) {
        await tx.candidate.create({
          data: {
            fullName: "",
            pinfl: `VACANT-N-${region.id}-${brigade.id}-${j + 1}`,
            profession: "NURSE",
            regionId: region.id,
            brigadeId: brigade.id
          }
        });
      }
    }

    return region;
  });

  return NextResponse.json(result, { status: 201 });
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
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < toAdd; i++) {
        const brigade = await tx.medicalBrigade.create({
          data: {
            name: `Brigade ${currentCount + i + 1}`,
            regionId: id
          }
        });
        await tx.candidate.create({
          data: {
            fullName: "",
            pinfl: `VACANT-D-${id}-${brigade.id}`,
            profession: "DOCTOR",
            regionId: id,
            brigadeId: brigade.id
          }
        });
        for (let j = 0; j < 4; j++) {
          await tx.candidate.create({
            data: {
              fullName: "",
              pinfl: `VACANT-N-${id}-${brigade.id}-${j + 1}`,
              profession: "NURSE",
              regionId: id,
              brigadeId: brigade.id
            }
          });
        }
      }
    });
  } else {
    const toRemove = currentCount - newCount;
    const brigadesToDelete = region.brigades.slice(-toRemove).map((b) => b.id);
    const candidates = await prisma.candidate.findMany({
      where: { brigadeId: { in: brigadesToDelete } },
      select: { id: true }
    });
    const candidateIds = candidates.map((c) => c.id);

    await prisma.$transaction(async (tx) => {
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

  await prisma.$transaction(async (tx) => {
    const candidates = await tx.candidate.findMany({ where: { regionId: id }, select: { id: true } });
    const candidateIds = candidates.map((c) => c.id);
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

