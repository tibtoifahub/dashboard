"use client";

import { DataTable } from "@/components/ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { RegionCreateForm } from "@/components/regions/RegionCreateForm";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface RegionRow {
  id: number;
  name: string;
  totalSlots: number;
  filled: number;
  vacant: number;
  brigadesCount: number;
}

export default function RegionsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [rows, setRows] = useState<RegionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/regions");
        if (!res.ok) throw new Error("Failed to load");
        const apiRegions = await res.json();
        const mapped: RegionRow[] = apiRegions.map((r: any) => {
          const totalSlots = r.candidates?.length ?? 0;
          const filled = (r.candidates || []).filter((c: any) => c.fullName && c.pinfl).length;
          const vacant = totalSlots - filled;
          return {
            id: r.id,
            name: r.name,
            totalSlots,
            filled,
            vacant,
            brigadesCount: r.brigades?.length ?? 0
          };
        });
        setRows(mapped);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (session) load();
  }, [session]);

  const columns: ColumnDef<RegionRow>[] = [
    { accessorKey: "name", header: t("regions.region") },
    { accessorKey: "brigadesCount", header: t("regions.brigades") },
    { accessorKey: "totalSlots", header: t("regions.totalSlots") },
    { accessorKey: "filled", header: t("regions.filled") },
    { accessorKey: "vacant", header: t("regions.vacant") }
  ];

  if (!session) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("regions.title")}</h1>
      </div>
      <section className="rounded-lg border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 text-sm text-slate-700 shadow-sm">
        <p>
          {t("regions.info")}
        </p>
      </section>
      {session.user?.role === "ADMIN" && <RegionCreateForm />}
      {loading ? (
        <p className="text-sm text-slate-600">{t("common.loading")}</p>
      ) : (
        <DataTable columns={columns} data={rows} />
      )}
    </div>
  );
}
