"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

interface Region {
  id: number;
  name: string;
}

interface Props {
  regions: Region[];
}

export function AdminCreateUserForm({ regions }: Props) {
  const { t } = useTranslation();
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
      setError(t("admin.enterLoginPassword"));
      return;
    }

    if (mode === "existing" && !regionId) {
      setError(t("admin.selectRegion"));
      return;
    }

    if (mode === "new") {
      if (!newRegionName.trim()) {
        setError(t("admin.enterNewRegionName"));
        return;
      }
      if (!newRegionBrigades || newRegionBrigades <= 0) {
        setError(t("regions.brigadeCountMustBePositive"));
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
          throw new Error(jsonRegion?.error ?? t("regions.errorCreating"));
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
        const message = jsonUser?.error === "Login already in use" ? t("admin.loginExists") : jsonUser?.error;
        throw new Error(message ?? t("admin.errorCreatingUser"));
      }
      const regionName =
        (jsonUser.region && jsonUser.region.name) || newRegionName || "регион";

      setSuccess(
        `${t("admin.userCreated")} "${jsonUser.login}" ${t("admin.forRegion")} "${regionName}"`
      );
      setLogin("");
      setPassword("");
      setRegionId("");
      setNewRegionName("");
      setNewRegionBrigades(1);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? t("admin.errorCreatingUser"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          {t("admin.userRoleInfo")}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("admin.login")}</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("admin.password")}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">{t("candidates.importMode")}</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "existing" | "new")}
            className="w-48 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="existing">{t("admin.existingRegion")}</option>
            <option value="new">{t("admin.newRegion")}</option>
          </select>
        </div>
        {mode === "existing" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">{t("admin.region")}</label>
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : "")}
              className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            >
              <option value="">{t("admin.selectRegion")}</option>
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
              <label className="mb-1 block text-xs font-medium text-slate-700">{t("admin.newRegion")}</label>
              <input
                type="text"
                value={newRegionName}
                onChange={(e) => setNewRegionName(e.target.value)}
                className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">{t("admin.brigades")}</label>
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
          {loading ? t("regions.creating") : t("admin.createUser")}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-emerald-700">{success}</p>}
    </form>
  );
}

