"use client";

import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { AdminRegionsList } from "@/components/admin/AdminRegionsList";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AdminPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/users");
        const usersData = await res.json();
        const regionsRes = await fetch("/api/regions");
        const regionsData = await regionsRes.json();
        setUsers(usersData);
        setRegions(regionsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (session?.user?.role === "ADMIN") load();
  }, [session]);

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-semibold">{t("admin.title")}</h1>
      <section className="rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 text-sm text-slate-700 shadow-sm">
        <p>
          {t("admin.info")}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border-2 border-slate-200 bg-white p-5 shadow-md">
        <h2 className="text-sm font-semibold">{t("admin.users")}</h2>
        <p className="text-xs text-slate-600">{t("admin.editInfo")}</p>
        {loading ? (
          <p className="text-sm text-slate-600">{t("common.loading")}</p>
        ) : (
          <AdminUserTable users={users} />
        )}
      </section>

      <section className="space-y-3 rounded-lg border-2 border-slate-200 bg-white p-5 shadow-md">
        <h2 className="text-sm font-semibold">{t("admin.createUser")}</h2>
        <AdminCreateUserForm regions={regions} />
      </section>

      <section className="space-y-3 rounded-lg border-2 border-slate-200 bg-white p-5 shadow-md">
        <h2 className="text-sm font-semibold">{t("admin.editDatabase")}</h2>
        <p className="text-xs text-slate-600">{t("admin.editDatabaseInfo")}</p>
        {loading ? (
          <p className="text-sm text-slate-600">{t("common.loading")}</p>
        ) : (
          <AdminRegionsList regions={regions} />
        )}
      </section>
    </div>
  );
}
