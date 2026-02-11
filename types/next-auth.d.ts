import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      login: string;
      role: "ADMIN" | "REGION";
      regionId: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    login: string;
    role: "ADMIN" | "REGION";
    regionId: number | null;
  }
}

