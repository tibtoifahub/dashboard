"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  login: string;
  role: string;
  regionId: number | null;
  region: { id: number; name: string } | null;
};

interface Props {
  users: User[];
}

export function AdminUserTable({ users }: Props) {
  const router = useRouter();
  const [editUser, setEditUser] = useState<User | null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(u: User) {
    setEditUser(u);
    setLogin(u.login);
    setPassword("");
    setError(null);
  }

  function closeEdit() {
    setEditUser(null);
    setLogin("");
    setPassword("");
    setError(null);
  }

  async function handleSave() {
    if (!editUser) return;
    if (!login.trim()) {
      setError("Введите логин");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: { id: number; login: string; password?: string } = {
        id: editUser.id,
        login: login.trim()
      };
      if (password.trim()) body.password = password.trim();

      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Ошибка сохранения");
        return;
      }
      closeEdit();
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const regionUsers = users.filter((u) => u.role === "REGION");

  return (
    <>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Логин</th>
            <th className="px-3 py-2">Роль</th>
            <th className="px-3 py-2">Регион</th>
            <th className="px-3 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {regionUsers.map((u) => (
            <tr key={u.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{u.id}</td>
              <td className="px-3 py-2">{u.login}</td>
              <td className="px-3 py-2">{u.role}</td>
              <td className="px-3 py-2">{u.region?.name ?? "-"}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Редактировать
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editUser && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40" onClick={closeEdit}>
          <div
            className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-800">Редактирование пользователя</h3>
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-slate-600">Логин</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <label className="block text-xs font-medium text-slate-600">Новый пароль (оставьте пустым, чтобы не менять)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Не менять"
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
