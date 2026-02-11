"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Region {
  id: number;
  name: string;
}

interface Props {
  regions: Region[];
}

export function AdminCreateUserForm({ regions }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [regionId, setRegionId] = useState<number | "">("");
  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionBrigades, setNewRegionBrigades] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!login.trim() || !password.trim()) {
      setError("Введите логин и пароль");
      return;
    }

    if (mode === "existing" && !regionId) {
      setError("Выберите регион");
      return;
    }

    if (mode === "new") {
      if (!newRegionName.trim()) {
        setError("Введите название нового региона");
        return;
      }
      if (!newRegionBrigades || newRegionBrigades <= 0) {
        setError("Количество бригад должно быть больше нуля");
        return;
      }
    }

    setLoading(true);
    try {
      let targetRegionId: number;

      if (mode === "existing") {
        targetRegionId = Number(regionId);
      } else {
        // Сначала создаём новый регион с нужным количеством бригад
        const resRegion = await fetch("/api/regions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newRegionName.trim(),
            brigadeCount: newRegionBrigades
          })
        });
        const jsonRegion = await resRegion.json().catch(() => null);
        if (!resRegion.ok) {
          throw new Error(jsonRegion?.error ?? "Ошибка создания региона");
        }
        targetRegionId = jsonRegion.id;
      }

      // Затем создаём пользователя региона
      const resUser = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim(),
          password: password.trim(),
          regionId: targetRegionId
        })
      });
      const jsonUser = await resUser.json().catch(() => null);
      if (!resUser.ok) {
        const message = jsonUser?.error === "Login already in use" ? "Такой логин уже существует" : jsonUser?.error;
        throw new Error(message ?? "Ошибка создания пользователя");
      }
      const regionName =
        (jsonUser.region && jsonUser.region.name) || newRegionName || "регион";

      setSuccess(
        `Пользователь "${jsonUser.login}" создан для региона "${regionName}"`
      );
      setLogin("");
      setPassword("");
      setRegionId("");
      setNewRegionName("");
      setNewRegionBrigades(1);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Ошибка создания пользователя");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          Роль пользователя всегда <b>REGION</b>. Такой пользователь видит и редактирует кандидатов только своего
          региона.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Логин</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Режим</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "existing" | "new")}
            className="w-48 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="existing">Существующий регион</option>
            <option value="new">Новый регион</option>
          </select>
        </div>
        {mode === "existing" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Регион</label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : "")}
              className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Выберите регион</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "new" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Новый регион</label>
              <input
                type="text"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Мед. бригад</label>
              <input
                type="number"
                min={1}
                value={newRegionBrigades}
                onChange={(e) => setNewRegionBrigades(Number(e.target.value) || 1)}
                className="w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Создание..." : "Создать пользователя"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}

