"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import { DataTable } from "@/components/ui/DataTable";

interface CandidateRow {
  id: number;
  fullName: string;
  pinfl: string;
  profession: "DOCTOR" | "NURSE";
  regionName: string;
  brigadeName: string;
  cert1: boolean;
  cert1Note?: string | null;
  cert2: boolean;
  cert2Note?: string | null;
  cert3: boolean;
  cert3Note?: string | null;
  cert4: boolean;
  cert4Note?: string | null;
  passedModule1: boolean;
  passedModule2: boolean;
  passedModule3: boolean;
}

type NoteModal = {
  candidateId: number;
  moduleNum: 1 | 2 | 3 | 4;
  initialNote: string;
  candidateName: string;
};

type RegionOption = { id: number; name: string };

export default function CandidatesPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CandidateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [noteModal, setNoteModal] = useState<NoteModal | null>(null);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterFio, setFilterFio] = useState("");
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [profession, setProfession] = useState<"DOCTOR" | "NURSE">("DOCTOR");
  const [importMode, setImportMode] = useState<"add" | "overwrite">("add");
  const [importProfession, setImportProfession] = useState<"DOCTOR" | "NURSE">("DOCTOR");
  const [importRegionId, setImportRegionId] = useState<string>("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidates");
      if (!res.ok) throw new Error("Failed to load candidates");
      const json = await res.json();
      const mapped: CandidateRow[] = json
        .map((c: any) => {
          const results = c.moduleResults ?? [];
          const passed = (n: number) =>
            results.some((r: any) => r.moduleNumber === n && r.status === "PASSED");
          return {
            id: c.id,
            fullName: c.fullName,
            pinfl: c.pinfl,
            profession: c.profession,
            regionName: c.region?.name ?? "",
            brigadeName: c.brigade?.name ?? "",
            cert1: c.cert1,
            cert1Note: c.cert1Note,
            cert2: c.cert2,
            cert2Note: c.cert2Note,
            cert3: c.cert3,
            cert3Note: c.cert3Note,
            cert4: c.cert4,
            cert4Note: c.cert4Note,
            passedModule1: passed(1),
            passedModule2: passed(2),
            passedModule3: passed(3)
          };
        })
        // сначала врачи, потом медсёстры
        .sort((a: CandidateRow, b: CandidateRow) => {
          if (a.profession === b.profession) return 0;
          return a.profession === "DOCTOR" ? -1 : 1;
        });
      setData(mapped);
      setInfo(null);
    } catch (e: any) {
      setError(e.message ?? "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/regions")
        .then((r) => r.json())
        .then((list: RegionOption[]) => {
          setRegions(list);
          if (list.length > 0 && !importRegionId) setImportRegionId(String(list[0].id));
        })
        .catch(() => {});
    }
  }, [session?.user?.role]);

  async function updateCandidate(id: number, patch: Partial<CandidateRow>) {
    const res = await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, data: patch })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error ?? "Ошибка сохранения");
    }
    setInfo("Изменения сохранены");
    await load();
  }

  function certCell(moduleNum: 1 | 2 | 3 | 4, row: { original: CandidateRow }) {
    const c = row.original;
    const certKey = `cert${moduleNum}` as keyof CandidateRow;
    const noteKey = `cert${moduleNum}Note` as keyof CandidateRow;
    const value = Boolean(c[certKey]);
    const note = (c[noteKey] as string | null | undefined) ?? "";
    // Последовательно: выбор сертификата N доступен только если сданы все предыдущие модули (1..N-1)
    const passedPrev =
      moduleNum === 1 ||
      (moduleNum === 2 && c.passedModule1) ||
      (moduleNum === 3 && c.passedModule1 && c.passedModule2) ||
      (moduleNum === 4 && c.passedModule1 && c.passedModule2 && c.passedModule3);

    if (moduleNum > 1 && !passedPrev) {
      const firstMissing =
        !c.passedModule1 ? 1 : !c.passedModule2 ? 2 : !c.passedModule3 ? 3 : 4;
      return (
        <span className="text-xs text-slate-400">
          Сначала сдайте модуль {firstMissing}
        </span>
      );
    }

    const updateCert = async (val: boolean, noteVal?: string) => {
      try {
        await updateCandidate(c.id, {
          [certKey]: val,
          [noteKey]: noteVal ?? null
        } as Partial<CandidateRow>);
      } catch (err: any) {
        setError(err.message);
      }
    };

    return (
      <div className="flex flex-col gap-1">
        <select
          value={value ? "yes" : "no"}
          className="rounded border border-slate-300 px-2 py-1 text-xs"
          onChange={(e) => updateCert(e.target.value === "yes")}
        >
          <option value="yes">Есть</option>
          <option value="no">Нет</option>
        </select>
        {!value && (
          <button
            type="button"
            onClick={() =>
              setNoteModal({
                candidateId: c.id,
                moduleNum,
                initialNote: note,
                candidateName: c.fullName || `Кандидат #${c.id}`
              })
            }
            className="rounded border border-slate-300 bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            {note ? (note.length > 40 ? `${note.slice(0, 40)}…` : note) : "Добавить примечание"}
          </button>
        )}
      </div>
    );
  }

  const doctors = data.filter((c) => c.profession === "DOCTOR");
  const nurses = data.filter((c) => c.profession === "NURSE");
  const visibleData = profession === "DOCTOR" ? doctors : nurses;
  const regionOptions = [...new Set(data.map((c) => c.regionName))].filter(Boolean).sort() as string[];
  const filteredData = visibleData.filter(
    (c) =>
      (!filterRegion || c.regionName === filterRegion) &&
      (!filterFio.trim() || (c.fullName || "").toLowerCase().includes(filterFio.trim().toLowerCase()))
  );

  async function applyCertToAll(moduleNum: 1 | 2 | 3 | 4, value: boolean) {
    const certKey = `cert${moduleNum}`;
    const noteKey = `cert${moduleNum}Note`;
    setError(null);
    try {
      await Promise.all(
        filteredData.map((row) =>
          fetch("/api/candidates", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: row.id,
              data: { [certKey]: value, [noteKey]: value ? null : undefined }
            })
          })
        )
      );
      setInfo(`Сертификат (модуль ${moduleNum}) для всех: ${value ? "Есть" : "Нет"}`);
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columns: ColumnDef<CandidateRow>[] = [
    {
      accessorKey: "regionName",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Регион</span>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="w-full max-w-[180px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
          >
            <option value="">Все регионы</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )
    },
    {
      accessorKey: "fullName",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">ФИО</span>
          <input
            type="text"
            placeholder="Поиск по ФИО..."
            value={filterFio}
            onChange={(e) => setFilterFio(e.target.value)}
            className="w-full min-w-[140px] max-w-[200px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700 placeholder:text-slate-400"
          />
        </div>
      ),
      cell: ({ row, getValue }) => {
        const value = getValue<string>() ?? "";
        const isVacant = !value;
        return (
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
              defaultValue={value}
              onBlur={async (e) => {
                const newValue = e.target.value;
                if (newValue === value) return;
                try {
                  await updateCandidate(row.original.id, { fullName: newValue });
                } catch (err: any) {
                  setError(err.message);
                  e.target.value = value;
                }
              }}
            />
            {isVacant && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                VACANT
              </span>
            )}
          </div>
        );
      }
    },
    {
      accessorKey: "profession",
      header: "Профессия",
      cell: ({ getValue }) => {
        const profession = getValue<"DOCTOR" | "NURSE">();
        return profession === "DOCTOR" ? "Врач" : "Медсестра";
      }
    },
    {
      id: "cert1",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Сертификат (модуль 1)</span>
          <select
            className="w-full max-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "yes") applyCertToAll(1, true);
              if (v === "no") applyCertToAll(1, false);
              e.target.value = "";
            }}
          >
            <option value="">Применить ко всем</option>
            <option value="yes">Есть</option>
            <option value="no">Нет</option>
          </select>
        </div>
      ),
      cell: ({ row }) => certCell(1, row)
    },
    {
      id: "cert2",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Сертификат (модуль 2)</span>
          <select
            className="w-full max-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "yes") applyCertToAll(2, true);
              if (v === "no") applyCertToAll(2, false);
              e.target.value = "";
            }}
          >
            <option value="">Применить ко всем</option>
            <option value="yes">Есть</option>
            <option value="no">Нет</option>
          </select>
        </div>
      ),
      cell: ({ row }) => certCell(2, row)
    },
    {
      id: "cert3",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Сертификат (модуль 3)</span>
          <select
            className="w-full max-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "yes") applyCertToAll(3, true);
              if (v === "no") applyCertToAll(3, false);
              e.target.value = "";
            }}
          >
            <option value="">Применить ко всем</option>
            <option value="yes">Есть</option>
            <option value="no">Нет</option>
          </select>
        </div>
      ),
      cell: ({ row }) => certCell(3, row)
    },
    {
      id: "cert4",
      header: () => (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">Сертификат (модуль 4)</span>
          <select
            className="w-full max-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "yes") applyCertToAll(4, true);
              if (v === "no") applyCertToAll(4, false);
              e.target.value = "";
            }}
          >
            <option value="">Применить ко всем</option>
            <option value="yes">Есть</option>
            <option value="no">Нет</option>
          </select>
        </div>
      ),
      cell: ({ row }) => certCell(4, row)
    }
  ];

  // Excel import
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  async function handleImport() {
    if (!file) {
      setError("Выберите файл Excel для импорта");
      return;
    }
    if (session?.user?.role === "ADMIN" && !importRegionId) {
      setError("Выберите регион для импорта");
      return;
    }
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("profession", importProfession);
      formData.append("mode", importMode);
      if (session?.user?.role === "ADMIN") formData.append("regionId", importRegionId);

      const res = await fetch("/api/candidates/import", {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Ошибка импорта");
      }
      setImportResult(json);
      setInfo(
        importMode === "add"
          ? `Импорт завершён: добавлено ${json.imported}, пропущено ${json.skipped}`
          : `Перезапись завершена: обработано ${json.imported} записей`
      );
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Кандидаты</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {session?.user?.role === "ADMIN" && regions.length > 0 && (
              <select
                value={importRegionId}
                onChange={(e) => setImportRegionId(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-slate-700"
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-1.5">
              <span className="text-slate-600">Режим:</span>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as "add" | "overwrite")}
                className="rounded border border-slate-300 px-2 py-1.5"
              >
                <option value="add">Добавить в свободные</option>
                <option value="overwrite">Перезаписать список</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-slate-600">Кого:</span>
              <select
                value={importProfession}
                onChange={(e) => setImportProfession(e.target.value as "DOCTOR" | "NURSE")}
                className="rounded border border-slate-300 px-2 py-1.5"
              >
                <option value="DOCTOR">Врачи</option>
                <option value="NURSE">Медсёстры</option>
              </select>
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <button
              onClick={handleImport}
              disabled={importing || !file}
              className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {importing ? "Импорт…" : "Импорт из Excel"}
            </button>
          </div>
        </div>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setProfession("DOCTOR")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              profession === "DOCTOR"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Врачи
          </button>
          <button
            type="button"
            onClick={() => setProfession("NURSE")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              profession === "NURSE"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Медсёстры
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          Заполняйте свободные строки (<b>VACANT</b>). Сертификат 1 доступен всем; сертификаты 2–4 появляются после
          сдачи предыдущего модуля (статус «Сдал» выставляет админ на странице Модули).
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Импорт Excel: шаблон файла — одна колонка <b>ФИО</b>. Выберите режим «Добавить в свободные» или «Перезаписать список»
          и профессию (Врачи / Медсёстры). В шапке колонок сертификатов можно применить «Есть» или «Нет» ко всем строкам.
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}

      {loading && <p className="text-sm text-slate-600">Загрузка...</p>}

      {!loading && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">
            {profession === "DOCTOR" ? "Список врачей" : "Список медсестёр"}
          </h2>
          <DataTable columns={columns} data={filteredData} />
        </section>
      )}

      {importResult && (
        <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
          <div>
            Импортировано: <b>{importResult.imported}</b>, пропущено: <b>{importResult.skipped}</b>
            {importResult.vacanciesCount !== undefined && (
              <span className="ml-2 text-slate-500">(свободных слотов было: {importResult.vacanciesCount})</span>
            )}
          </div>
          {importResult.message && (
            <p className="mt-2 text-amber-700">{importResult.message}</p>
          )}
          {importResult.reasons?.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Причины пропуска</summary>
              <ul className="mt-1 list-disc pl-5">
                {importResult.reasons.map((r: any, idx: number) => (
                  <li key={idx}>
                    Строка {r.rowIndex}: {r.reason} {r.pinfl && `(PINFL: ${r.pinfl})`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {noteModal && (
        <NoteModalPanel
          candidateName={noteModal.candidateName}
          moduleNum={noteModal.moduleNum}
          initialNote={noteModal.initialNote}
          onSave={async (text) => {
            const certKey = `cert${noteModal.moduleNum}` as keyof CandidateRow;
            const noteKey = `cert${noteModal.moduleNum}Note` as keyof CandidateRow;
            try {
              await updateCandidate(noteModal.candidateId, {
                [certKey]: false,
                [noteKey]: text || null
              } as Partial<CandidateRow>);
              setNoteModal(null);
            } catch (err: any) {
              setError(err.message);
            }
          }}
          onClose={() => setNoteModal(null)}
        />
      )}
    </div>
  );
}

function NoteModalPanel({
  candidateName,
  moduleNum,
  initialNote,
  onSave,
  onClose
}: {
  candidateName: string;
  moduleNum: number;
  initialNote: string;
  onSave: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-800">
          Примечание — почему нет сертификата (модуль {moduleNum})
        </h3>
        <p className="mt-1 text-xs text-slate-500">{candidateName}</p>
        <textarea
          className="mt-3 min-h-[120px] w-full rounded border border-slate-300 p-3 text-sm"
          placeholder="Укажите причину отсутствия сертификата..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              await onSave(text);
              setSaving(false);
            }}
            disabled={saving}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

