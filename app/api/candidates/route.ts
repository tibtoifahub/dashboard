import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/candidates
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const regionIdParam = searchParams.get("regionId");
  const brigadeIdParam = searchParams.get("brigadeId");
  const profession = searchParams.get("profession") as "DOCTOR" | "NURSE" | null;
  const search = searchParams.get("search");

  const where: any = {};

  if (session.user.role === "REGION") {
    where.regionId = session.user.regionId ?? undefined;
  } else if (regionIdParam) {
    where.regionId = Number(regionIdParam);
  }

  if (brigadeIdParam) {
    where.brigadeId = Number(brigadeIdParam);
  }

  if (profession === "DOCTOR" || profession === "NURSE") {
    where.profession = profession;
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { pinfl: { contains: search } }
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      region: true,
      brigade: true,
      moduleResults: true
    },
    orderBy: [{ regionId: "asc" }, { brigadeId: "asc" }, { id: "asc" }]
  });

  return NextResponse.json(candidates);
}

// PATCH /api/candidates
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, data } = body as {
    id?: number;
    data?: Record<string, unknown>;
  };

  if (!id || !data) {
    return NextResponse.json({ error: "id and data are required" }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Region user can only access own region's candidates
  if (session.user.role === "REGION") {
    if (!session.user.regionId || candidate.regionId !== session.user.regionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const isAdmin = session.user.role === "ADMIN";

  // Регион может менять ФИО, ПИНФЛ и статусы сертификатов (cert1–4 и примечания).
  const allowedFieldsForRegion = new Set([
    "fullName",
    "pinfl",
    "cert1",
    "cert1Note",
    "cert2",
    "cert2Note",
    "cert3",
    "cert3Note",
    "cert4",
    "cert4Note"
  ]);

  const updateData: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (isAdmin || allowedFieldsForRegion.has(key)) {
      updateData[key] = value;
    }
  }

  // Каскад: при переключении сертификата N на «нет» сбрасываем сертификаты N+1..4 и примечания
  if (updateData.cert1 === false) {
    updateData.cert2 = false;
    updateData.cert2Note = null;
    updateData.cert3 = false;
    updateData.cert3Note = null;
    updateData.cert4 = false;
    updateData.cert4Note = null;
  } else if (updateData.cert2 === false) {
    updateData.cert3 = false;
    updateData.cert3Note = null;
    updateData.cert4 = false;
    updateData.cert4Note = null;
  } else if (updateData.cert3 === false) {
    updateData.cert4 = false;
    updateData.cert4Note = null;
  }

  // Enforce PINFL uniqueness at application level too
  if (updateData.pinfl && typeof updateData.pinfl === "string") {
    const existing = await prisma.candidate.findUnique({
      where: { pinfl: updateData.pinfl }
    });
    if (existing && existing.id !== candidate.id) {
      return NextResponse.json({ error: "PINFL must be unique" }, { status: 400 });
    }
  }

  const updated = await prisma.candidate.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json(updated);
}

