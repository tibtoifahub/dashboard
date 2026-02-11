import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { AdminUserTable } from "@/components/admin/AdminUserTable";
import { AdminRegionsList } from "@/components/admin/AdminRegionsList";

async function fetchInitialData() {
  const [users, regions] = await Promise.all([
    prisma.user.findMany({ include: { region: true }, orderBy: { id: "asc" } }),
    prisma.region.findMany({ include: { brigades: true }, orderBy: { name: "asc" } })
  ]);
  return { users, regions };
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  const { users, regions } = await fetchInitialData();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-xl font-semibold">Администрирование</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          Здесь администратор управляет региональными пользователями. Для нового региона можно сразу задать
          количество медбригад и создать аккаунт ответственного пользователя.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Пользователи регионов</h2>
        <p className="text-xs text-slate-600">Редактирование логина и пароля — кнопка «Редактировать».</p>
        <AdminUserTable users={users} />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Создание пользователя региона</h2>
        <AdminCreateUserForm regions={regions} />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Редактирование базы региона</h2>
        <p className="text-xs text-slate-600">Изменить число мед. бригад или удалить регион и все его данные.</p>
        <AdminRegionsList regions={regions} />
      </section>
    </div>
  );
}

