import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold">Рабочий кабинет</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        {role === "ADMIN" ? (
          <p>
            Вы вошли как администратор. Сначала создайте регионы и медбригады, затем назначьте региональных
            пользователей и контролируйте заполнение и результаты модулей.
          </p>
        ) : (
          <p>
            Вы вошли как региональный пользователь. Заполните кандидатов по своему региону, затем выставляйте
            результаты модулей и отслеживайте статистику.
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/regions" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <h2 className="text-sm font-semibold">Регионы</h2>
          <p className="mt-2 text-xs text-slate-600">Создание регионов и контроль количества бригад/слотов.</p>
        </Link>
        <Link
          href="/candidates"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-sm font-semibold">Кандидаты</h2>
          <p className="mt-2 text-xs text-slate-600">Заполнение VACANT-мест и импорт Excel по профессии.</p>
        </Link>
        <Link href="/modules" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <h2 className="text-sm font-semibold">Модули</h2>
          <p className="mt-2 text-xs text-slate-600">Выставление статусов PASSED/FAILED/NO_SHOW с учетом правил.</p>
        </Link>
        <Link
          href="/statistics"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-sm font-semibold">Статистика</h2>
          <p className="mt-2 text-xs text-slate-600">Оперативные показатели и экспорт отчета в Excel.</p>
        </Link>
      </div>

      {role === "ADMIN" && (
        <Link href="/admin" className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Перейти в админ-панель
        </Link>
      )}
    </div>
  );
}

