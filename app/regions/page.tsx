import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DataTable } from "@/components/ui/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { RegionCreateForm } from "@/components/regions/RegionCreateForm";
import { prisma } from "@/lib/prisma";

interface RegionRow {
  id: number;
  name: string;
  totalSlots: number;
  filled: number;
  vacant: number;
  brigadesCount: number;
}

export default async function RegionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  const apiRegions = await prisma.region.findMany({
    where: session.user.role === "REGION" && session.user.regionId ? { id: session.user.regionId } : undefined,
    include: {
      brigades: true,
      candidates: true
    },
    orderBy: {
      name: "asc"
    }
  });

  const rows: RegionRow[] = apiRegions.map((r) => {
    const totalSlots = r.candidates.length;
    const filled = r.candidates.filter((c: any) => c.fullName && c.pinfl).length;
    const vacant = totalSlots - filled;
    return {
      id: r.id,
      name: r.name,
      totalSlots,
      filled,
      vacant,
      brigadesCount: r.brigades.length
    };
  });

  const columns: ColumnDef<RegionRow>[] = [
    { accessorKey: "name", header: "Регион" },
    { accessorKey: "brigadesCount", header: "Бригад" },
    { accessorKey: "totalSlots", header: "Всего мест" },
    { accessorKey: "filled", header: "Заполнено" },
    { accessorKey: "vacant", header: "Вакантно" }
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Регионы и медбригады</h1>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          Здесь отображается структура регионов, количество медбригад и текущее заполнение слотов кандидатов. 
          В каждом бригадном наборе создаются 1 слот врача и 4 слота медсестры.
        </p>
      </section>
      {session.user.role === "ADMIN" && <RegionCreateForm />}
      <DataTable columns={columns} data={rows} />
    </div>
  );
}

