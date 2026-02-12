"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-slate-600">{t("common.loading")}</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const role = session.user.role;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-800">{t("home.title")}</h1>
      <section className="rounded-lg border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 text-sm text-slate-700 shadow-sm">
        {role === "ADMIN" ? (
          <p>{t("home.adminIntro")}</p>
        ) : (
          <p>{t("home.regionIntro")}</p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link 
          href="/regions" 
          className="group rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-md transition-all hover:border-blue-400 hover:shadow-lg"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <h2 className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{t("home.regionsCardTitle")}</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">{t("home.regionsCardDesc")}</p>
        </Link>
        <Link
          href="/candidates"
          className="group rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-md transition-all hover:border-emerald-400 hover:shadow-lg"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <h2 className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">{t("home.candidatesCardTitle")}</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">{t("home.candidatesCardDesc")}</p>
        </Link>
        <Link 
          href="/modules" 
          className="group rounded-lg border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-md transition-all hover:border-amber-400 hover:shadow-lg"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <h2 className="text-sm font-semibold text-slate-800 group-hover:text-amber-700">{t("home.modulesCardTitle")}</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">{t("home.modulesCardDesc")}</p>
        </Link>
        <Link
          href="/statistics"
          className="group rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-md transition-all hover:border-purple-400 hover:shadow-lg"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <h2 className="text-sm font-semibold text-slate-800 group-hover:text-purple-700">{t("home.statisticsCardTitle")}</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">{t("home.statisticsCardDesc")}</p>
        </Link>
      </div>

      {role === "ADMIN" && (
        <Link href="/admin" className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          {t("home.goToAdmin")}
        </Link>
      )}
    </div>
  );
}
