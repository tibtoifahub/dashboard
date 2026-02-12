"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslation } from "@/lib/i18n";
import type { Session } from "next-auth";

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const { t, language, setLanguage } = useTranslation();
  const role = session?.user?.role === "ADMIN" ? "admin" : session?.user?.role === "REGION" ? "region" : undefined;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">{t("common.title")}</span>
          {role && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
              {t(`common.${role}`)}
            </span>
          )}
          {session?.user?.login && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {session.user.login}
            </span>
          )}
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {session && (
            <>
              <Link href="/regions" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {t("nav.regions")}
              </Link>
              <Link href="/candidates" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {t("nav.candidates")}
              </Link>
              <Link href="/modules" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {t("nav.modules")}
              </Link>
              <Link href="/statistics" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                {t("nav.statistics")}
              </Link>
              {role === "admin" && (
                <Link href="/admin" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                  {t("nav.admin")}
                </Link>
              )}
              <div className="flex items-center gap-1 rounded border border-slate-300 bg-white px-1 py-0.5">
                <button
                  onClick={() => setLanguage("ru")}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    language === "ru"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLanguage("uz")}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                    language === "uz"
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  UZ
                </button>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                {t("common.logout")}
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

