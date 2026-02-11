"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function RegionCreateForm() {
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
      setError("Введите название региона");
      return;
    }
    if (brigadeCount <= 0) {
      setError("Количество бригад должно быть больше нуля");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), brigadeCount })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Ошибка создания региона");
      }
      setSuccess(`Регион "${json.name}" создан с ${brigadeCount} бригадами`);
      setName("");
      setBrigadeCount(1);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Ошибка создания региона");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-800">
        При создании региона система автоматически добавляет слоты: <b>{brigadeCount}</b> врачей и{" "}
        <b>{brigadeCount * 4}</b> медсестёр.
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Название региона</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Количество бригад</label>
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
          {loading ? "Создание..." : "Создать регион"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}

