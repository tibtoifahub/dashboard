"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface NavbarProps {
  session: Session | null;
}

export function Navbar({ session }: NavbarProps) {
  const role = session?.user?.role === "ADMIN" ? "admin" : session?.user?.role === "REGION" ? "region" : undefined;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Центр мед. аттестации</span>
          {role && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
              {role}
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
                Регионы
              </Link>
              <Link href="/candidates" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                Кандидаты
              </Link>
              <Link href="/modules" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                Модули
              </Link>
              <Link href="/statistics" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                Статистика
              </Link>
              {role === "admin" && (
                <Link href="/admin" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100 hover:text-slate-900">
                  Админ
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Выйти
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

