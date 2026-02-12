import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const profession = formData.get("profession") as "DOCTOR" | "NURSE" | null;
  const mode = formData.get("mode") as "add" | "overwrite" | null;
  const regionIdRaw = formData.get("regionId") as string | null;

  if (!file || !profession || !mode) {
    return NextResponse.json(
      { error: "Требуются: file, profession, mode (add или overwrite)" },
      { status: 400 }
    );
  }

  if (mode !== "add" && mode !== "overwrite") {
    return NextResponse.json({ error: "mode должен быть add или overwrite" }, { status: 400 });
  }

  let regionId: number | null = null;
  if (session.user.role === "ADMIN") {
    if (!regionIdRaw) {
      return NextResponse.json({ error: "Для админа укажите regionId" }, { status: 400 });
    }
    regionId = Number(regionIdRaw);
  } else if (session.user.role === "REGION") {
    regionId = session.user.regionId ?? null;
  }

  if (!regionId) {
    return NextResponse.json({ error: "Регион не определён" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "Некорректный файл Excel" }, { status: 400 });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "В файле нет листов" }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Шаблон: одна колонка ФИО (или первый столбец)
  const validRows: { fullName: string; rowIndex: number }[] = [];
  const reasons: { rowIndex: number; reason: string }[] = [];

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2;
    const fullName = String(row.ФИО ?? row.fullName ?? row.FIO ?? Object.values(row)[0] ?? "").trim();

    if (mode === "add" && !fullName) {
      return; // при добавлении пустые строки пропускаем
    }

    validRows.push({ fullName, rowIndex });
  });

  const candidates = await prisma.candidate.findMany({
    where: { regionId, profession },
    orderBy: [{ brigadeId: "asc" }, { id: "asc" }]
  });

  let imported = 0;
  let vacanciesCount: number | undefined;
  const reasonsOut: { rowIndex: number; reason: string }[] = [];

  if (mode === "add") {
    const vacancies = candidates.filter((c: any) => !c.fullName || c.fullName.trim() === "");
    vacanciesCount = vacancies.length;
    const toImport = validRows.filter((r) => r.fullName);
    const max = Math.min(toImport.length, vacancies.length);

    await prisma.$transaction(async (tx: any) => {
      for (let i = 0; i < max; i++) {
        const row = toImport[i];
        const vacancy = vacancies[i];
        await tx.candidate.update({
          where: { id: vacancy.id },
          data: { fullName: row.fullName }
        });
        imported += 1;
      }
    });

    if (vacancies.length === 0 && toImport.length > 0) {
      reasonsOut.push({
        rowIndex: 0,
        reason: `Нет свободных слотов для региона и профессии (всего слотов: ${candidates.length}). Используйте режим «Перезаписать список» или добавьте слоты в настройках региона.`
      });
    }
  } else {
    // overwrite: первые N слотов заполняем из файла, остальные очищаем
    await prisma.$transaction(async (tx: any) => {
      for (let i = 0; i < candidates.length; i++) {
        const slot = candidates[i];
        const newName = i < validRows.length ? validRows[i].fullName : "";
        await tx.candidate.update({
          where: { id: slot.id },
          data: {
            fullName: newName,
            ...(newName ? {} : { cert1: false, cert1Note: null, cert2: false, cert2Note: null, cert3: false, cert3Note: null, cert4: false, cert4Note: null })
          }
        });
        if (i < validRows.length && validRows[i].fullName) imported += 1;
      }
    });
  }

  const skipped = Math.max(0, validRows.length - imported);
  const message =
    mode === "add" && validRows.filter((r) => r.fullName).length > 0 && imported === 0
      ? "Нет свободных слотов для заполнения. Выберите режим «Перезаписать список» или добавьте слоты в настройках региона."
      : undefined;

  return NextResponse.json({
    imported,
    skipped,
    reasons: reasonsOut,
    ...(vacanciesCount !== undefined && { vacanciesCount }),
    ...(message && { message })
  });
}
