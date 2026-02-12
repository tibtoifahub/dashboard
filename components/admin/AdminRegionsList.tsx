"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

type Region = {
  id: number;
  name: string;
  brigades?: { id: number }[];
  candidates?: unknown[];
};

interface Props {
  regions: Region[];
}

export function AdminRegionsList({ regions }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBrigadeCount, setEditBrigadeCount] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  async function handleSaveBrigadeCount(id: number) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/regions?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brigadeCount: editBrigadeCount })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("common.error"));
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/regions?id=${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? t("common.error"));
        return;
      }
      setConfirmId(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Ошибка удаления");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border-2 border-slate-200 bg-white shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">{t("admin.region")}</th>
              <th className="px-4 py-3">{t("admin.brigades")}</th>
              <th className="px-4 py-3">{t("common.filter")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {regions.map((r, idx) => {
            const brigadeCount = r.brigades?.length ?? 0;
            const isEditing = editingId === r.id;
            return (
              <tr 
                key={r.id} 
                className={`border-t border-slate-100 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                } hover:bg-red-50 hover:shadow-sm`}
              >
                <td className="px-4 py-3">{r.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3">
                  {isEditing ? (
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={editBrigadeCount}
                        onChange={(e) => setEditBrigadeCount(Number(e.target.value) || 1)}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveBrigadeCount(r.id)}
                        disabled={saving}
                        className="rounded-md border-2 border-slate-800 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 hover:border-slate-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? t("common.loading") : t("admin.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setError(null); }}
                        disabled={saving}
                        className="rounded-md border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                      >
                        {t("common.cancel")}
                      </button>
                    </span>
                  ) : (
                    brigadeCount
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(r.id);
                          setEditBrigadeCount(brigadeCount || 1);
                          setError(null);
                        }}
                        className="rounded-md border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                      >
                        {t("admin.changeBrigades")}
                      </button>
                    )}
                    {confirmId === r.id ? (
                      <>
                        <span className="text-xs text-slate-600">{t("admin.confirmDelete")}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId !== null}
                          className="rounded-md border-2 border-red-600 bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 hover:border-red-700 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === r.id ? t("common.loading") : t("common.yes")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          disabled={deletingId !== null}
                          className="rounded-md border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                        >
                          {t("common.no")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(r.id)}
                        className="rounded-md border-2 border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 hover:border-red-400 transition-colors"
                      >
                        {t("admin.delete")}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {t("admin.brigadeChangeInfo")}
      </p>
    </div>
  );
}
