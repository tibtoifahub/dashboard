import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

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

  const emptyModuleBuckets = () => ({
    1: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    2: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    3: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 },
    4: { PASSED: 0, FAILED: 0, NO_SHOW_1: 0, NO_SHOW_2: 0 }
  });

  const computeRegionMetrics = (items: typeof candidates) => {
    const totalSlots = items.length;
    const filled = items.filter(isFilled).length;
    const vacant = totalSlots - filled;
    const doctorsFilled = items.filter((c) => c.profession === "DOCTOR" && isFilled(c)).length;
    const nursesFilled = items.filter((c) => c.profession === "NURSE" && isFilled(c)).length;

    const cert1 = items.filter((c) => c.cert1).length;
    const cert2 = items.filter((c) => c.cert2).length;
    const cert3 = items.filter((c) => c.cert3).length;
    const cert4 = items.filter((c) => c.cert4).length;

    const modules = emptyModuleBuckets();
    for (const c of items) {
      for (const mr of c.moduleResults) {
        const b = modules[mr.moduleNumber as 1 | 2 | 3 | 4];
        if (!b) continue;
        b[mr.status as keyof (typeof modules)[1]] += 1;
      }
    }

    const module1Passed = modules[1].PASSED;
    const module4Passed = modules[4].PASSED;

    return {
      totalSlots,
      filled,
      vacant,
      doctorsFilled,
      nursesFilled,
      cert1,
      cert2,
      cert3,
      cert4,
      modules,
      module1Passed,
      module4Passed
    };
  };

  const globalMetrics = computeRegionMetrics(candidates);
  const perRegionMetrics = regions.map((r) => ({
    id: r.id,
    name: r.name,
    metrics: computeRegionMetrics(r.candidates as any)
  }));

  const wb = XLSX.utils.book_new();

  // Лист "Регионы" — двухуровневые шапки как на странице: строка 1 — группы (Сертификат 1, Модуль 1, …), строка 2 — подзаголовки (есть, нет, Сдал, …)
  const headerRow0: any[] = ["Регион", "Всего мест", "Вакантно"];
  const headerRow1: any[] = ["", "", ""];
  for (let n = 1; n <= 4; n++) {
    headerRow0.push("Сертификат " + n, ""); // 2 колонки — объединим
    headerRow1.push("есть", "нет");
    headerRow0.push("Модуль " + n, "", "", ""); // 4 колонки — объединим
    headerRow1.push("Сдал", "Не сдал", "Неявка 1 раз", "Неявка 2 раза");
  }
  const regionsRows: any[][] = [headerRow0, headerRow1];
  for (const r of perRegionMetrics) {
    const m = r.metrics;
    const row: any[] = [r.name, m.totalSlots, m.vacant];
    for (let n = 1; n <= 4; n++) {
      const certVal = n === 1 ? m.cert1 : n === 2 ? m.cert2 : n === 3 ? m.cert3 : m.cert4;
      row.push(certVal, m.totalSlots - certVal);
      row.push(m.modules[n as 1].PASSED, m.modules[n as 1].FAILED, m.modules[n as 1].NO_SHOW_1, m.modules[n as 1].NO_SHOW_2);
    }
    regionsRows.push(row);
  }
  const wsRegions = XLSX.utils.aoa_to_sheet(regionsRows);
  // Объединение ячеек для двухуровневой шапки (индексы 0-based)
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },   // Регион
    { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },   // Всего мест
    { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },   // Вакантно
    { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },   // Сертификат 1
    { s: { r: 0, c: 5 }, e: { r: 0, c: 8 } },   // Модуль 1
    { s: { r: 0, c: 9 }, e: { r: 0, c: 10 } },  // Сертификат 2
    { s: { r: 0, c: 11 }, e: { r: 0, c: 14 } }, // Модуль 2
    { s: { r: 0, c: 15 }, e: { r: 0, c: 16 } }, // Сертификат 3
    { s: { r: 0, c: 17 }, e: { r: 0, c: 20 } }, // Модуль 3
    { s: { r: 0, c: 21 }, e: { r: 0, c: 22 } }, // Сертификат 4
    { s: { r: 0, c: 23 }, e: { r: 0, c: 26 } }  // Модуль 4
  ];
  wsRegions["!merges"] = merges;
  XLSX.utils.book_append_sheet(wb, wsRegions, "Регионы");

  // Лист "Модули": по каждому региону и модулю — статусы экзамена (русские подписи)
  const modulesHeader = ["Регион", "Модуль", "Сдал", "Не сдал", "Не пришёл 1 раз", "Не пришёл 2 раза"];
  const modulesRows: any[][] = [modulesHeader];
  for (const r of perRegionMetrics) {
    const m = r.metrics.modules;
    ([
      [1, m[1]],
      [2, m[2]],
      [3, m[3]],
      [4, m[4]]
    ] as const).forEach(([mod, bucket]) => {
      modulesRows.push([
        r.name,
        `Модуль ${mod}`,
        bucket.PASSED,
        bucket.FAILED,
        bucket.NO_SHOW_1,
        bucket.NO_SHOW_2
      ]);
    });
  }
  const wsModules = XLSX.utils.aoa_to_sheet(modulesRows);
  XLSX.utils.book_append_sheet(wb, wsModules, "Модули");

  // Лист "Профессии": врачи и медсёстры — понятные названия
  const profHeader = ["Профессия", "Всего", "Сертификат 1", "Модуль 1 сдали", "Модуль 4 сдали"];
  const profRows: any[][] = [profHeader];
  const buildModuleMap = (results: { moduleNumber: number; status: any }[]) => {
    const map = new Map<number, any>();
    for (const r of results) {
      if (!map.has(r.moduleNumber)) {
        map.set(r.moduleNumber, r.status);
      }
    }
    return map;
  };

  (
    [
      ["Врач", "DOCTOR"],
      ["Медсестра", "NURSE"]
    ] as const
  ).forEach(([label, prof]) => {
    const list = candidates.filter((c) => c.profession === prof);
    let total = 0;
    let cert1 = 0;
    let module1Passed = 0;
    let module4Passed = 0;
    for (const c of list) {
      total += 1;
      if (c.cert1) cert1 += 1;
      const map = buildModuleMap(c.moduleResults);
      if (map.get(1) === "PASSED") module1Passed += 1;
      if (map.get(4) === "PASSED") module4Passed += 1;
    }
    profRows.push([label, total, cert1, module1Passed, module4Passed]);
  });
  const wsProf = XLSX.utils.aoa_to_sheet(profRows);
  XLSX.utils.book_append_sheet(wb, wsProf, "Профессии");

  // Лист "Вакансии": регион, всего мест, вакантно
  const vacRows: any[][] = [["Регион", "Всего мест", "Вакантно"]];
  for (const r of perRegionMetrics) {
    vacRows.push([r.name, r.metrics.totalSlots, r.metrics.vacant]);
  }
  const wsVac = XLSX.utils.aoa_to_sheet(vacRows);
  XLSX.utils.book_append_sheet(wb, wsVac, "Вакансии");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="statistics.xlsx"'
    }
  });
}

