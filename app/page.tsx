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
      <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
        {role === "ADMIN" ? (
          <p>{t("home.adminIntro")}</p>
        ) : (
          <p>{t("home.regionIntro")}</p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/regions" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <h2 className="text-sm font-semibold">{t("home.regionsCardTitle")}</h2>
          <p className="mt-2 text-xs text-slate-600">{t("home.regionsCardDesc")}</p>
        </Link>
        <Link
          href="/candidates"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-sm font-semibold">{t("home.candidatesCardTitle")}</h2>
          <p className="mt-2 text-xs text-slate-600">{t("home.candidatesCardDesc")}</p>
        </Link>
        <Link href="/modules" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
          <h2 className="text-sm font-semibold">{t("home.modulesCardTitle")}</h2>
          <p className="mt-2 text-xs text-slate-600">{t("home.modulesCardDesc")}</p>
        </Link>
        <Link
          href="/statistics"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300"
        >
          <h2 className="text-sm font-semibold">{t("home.statisticsCardTitle")}</h2>
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
