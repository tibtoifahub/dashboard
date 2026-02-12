import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ModuleStatusBucket = {
  PASSED: number;
  FAILED: number;
  NO_SHOW_1: number;
  NO_SHOW_2: number;
};

function emptyModuleBuckets(): Record<1 | 2 | 3 | 4, ModuleStatusBucket> {
  return {
    1: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    2: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    3: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    4: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 }
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isRegionUser = session.user.role === "REGION";
  const regionId = session.user.regionId ?? null;

  const candidateWhere = isRegionUser && regionId ? { regionId } : {};
  const regionWhere = isRegionUser && regionId ? { id: regionId } : {};

  const candidates = await prisma.candidate.findMany({
    where: candidateWhere,
    include: {
      moduleResults: true,
      region: true
    }
  });

  const regions = await prisma.region.findMany({
    where: regionWhere,
    include: {
      candidates: {
        include: { moduleResults: true }
      }
    },
    orderBy: { name: "asc" }
  });

  const isFilled = (c: { fullName: string; pinfl: string }) =>
    Boolean(c.fullName && c.fullName.trim() && c.pinfl && c.pinfl.trim());

  const buildModuleMap = (results: { moduleNumber: number; status: any }[]) => {
    const map = new Map<number, any>();
    for (const r of results) {
      if (!map.has(r.moduleNumber)) {
        map.set(r.moduleNumber, r.status);
      }
    }
    return map;
  };

  function computeGlobalMetrics(all: typeof candidates) {
    const totalSlots = all.length;
    const filled = all.filter(isFilled).length;
    const vacant = totalSlots - filled;

    const doctorsFilled = all.filter((c: any) => c.profession === "DOCTOR" && isFilled(c)).length;
    const nursesFilled = all.filter((c: any) => c.profession === "NURSE" && isFilled(c)).length;

    const cert1Count = all.filter((c: any) => c.cert1).length;
    const cert2Count = all.filter((c: any) => c.cert2).length;
    const cert3Count = all.filter((c: any) => c.cert3).length;
    const cert4Count = all.filter((c: any) => c.cert4).length;

    const moduleBuckets = emptyModuleBuckets();
    for (const c of all) {
      for (const r of c.moduleResults) {
        const b = moduleBuckets[r.moduleNumber as 1 | 2 | 3 | 4];
        if (!b) continue;
        b[r.status as keyof ModuleStatusBucket] += 1;
      }
    }

    const module1Passed = moduleBuckets[1].PASSED;
    const module2Passed = moduleBuckets[2].PASSED;
    const module3Passed = moduleBuckets[3].PASSED;
    const module4Passed = moduleBuckets[4].PASSED;

    return {
      totalSlots,
      filled,
      vacant,
      doctorsFilled,
      nursesFilled,
      cert1Count,
      cert2Count,
      cert3Count,
      cert4Count,
      module1Passed,
      module2Passed,
      module3Passed,
      module4Passed,
      moduleStatus: moduleBuckets
    };
  }

  const global = computeGlobalMetrics(candidates);

  // Funnel
  const funnel = [
    { step: "cert1", count: global.cert1Count },
    { step: "module1", count: global.module1Passed },
    { step: "module2", count: global.module2Passed },
    { step: "module3", count: global.module3Passed },
    { step: "module4", count: global.module4Passed }
  ];

  // Regional analytics
  const regionsAnalytics = regions.map((r: any) => {
    const cs = r.candidates;
    const totalSlots = cs.length;
    const filled = cs.filter(isFilled).length;
    const vacant = totalSlots - filled;
    const doctorsFilled = cs.filter((c: any) => c.profession === "DOCTOR" && isFilled(c)).length;
    const nursesFilled = cs.filter((c: any) => c.profession === "NURSE" && isFilled(c)).length;

    const cert1 = cs.filter((c: any) => c.cert1).length;
    const cert2 = cs.filter((c: any) => c.cert2).length;
    const cert3 = cs.filter((c: any) => c.cert3).length;
    const cert4 = cs.filter((c: any) => c.cert4).length;

    const moduleStatus = emptyModuleBuckets();
    for (const c of cs) {
      for (const mr of c.moduleResults) {
        const b = moduleStatus[mr.moduleNumber as 1 | 2 | 3 | 4];
        if (!b) continue;
        b[mr.status as keyof ModuleStatusBucket] += 1;
      }
    }

    const module1Passed = moduleStatus[1].PASSED;
    const module4Passed = moduleStatus[4].PASSED;

    return {
      id: r.id,
      name: r.name,
      totalSlots,
      filled,
      vacant,
      doctorsFilled,
      nursesFilled,
      cert1,
      cert2,
      cert3,
      cert4,
      modules: moduleStatus,
      module1Passed,
      module4Passed
    };
  });

  // Profession analytics
  const professions = ["DOCTOR", "NURSE"] as const;
  const professionAnalytics: Record<
    (typeof professions)[number],
    { total: number; cert1: number; module1Passed: number; module4Passed: number }
  > = {
    DOCTOR: { total: 0, cert1: 0, module1Passed: 0, module4Passed: 0 },
    NURSE: { total: 0, cert1: 0, module1Passed: 0, module4Passed: 0 }
  };

  const globalModuleMap = candidates.map((c: any) => ({
    candidateId: c.id,
    profession: c.profession,
    cert1: c.cert1,
    moduleMap: buildModuleMap(c.moduleResults)
  }));

  for (const entry of globalModuleMap) {
    const bucket = professionAnalytics[entry.profession as "DOCTOR" | "NURSE"];
    bucket.total += 1;
    if (entry.cert1) bucket.cert1 += 1;
    if (entry.moduleMap.get(1) === "PASSED") bucket.module1Passed += 1;
    if (entry.moduleMap.get(4) === "PASSED") bucket.module4Passed += 1;
  }

  // Problem regions
  const problemRegionsBase = regionsAnalytics.map((r: any) => {
    const modules = r.modules;
    const totalNoShow =
      modules[1].NO_SHOW_1 +
      modules[1].NO_SHOW_2 +
      modules[2].NO_SHOW_1 +
      modules[2].NO_SHOW_2 +
      modules[3].NO_SHOW_1 +
      modules[3].NO_SHOW_2 +
      modules[4].NO_SHOW_1 +
      modules[4].NO_SHOW_2;
    const totalFailed =
      modules[1].FAILED + modules[2].FAILED + modules[3].FAILED + modules[4].FAILED;

    return {
      regionId: r.id,
      regionName: r.name,
      totalNoShow,
      totalFailed,
      vacant: r.vacant
    };
  });

  const sortDesc = <K extends keyof (typeof problemRegionsBase)[number]>(
    key: K
  ) => {
    return [...problemRegionsBase]
      .sort((a, b) => Number(b[key]) - Number(a[key]))
      .slice(0, 5);
  };

  const problemRegions = {
    noShow: sortDesc("totalNoShow"),
    failed: sortDesc("totalFailed"),
    vacant: sortDesc("vacant")
  };

  return NextResponse.json({
    global,
    funnel,
    regions: regionsAnalytics,
    professions: professionAnalytics,
    problemRegions
  });
}

