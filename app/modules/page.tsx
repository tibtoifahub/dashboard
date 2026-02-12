"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
      if (!res.ok) throw new Error(t("modules.loadingError"));
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
      setError(e.message ?? t("modules.loadingError"));
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
      throw new Error(json?.error ?? t("modules.saveError"));
    }
    setInfo(t("modules.resultSaved"));
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
      throw new Error(json?.error ?? t("modules.certUpdateError"));
    }
    setInfo(t("modules.certUpdated"));
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
      throw new Error(json?.error ?? t("modules.certUpdateError"));
    }
    setInfo(t("modules.certUpdated"));
    await load(moduleNumber);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{t("modules.title")}</h1>
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((m) => (
            <button
              key={m}
              onClick={() => setModuleNumber(m as any)}
              className={`rounded px-3 py-1.5 ${
                moduleNumber === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {t("modules.module")} {m}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          {t("modules.moduleInfo")}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          {t("modules.regionCanChange")}
        </p>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      {loading && <p className="text-sm text-slate-600">{t("modules.loading")}</p>}

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                <div className="flex flex-col gap-1.5">
                  <span>{t("modules.region")}</span>
                  <select
                    value={filterRegion}
                    onChange={(e) => setFilterRegion(e.target.value)}
                    className="max-w-[180px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700"
                  >
                    <option value="">{t("modules.allRegions")}</option>
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
                  <span>{t("candidates.fio")}</span>
                  <input
                    type="text"
                    placeholder={t("modules.searchFio")}
                    value={filterFio}
                    onChange={(e) => setFilterFio(e.target.value)}
                    className="min-w-[120px] max-w-[200px] rounded border border-slate-300 px-2 py-1 text-xs font-normal text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">{t("candidates.profession")}</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">{t("modules.status")}</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">{t("candidates.addNote")}</th>
              {moduleNumber < 4 && (
                <>
                  <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                    {t(`candidates.cert${moduleNumber + 1}`)}
                  </th>
                  <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">
                    {t("candidates.addNote")} ({t("modules.module")} {moduleNumber + 1})
                  </th>
                </>
              )}
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">{t("modules.status")}</th>
              <th className="min-h-[44px] px-3 py-2.5 text-left font-medium">{t("modules.setStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2 align-top">{c.regionName}</td>
                <td className="px-3 py-2 align-top">{c.fullName}</td>
                <td className="px-3 py-2 align-top">{c.profession === "DOCTOR" ? t("candidates.doctors") : t("candidates.nurses")}</td>
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
                    <option value="yes">{t("candidates.has")}</option>
                    <option value="no">{t("candidates.no")}</option>
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  {!c.certValue ? (
                    <textarea
                      className="min-h-[40px] w-full min-w-[120px] rounded border border-slate-300 px-2 py-1 text-xs"
                      defaultValue={c.certNote ?? ""}
                      placeholder={t("candidates.addNote")}
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
                          placeholder={t("candidates.addNote")}
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
                          PASSED: t("modules.passed"),
                          FAILED: t("modules.failed"),
                          NO_SHOW_1: t("modules.noShow1"),
                          NO_SHOW_2: t("modules.noShow2")
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
                      <option value="">{t("common.filter")}...</option>
                      <option value="PASSED">{t("modules.passed")}</option>
                      <option value="FAILED">{t("modules.failed")}</option>
                      <option value="NO_SHOW_1">{t("modules.noShow1")}</option>
                      <option value="NO_SHOW_2">{t("modules.noShow2")}</option>
                    </select>
                  ) : session?.user?.role === "ADMIN" && !c.certValue ? (
                    <span className="text-xs text-slate-500">{t("candidates.addNote")}</span>
                  ) : session?.user?.role === "ADMIN" && !c.eligible ? (
                    <span className="text-xs text-slate-500">{t("modules.notEligible")}</span>
                  ) : session?.user?.role !== "ADMIN" ? (
                    <span className="text-xs text-slate-500">{t("modules.adminOnly")}</span>
                  ) : null}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && !loading && (
              <tr>
                <td className="px-3 py-4 text-center text-sm text-slate-500" colSpan={moduleNumber < 4 ? 9 : 7}>
                  {t("modules.noCandidates")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

