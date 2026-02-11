import { NextResponse } from "next/server";

export function middleware() {
  // Пропускаем все запросы дальше; защита реализована в страницах и API
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth).*)"]
};