"use client";

import { Fragment, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

type ModuleStatusBucket = {
  PASSED: number;
  FAILED: number;
  NO_SHOW_1: number;
  NO_SHOW_2: number;
};

type SummaryResponse = {
  global: {
    totalSlots: number;
    filled: number;
    vacant: number;
    doctorsFilled: number;
    nursesFilled: number;
    cert1Count: number;
    cert2Count: number;
    cert3Count: number;
    cert4Count: number;
    module1Passed: number;
    module2Passed: number;
    module3Passed: number;
    module4Passed: number;
    moduleStatus: Record<1 | 2 | 3 | 4, ModuleStatusBucket>;
  };
  funnel: { step: string; count: number }[];
  regions: Array<{
    id: number;
    name: string;
    totalSlots: number;
    filled: number;
    vacant: number;
    doctorsFilled: number;
    nursesFilled: number;
    cert1: number;
    cert2: number;
    cert3: number;
    cert4: number;
    modules: Record<1 | 2 | 3 | 4, ModuleStatusBucket>;
    module1Passed: number;
    module4Passed: number;
  }>;
  professions: {
    DOCTOR: { total: number; cert1: number; module1Passed: number; module4Passed: number };
    NURSE: { total: number; cert1: number; module1Passed: number; module4Passed: number };
  };
  problemRegions: {
    noShow: Array<{ regionId: number; regionName: string; totalNoShow: number }>;
    failed: Array<{ regionId: number; regionName: string; totalFailed: number }>;
    vacant: Array<{ regionId: number; regionName: string; vacant: number }>;
  };
};

interface Props {
  role: "ADMIN" | "REGION";
}

export function StatisticsDashboard({ role }: Props) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionSort, setRegionSort] = useState<{ key: string; dir: "asc" | "desc" }>({
    key: "name",
    dir: "asc"
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/statistics/summary");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? "Ошибка загрузки статистики");
        }
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e.message ?? "Ошибка загрузки статистики");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <p className="text-sm text-slate-600">Загрузка статистики...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { global, funnel, regions, professions, problemRegions } = data;

  const cert1Pct = global.totalSlots ? (global.cert1Count / global.totalSlots) * 100 : 0;
  const module4PassedPct = global.totalSlots ? (global.module4Passed / global.totalSlots) * 100 : 0;

  const funnelChartData = funnel.map((step) => ({
    label:
      step.step === "cert1"
        ? "Сертификат 1"
        : step.step === "module1"
          ? "Модуль 1"
          : step.step === "module2"
            ? "Модуль 2"
            : step.step === "module3"
              ? "Модуль 3"
              : "Модуль 4",
    value: step.count
  }));

  const statusLabels: Record<string, string> = {
    PASSED: "Сдал",
    FAILED: "Не сдал",
    NO_SHOW_1: "Не пришёл 1 раз",
    NO_SHOW_2: "Не пришёл 2 раз"
  };

  const moduleStatusData = (mod: 1 | 2 | 3 | 4) => {
    const b = global.moduleStatus[mod];
    return [
      { status: statusLabels.PASSED, value: b.PASSED },
      { status: statusLabels.FAILED, value: b.FAILED },
      { status: statusLabels.NO_SHOW_1, value: b.NO_SHOW_1 },
      { status: statusLabels.NO_SHOW_2, value: b.NO_SHOW_2 }
    ];
  };

  const regionTableSorted = [...regions].sort((a, b) => {
    const { key, dir } = regionSort;
    const mul = dir === "asc" ? 1 : -1;
    if (key === "name") {
      return a.name.localeCompare(b.name) * mul;
    }
    const av = (a as any)[key];
    const bv = (b as any)[key];
    return ((av ?? 0) - (bv ?? 0)) * mul;
  });

  const toggleRegionSort = (key: string) => {
    setRegionSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const doctor = professions.DOCTOR;
  const nurse = professions.NURSE;
  const profChartData = [
    {
      metric: "Сертификат 1, %",
      DOCTOR: doctor.total ? (doctor.cert1 / doctor.total) * 100 : 0,
      NURSE: nurse.total ? (nurse.cert1 / nurse.total) * 100 : 0
    },
    {
      metric: "Модуль 4 сдали, %",
      DOCTOR: doctor.total ? (doctor.module4Passed / doctor.total) * 100 : 0,
      NURSE: nurse.total ? (nurse.module4Passed / nurse.total) * 100 : 0
    }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Статистика и аналитика</h1>
        <a
          href="/api/statistics/export"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Экспорт в Excel
        </a>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        {role === "ADMIN" ? (
          <p>
            Показаны агрегированные показатели по всем регионам. Экспорт выгружает полный аналитический отчёт (KPI,
            регионы, модули, профессии, вакансии).
          </p>
        ) : (
          <p>
            Показаны показатели только по вашему региону. Экспорт содержит только данные вашего региона.
          </p>
        )}
      </section>

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Всего мест</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{global.totalSlots}</div>
          <p className="mt-1 text-xs text-slate-500">
            Общее количество мест (врач + 4 медсестры на каждую бригаду).
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Заполнено</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{global.filled}</div>
          <p className="mt-1 text-xs text-slate-500">
            Места с указанным ФИО и ПИНФЛ (кандидат назначен).
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Вакантно</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{global.vacant}</div>
          <p className="mt-1 text-xs text-slate-500">
            Свободные места без назначенного кандидата.
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Врачи</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{global.doctorsFilled}</div>
          <p className="mt-1 text-xs text-slate-500">
            Заполненные места по профессии «Врач».
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Медсёстры</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">{global.nursesFilled}</div>
          <p className="mt-1 text-xs text-slate-500">
            Заполненные места по профессии «Медсестра».
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase text-slate-500">Сертификат 1 и Модуль 4</div>
          <div className="mt-1 text-sm">
            <span className="font-semibold text-slate-900">{cert1Pct.toFixed(1)}%</span>{" "}
            <span className="text-xs text-slate-500">— имеют сертификат 1-го модуля</span>
          </div>
          <div className="mt-1 text-sm">
            <span className="font-semibold text-slate-900">{module4PassedPct.toFixed(1)}%</span>{" "}
            <span className="text-xs text-slate-500">— сдали экзамен по 4-му модулю</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Доля от общего числа мест.
          </p>
        </div>
      </section>

      {/* Region table — поднято над диаграммами */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Регионы</h2>
        <p className="mb-3 text-xs text-slate-500">
          Подробная статистика по каждому региону: всего мест, вакансии, сертификат 1 (есть/нет), результаты экзаменов по модулям 1–4. Нажмите на заголовок для сортировки по основным колонкам.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th rowSpan={2} className="border-r border-slate-200 px-3 py-2 align-middle font-medium normal-case">
                  <button type="button" onClick={() => toggleRegionSort("name")}>Регион</button>
                </th>
                <th rowSpan={2} className="border-r border-slate-200 px-3 py-2 align-middle font-medium normal-case">
                  <button type="button" onClick={() => toggleRegionSort("totalSlots")}>Всего мест</button>
                </th>
                <th rowSpan={2} className="border-r-2 border-slate-300 px-3 py-2 align-middle font-medium normal-case">
                  <button type="button" onClick={() => toggleRegionSort("vacant")}>Вакантно</button>
                </th>
                {[1, 2, 3, 4].map((n) => (
                  <Fragment key={`group-${n}`}>
                    <th colSpan={2} className="border-r-2 border-slate-300 px-2 py-1.5 text-center font-medium normal-case">
                      Сертификат {n}
                    </th>
                    <th colSpan={4} className={n < 4 ? "border-r-2 border-slate-300 px-2 py-1.5 text-center font-medium normal-case" : "border-r border-slate-200 px-2 py-1.5 text-center font-medium normal-case"}>
                      Модуль {n}
                    </th>
                  </Fragment>
                ))}
              </tr>
              <tr>
                {[1, 2, 3, 4].map((n) => (
                  <Fragment key={`row2-${n}`}>
                    <th className="border-r border-slate-200 px-2 py-1.5 font-medium normal-case">
                      {n === 1 ? <button type="button" onClick={() => toggleRegionSort("cert1")}>есть</button> : "есть"}
                    </th>
                    <th className="border-r-2 border-slate-300 px-2 py-1.5 font-medium normal-case">нет</th>
                    <th className="border-r border-slate-200 px-2 py-1.5 font-medium normal-case">Сдал</th>
                    <th className="border-r border-slate-200 px-2 py-1.5 font-medium normal-case">Не сдал</th>
                    <th className="border-r border-slate-200 px-2 py-1.5 font-medium normal-case">Неявка 1 раз</th>
                    <th className="border-r-2 border-slate-300 px-2 py-1.5 font-medium normal-case">Неявка 2 раза</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {regionTableSorted.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="whitespace-nowrap border-r border-slate-200 px-3 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="border-r border-slate-200 px-3 py-2 text-right tabular-nums">{r.totalSlots}</td>
                  <td className="border-r-2 border-slate-300 px-3 py-2 text-right tabular-nums">{r.vacant}</td>
                  {([1, 2, 3, 4] as const).map((n) => {
                    const certKey = `cert${n}` as keyof typeof r;
                    const certVal = Number(r[certKey] ?? 0);
                    return (
                      <Fragment key={`group-${n}`}>
                        <td className="border-r border-slate-200 px-3 py-2 text-right tabular-nums">{certVal}</td>
                        <td className="border-r-2 border-slate-300 px-3 py-2 text-right tabular-nums">{r.totalSlots - certVal}</td>
                        <td className="border-r border-slate-200 px-2 py-2 text-right tabular-nums">{r.modules[n].PASSED}</td>
                        <td className="border-r border-slate-200 px-2 py-2 text-right tabular-nums">{r.modules[n].FAILED}</td>
                        <td className="border-r border-slate-200 px-2 py-2 text-right tabular-nums">{r.modules[n].NO_SHOW_1}</td>
                        <td className="border-r-2 border-slate-300 px-2 py-2 text-right tabular-nums">{r.modules[n].NO_SHOW_2}</td>
                      </Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Problem regions — поднято над диаграммами */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Топ-5 по неявкам</h2>
          <p className="mb-2 text-xs text-slate-500">
            Регионы с наибольшим числом неявок на экзамен (1 и 2 раз по всем модулям).
          </p>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1">Регион</th>
                <th className="px-2 py-1 text-right">Неявки</th>
              </tr>
            </thead>
            <tbody>
              {problemRegions.noShow.map((r) => (
                <tr key={r.regionId} className="border-t border-slate-100">
                  <td className="px-2 py-1">{r.regionName}</td>
                  <td className="px-2 py-1 text-right">{r.totalNoShow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Топ-5 по несданным</h2>
          <p className="mb-2 text-xs text-slate-500">
            Регионы с наибольшим числом результатов «Не сдал» по всем модулям.
          </p>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1">Регион</th>
                <th className="px-2 py-1 text-right">Не сдали</th>
              </tr>
            </thead>
            <tbody>
              {problemRegions.failed.map((r) => (
                <tr key={r.regionId} className="border-t border-slate-100">
                  <td className="px-2 py-1">{r.regionName}</td>
                  <td className="px-2 py-1 text-right">{r.totalFailed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Топ-5 по вакансиям</h2>
          <p className="mb-2 text-xs text-slate-500">
            Регионы с наибольшим числом свободных (незаполненных) мест.
          </p>
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-2 py-1">Регион</th>
                <th className="px-2 py-1 text-right">Вакантно</th>
              </tr>
            </thead>
            <tbody>
              {problemRegions.vacant.map((r) => (
                <tr key={r.regionId} className="border-t border-slate-100">
                  <td className="px-2 py-1">{r.regionName}</td>
                  <td className="px-2 py-1 text-right">{r.vacant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Funnel */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Воронка сертификации и модулей</h2>
          <p className="mb-3 text-xs text-slate-500">
            Последовательность: сертификат 1 → сдали модуль 1 → … → сдали модуль 4. Число кандидатов на каждом шаге.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelChartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profession comparison */}
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Сравнение по профессиям</h2>
          <p className="mb-3 text-xs text-slate-500">
            Доля врачей и медсестёр с сертификатом 1 и сдавших модуль 4 (в % от своей профессии).
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profChartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="metric" />
                <YAxis unit="%" />
                <Tooltip />
                <Legend />
                <Bar dataKey="DOCTOR" name="Врачи" fill="#0f172a" />
                <Bar dataKey="NURSE" name="Медсёстры" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Module status charts */}
      <section className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Статусы экзаменов по модулям</h2>
        <p className="mb-3 text-xs text-slate-500">
          Распределение результатов экзамена по каждому модулю: сдал, не сдал, не пришёл 1 раз, не пришёл 2 раза.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((m) => (
            <div key={m} className="h-64 rounded border border-slate-100 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-600">Модуль {m}</div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleStatusData(m as 1 | 2 | 3 | 4)} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

