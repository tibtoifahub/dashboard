"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
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
      setError(t("admin.enterLogin"));
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
        setError(json?.error ?? t("common.error"));
        return;
      }
      closeEdit();
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  const regionUsers = users.filter((u) => u.role === "REGION");

  return (
    <>
      <div className="overflow-x-auto rounded-lg border-2 border-slate-200 bg-white shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-slate-700 to-slate-600 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">{t("admin.login")}</th>
              <th className="px-4 py-3">{t("common.role")}</th>
              <th className="px-4 py-3">{t("admin.region")}</th>
              <th className="px-4 py-3">{t("common.filter")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {regionUsers.map((u, idx) => (
              <tr 
                key={u.id} 
                className={`border-t border-slate-100 transition-colors ${
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                } hover:bg-blue-50 hover:shadow-sm`}
              >
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3">{u.login}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">{u.region?.name ?? "-"}</td>
                <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  className="rounded-md border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                >
                  {t("admin.edit")}
                </button>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeEdit}>
          <div
            className="w-full max-w-sm rounded-lg border-2 border-slate-300 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-4">{t("admin.editUser")}</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-medium text-slate-700">{t("admin.login")}</label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-colors"
              />
              <label className="block text-xs font-medium text-slate-700">{t("admin.newPassword")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("admin.dontChange")}
                className="w-full rounded-md border-2 border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:ring-2 focus:ring-slate-200 transition-colors"
              />
            </div>
            {error && <p className="mt-3 text-xs text-red-600 font-medium">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border-2 border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="rounded-md border-2 border-slate-900 bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 hover:border-slate-800 disabled:opacity-60 transition-colors"
              >
                {loading ? t("common.loading") : t("admin.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
