"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ModuleCandidate {
  id: number;
  fullName: string;
  pinfl: string;
  profession: "DOCTOR" | "NURSE";
  regionName: string;
  latestStatus?: string | null;
  attemptNumber?: number | null;
  certValue: boolean;
  certNote?: string | null;
  eligible: boolean;
  nextCertValue?: boolean;
  nextCertNote?: string | null;
}

export default function ModulesPage() {
  const { data: session } = useSession();
  const [moduleNumber, setModuleNumber] = useState<1 | 2 | 3 | 4>(1);
  const [data, setData] = useState<ModuleCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterFio, setFilterFio] = useState("");

  async function load(mod: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules?moduleNumber=${mod}`);
      if (!res.ok) throw new Error("Ошибка загрузки модулей");
      const json = await res.json();
      const mapped: ModuleCandidate[] = json.map((c: any) => {
        const certKey =
          mod === 1 ? "cert1" : mod === 2 ? "cert2" : mod === 3 ? "cert3" : ("cert4" as const);
        const noteKey =
          mod === 1 ? "cert1Note" : mod === 2 ? "cert2Note" : mod === 3 ? "cert3Note" : ("cert4Note" as const);
        const resultsForMod = (c.moduleResults || []).filter((r: any) => r.moduleNumber === mod);
        const latest = resultsForMod.sort(
          (a: any, b: any) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0)
        )[0];
        const nextCertKey = mod < 4 ? `cert${mod + 1}` : null;
        const nextNoteKey = mod < 4 ? `cert${mod + 1}Note` : null;

        return {
          id: c.id,
          fullName: c.fullName,
          pinfl: c.pinfl,
          profession: c.profession,
          regionName: c.region?.name ?? "",
          latestStatus: latest?.status ?? null,
          attemptNumber: latest?.attemptNumber ?? null,
          certValue: Boolean(c[certKey]),
          certNote: c[noteKey] ?? null,
          eligible: Boolean(c.eligible),
          nextCertValue: nextCertKey != null ? Boolean(c[nextCertKey]) : undefined,
          nextCertNote: nextNoteKey != null ? (c[nextNoteKey] ?? null) : undefined
        };
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
    load(moduleNumber);
  }, [moduleNumber]);

  const regionOptions = [...new Set(data.map((c) => c.regionName))].filter(Boolean).sort() as string[];
  const filteredData = data.filter(
    (c) =>
      (!filterRegion || c.regionName === filterRegion) &&
      (!filterFio.trim() || (c.fullName || "").toLowerCase().includes(filterFio.trim().toLowerCase()))
  );

  async function updateStatus(candidateId: number, status: string) {
    const res = await fetch("/api/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, moduleNumber, status })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error ?? "Ошибка сохранения результата модуля");
    }
    setInfo("Результат модуля сохранен");
    await load(moduleNumber);
  }

  async function updateCertificate(candidateId: number, value: boolean, note?: string) {
    const field =
      moduleNumber === 1 ? "cert1" : moduleNumber === 2 ? "cert2" : moduleNumber === 3 ? "cert3" : "cert4";
    const noteField =
      moduleNumber === 1 ? "cert1Note" : moduleNumber === 2 ? "cert2Note" : moduleNumber === 3 ? "cert3Note" : "cert4Note";

    const res = await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, data: { [field]: value, [noteField]: note ?? null } })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error ?? "Ошибка обновления сертификата");
    }
    setInfo("Информация по сертификату обновлена");
    await load(moduleNumber);
  }

  async function updateCertificateForModule(
    candidateId: number,
    targetMod: number,
    value: boolean,
    note?: string
  ) {
    const field = `cert${targetMod}` as const;
    const noteField = `cert${targetMod}Note` as const;
    const res = await fetch("/api/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, data: { [field]: value, [noteField]: note ?? null } })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error ?? "Ошибка обновления сертификата");
    }
    setInfo("Информация по сертификату обновлена");
    await load(moduleNumber);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Модули</h1>
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((m) => (
            <button
              key={m}
              onClick={() => setModuleNumber(m as any)}
              className={`rounded px-3 py-1.5 ${
                moduleNumber === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              Модуль {m}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          Модуль 1: показываются только кандидаты с сертификатом 1-го модуля. На вкладке можно заранее указать
          сертификат 2-го модуля (есть/нет), но в списке «Модуль 2» кандидат появится только после статуса «Сдал» по
          модулю 1. Модули 2–4: показываются только те, кто сдал предыдущий модуль.
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Регион может менять статусы сертификатов; результат экзамена выставляет только администратор.
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      {loading && <p className="text-sm text-slate-600">Загрузка...</p>}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                <div className="flex flex-col gap-1.5">
                  <span>Регион</span>
                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="max-w-[180px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
                  >
                    <option value="">Все регионы</option>
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                <div className="flex flex-col gap-1.5">
                  <span>ФИО</span>
                  <input
                    type="text"
                    placeholder="Поиск по ФИО..."
                    value={filterFio}
                    onChange={(e) => setFilterFio(e.target.value)}
                    className="min-w-[120px] max-w-[200px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">Профессия</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">Сертификат</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">Примечание (если нет)</th>
              {moduleNumber < 4 && (
                <>
                  <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                    Сертификат (модуль {moduleNumber + 1})
                  </th>
                  <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                    Примечание (мод {moduleNumber + 1})
                  </th>
                </>
              )}
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">Статус экзамена</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">Установить статус экзамена</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top">{c.regionName}</td>
                <td className="px-3 py-2 align-top">{c.fullName}</td>
                <td className="px-3 py-2 align-top">{c.profession === "DOCTOR" ? "Врач" : "Медсестра"}</td>
                <td className="px-3 py-2 align-top">
                  <select
                    value={c.certValue ? "yes" : "no"}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    disabled={session?.user?.role !== "ADMIN"}
                    onChange={async (e) => {
                      if (session?.user?.role !== "ADMIN") return;
                      const value = e.target.value === "yes";
                      try {
                        await updateCertificate(c.id, value, value ? undefined : (c.certNote ?? undefined));
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                  >
                    <option value="yes">Есть</option>
                    <option value="no">Нет</option>
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  {!c.certValue ? (
                    <textarea
                      className="min-h-[40px] w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs"
                      defaultValue={c.certNote ?? ""}
                      placeholder="Почему нет"
                      disabled={session?.user?.role !== "ADMIN"}
                      onBlur={async (e) => {
                        if (session?.user?.role !== "ADMIN") return;
                        const note = (e.target as HTMLTextAreaElement).value || "";
                        if (note === (c.certNote ?? "")) return;
                        try {
                          await updateCertificate(c.id, c.certValue, note);
                        } catch (err: any) {
                          setError(err.message);
                          (e.target as HTMLTextAreaElement).value = c.certNote ?? "";
                        }
                      }}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                {moduleNumber < 4 && (
                  <>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={c.nextCertValue ? "yes" : "no"}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        disabled={session?.user?.role !== "ADMIN"}
                        onChange={async (e) => {
                          if (session?.user?.role !== "ADMIN") return;
                          const value = e.target.value === "yes";
                          try {
                            await updateCertificateForModule(c.id, moduleNumber + 1, value);
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                      >
                        <option value="yes">Есть</option>
                        <option value="no">Нет</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {!c.nextCertValue ? (
                        <textarea
                          className="min-h-[40px] w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs"
                          defaultValue={c.nextCertNote ?? ""}
                          placeholder="Почему нет"
                          disabled={session?.user?.role !== "ADMIN"}
                          onBlur={async (e) => {
                            if (session?.user?.role !== "ADMIN") return;
                            const note = (e.target as HTMLTextAreaElement).value || "";
                            if (note === (c.nextCertNote ?? "")) return;
                            try {
                              await updateCertificateForModule(c.id, moduleNumber + 1, c.nextCertValue ?? false, note);
                            } catch (err: any) {
                              setError(err.message);
                              (e.target as HTMLTextAreaElement).value = c.nextCertNote ?? "";
                            }
                          }}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-3 py-2 align-top">
                  {c.latestStatus
                    ? (
                        {
                          PASSED: "Сдал",
                          FAILED: "Не сдал",
                          NO_SHOW_1: "Не пришёл 1 раз",
                          NO_SHOW_2: "Не пришёл 2 раз"
                        } as Record<string, string>
                      )[c.latestStatus] ?? c.latestStatus
                    : "—"}
                </td>
                <td className="px-3 py-2 align-top">
                  {session?.user?.role === "ADMIN" && c.certValue && c.eligible ? (
                    <select
                      defaultValue=""
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      onChange={async (e) => {
                        const value = e.target.value;
                        if (!value) return;
                        try {
                          await updateStatus(c.id, value);
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Выбрать...</option>
                      <option value="PASSED">Сдал</option>
                      <option value="FAILED">Не сдал</option>
                      <option value="NO_SHOW_1">Не пришёл 1 раз</option>
                      <option value="NO_SHOW_2">Не пришёл 2 раз</option>
                    </select>
                  ) : session?.user?.role === "ADMIN" && !c.certValue ? (
                    <span className="text-xs text-slate-500">Сначала укажите сертификат «Есть»</span>
                  ) : session?.user?.role === "ADMIN" && !c.eligible ? (
                    <span className="text-xs text-slate-500">Не допущен (пред. модуль или сертификат)</span>
                  ) : session?.user?.role !== "ADMIN" ? (
                    <span className="text-xs text-slate-500">Только админ</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={moduleNumber < 4 ? 9 : 7}>
                  Нет кандидатов для этого модуля
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

