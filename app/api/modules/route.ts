import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Проверка цепочки сертификатов: сертификат N считается только при наличии сертификатов 1..N-1
function hasCertChain(
  c: { cert1: boolean; cert2: boolean; cert3: boolean; cert4: boolean },
  upToModule: number
) {
  for (let m = 1; m <= upToModule; m++) {
    const cert = m === 1 ? c.cert1 : m === 2 ? c.cert2 : m === 3 ? c.cert3 : c.cert4;
    if (!cert) return false;
  }
  return true;
}

// Helper to check module eligibility (последовательно: все предыдущие сертификаты + все предыдущие экзамены сданы)
async function isCandidateEligible(candidateId: number, moduleNumber: number) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { moduleResults: true }
  });
  if (!candidate) return false;

  const hasPassed = (module: number) =>
    candidate.moduleResults.some((mr: any) => mr.moduleNumber === module && mr.status === "PASSED");

  const passedAllExamsBefore = (n: number) => {
    for (let m = 1; m < n; m++) {
      if (!hasPassed(m)) return false;
    }
    return true;
  };

  if (moduleNumber === 1) {
    return candidate.cert1 === true;
  }

  // Модуль N: есть все сертификаты 1..N и сданы экзамены 1..N-1
  return (
    hasCertChain(candidate, moduleNumber) && passedAllExamsBefore(moduleNumber)
  );
}

// GET /api/modules?moduleNumber=1
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moduleNumberParam = searchParams.get("moduleNumber");
  const moduleNumber = moduleNumberParam ? Number(moduleNumberParam) : NaN;

  if (![1, 2, 3, 4].includes(moduleNumber)) {
    return NextResponse.json({ error: "Invalid moduleNumber" }, { status: 400 });
  }

  const where: any = {};
  if (session.user.role === "REGION" && session.user.regionId) {
    where.regionId = session.user.regionId;
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      region: true,
      brigade: true,
      moduleResults: true
    }
  });

  // Показываем только по условию: модуль 1 — у кого есть сертификат 1; модуль N — кто сдал все предыдущие (1..N-1)
  const hasPassed = (c: { moduleResults: { moduleNumber: number; status: string }[] }, mod: number) =>
    c.moduleResults.some((mr) => mr.moduleNumber === mod && mr.status === "PASSED");

  const passedAllPrevious = (
    c: { moduleResults: { moduleNumber: number; status: string }[] },
    upToModule: number
  ) => {
    for (let m = 1; m < upToModule; m++) {
      if (!hasPassed(c, m)) return false;
    }
    return true;
  };

  const filtered =
    moduleNumber === 1
      ? candidates.filter((c: any) => c.cert1 === true)
      : candidates.filter((c: any) => passedAllPrevious(c, moduleNumber));

  const withEligible = await Promise.all(
    filtered.map(async (c: any) => ({
      ...c,
      eligible: await isCandidateEligible(c.id, moduleNumber)
    }))
  );

  return NextResponse.json(withEligible);
}

// POST /api/modules
// body: { candidateId, moduleNumber, status }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "REGION") {
    return NextResponse.json({ error: "Only admin can modify module results" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { candidateId, moduleNumber, status } = body as {
    candidateId?: number;
    moduleNumber?: number;
    status?: "PASSED" | "FAILED" | "NO_SHOW_1" | "NO_SHOW_2";
  };

  if (!candidateId || !moduleNumber || !status) {
    return NextResponse.json({ error: "candidateId, moduleNumber, status required" }, { status: 400 });
  }

  if (![1, 2, 3, 4].includes(moduleNumber)) {
    return NextResponse.json({ error: "Invalid moduleNumber" }, { status: 400 });
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { moduleResults: true }
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // На этом этапе регион уже отфильтрован выше, а запись модулей разрешена только админу.

  // Администратор может менять статус экзамена без ограничений:
  // просто перезаписываем (или создаём) одну запись на модуль.
  const existing = candidate.moduleResults.find((mr: any) => mr.moduleNumber === moduleNumber);

  let result;
  if (existing) {
    result = await prisma.moduleResult.update({
      where: { id: existing.id },
      data: {
        status,
        attemptNumber: 1,
        isRetake: false
      }
    });
  } else {
    result = await prisma.moduleResult.create({
      data: {
        candidateId,
        moduleNumber,
        status,
        attemptNumber: 1,
        isRetake: false
      }
    });
  }

  return NextResponse.json(result, { status: 201 });
}

