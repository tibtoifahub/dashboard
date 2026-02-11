import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Login", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { login: credentials.login }
        });

        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: String(user.id),
          login: user.login,
          role: user.role,
          regionId: user.regionId ?? null
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const mutableToken = token as any;
        mutableToken.id = user.id;
        mutableToken.role = (user as any).role;
        mutableToken.regionId = (user as any).regionId;
        mutableToken.login = (user as any).login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const tokenData = token as any;
        const sessionUser = session.user as any;
        sessionUser.id = tokenData.id as string;
        sessionUser.role = tokenData.role as string;
        sessionUser.regionId = tokenData.regionId as number | null;
        sessionUser.login = tokenData.login as string;
      }
      return session;
    }
  }
};

