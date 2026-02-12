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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5 shadow-md">
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 text-xs font-medium text-blue-800 shadow-sm">
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
            className="w-64 rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("regions.brigadeCount")}</label>
          <input
            type="number"
            min={1}
            value={brigadeCount}
            onChange={(e) => setBrigadeCount(Number(e.target.value) || 1)}
            className="w-32 rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-md border-2 border-slate-900 bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 hover:border-slate-800 disabled:opacity-60 transition-colors shadow-md"
        >
          {loading ? t("regions.creating") : t("regions.createRegion")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}

