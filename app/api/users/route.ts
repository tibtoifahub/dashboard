import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    include: { region: true },
    orderBy: { id: "asc" }
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { login, password, regionId } = body as {
    login?: string;
    password?: string;
    regionId?: number;
  };

  if (!login || !password || !regionId) {
    return NextResponse.json({ error: "login, password, regionId are required" }, { status: 400 });
  }

  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { login } });
  if (existing) {
    return NextResponse.json({ error: "Login already in use" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      login,
      passwordHash,
      role: "REGION",
      regionId
    },
    include: { region: true }
  });

  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, login, password, regionId } = body as {
    id?: number;
    login?: string;
    password?: string;
    regionId?: number | null;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updateData: any = {};

  if (typeof login === "string" && login.trim()) {
    const existing = await prisma.user.findUnique({ where: { login: login.trim() } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Логин уже занят" }, { status: 400 });
    }
    updateData.login = login.trim();
  }

  if (typeof regionId !== "undefined") {
    updateData.regionId = regionId;
  }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json(user);
}

