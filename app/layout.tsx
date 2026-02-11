import "./globals.css";
import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { AppSessionProvider } from "@/components/layout/AppSessionProvider";

export const metadata = {
  title: "Medical Attestation Dashboard",
  description: "Enterprise MVP dashboard for medical attestation center"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppSessionProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar session={session} />
            <main className="flex-1 bg-slate-50 px-4 py-6 sm:px-8">{children}</main>
          </div>
        </AppSessionProvider>
      </body>
    </html>
  );
}

