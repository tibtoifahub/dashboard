"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export function RegionCreateForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [brigadeCount, setBrigadeCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(t("regions.enterRegionName"));
      return;
    }
    if (brigadeCount <= 0) {
      setError(t("regions.brigadeCountMustBePositive"));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), brigadeCount })
      });
      
      const json = await res.json().catch(() => null);
      
      if (!res.ok) {
        const errorMessage = json?.error || t("regions.errorCreating");
        // Проверяем на дубликат имени региона
        if (res.status === 409) {
          setError(t("regions.duplicateName") || errorMessage);
        } else {
          setError(errorMessage);
        }
        return;
      }
      
      setSuccess(`${t("regions.regionCreated")}: ${brigadeCount} ${t("regions.brigades").toLowerCase()}`);
      setName("");
      setBrigadeCount(1);
      
      // Обновляем страницу через небольшую задержку для лучшего UX
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (err: any) {
      console.error("Error creating region:", err);
      setError(err.message ?? t("regions.errorCreating"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
        {t("regions.autoSlotsInfo")} <b>{brigadeCount}</b> {t("candidates.doctors")} {t("common.and")}{" "}
        <b>{brigadeCount * 4}</b> {t("candidates.nurses")}.
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("regions.regionName")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("regions.brigadeCount")}</label>
          <input
            type="number"
            min={1}
            value={brigadeCount}
            onChange={(e) => setBrigadeCount(Number(e.target.value) || 1)}
            className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? t("regions.creating") : t("regions.createRegion")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}

