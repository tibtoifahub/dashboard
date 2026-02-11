# Деплой на Vercel — настройка базы данных

## Проблема
На Vercel нельзя использовать SQLite (файловая БД). Нужна PostgreSQL или MySQL.

## Решение: PostgreSQL (рекомендуется для Vercel)

### Вариант 1: Vercel Postgres (встроенный, бесплатный)

1. **В панели Vercel:**
   - Открой проект → вкладка **"Storage"** (или **"Integrations"**)
   - Нажми **"Create Database"** → выбери **"Postgres"**
   - Создай БД (бесплатный план Hobby даёт 256 MB)

2. **Vercel автоматически добавит переменную `POSTGRES_PRISMA_URL`** в Environment Variables.

3. **В Vercel → Settings → Environment Variables** проверь:
   - `DATABASE_URL` = значение из `POSTGRES_PRISMA_URL` (или используй `POSTGRES_PRISMA_URL` напрямую)
   - `NEXTAUTH_URL` = `https://твой-домен.vercel.app`
   - `NEXTAUTH_SECRET` = любая длинная случайная строка (например, сгенерируй: `openssl rand -base64 32`)

4. **Локально** (перед пушем):
   - Убедись, что `prisma/schema.prisma` использует `provider = "postgresql"` ✅ (уже исправлено)
   - Создай миграцию:
     ```bash
     npx prisma migrate dev --name init_postgres
     ```
   - Закоммить изменения:
     ```bash
     git add prisma/
     git commit -m "switch to PostgreSQL for Vercel"
     git push
     ```

5. **После деплоя на Vercel:**
   - Vercel автоматически запустит `prisma generate` и `prisma migrate deploy` (если настроен build script)
   - Или вручную через Vercel CLI:
     ```bash
     vercel env pull .env.local
     npx prisma migrate deploy
     ```

6. **Создать первого админа:**
   - Через Vercel CLI или через админ-панель (если есть seed):
     ```bash
     npx prisma db seed
     ```

---

### Вариант 2: Внешний PostgreSQL (Supabase, Neon, Railway)

1. **Создай БД** на одном из сервисов:
   - **Supabase** (https://supabase.com) — бесплатный план
   - **Neon** (https://neon.tech) — бесплатный план
   - **Railway** (https://railway.app) — бесплатный план

2. **Скопируй connection string** (обычно вида `postgresql://user:pass@host:5432/dbname`)

3. **В Vercel → Settings → Environment Variables** добавь:
   - `DATABASE_URL` = твой connection string
   - `NEXTAUTH_URL` = `https://твой-домен.vercel.app`
   - `NEXTAUTH_SECRET` = случайная строка

4. **Локально** подключись к этой же БД и выполни миграции:
   ```bash
   # В .env.local укажи DATABASE_URL от внешнего провайдера
   npx prisma migrate deploy
   ```

5. **Запушь код** — Vercel автоматически применит миграции при деплое.

---

### Вариант 3: MySQL (если нужен именно MySQL)

Если хочешь использовать MySQL вместо PostgreSQL:

1. **Измени `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Создай MySQL БД** на:
   - **PlanetScale** (https://planetscale.com) — бесплатный план, MySQL-совместимый
   - **Railway MySQL** — бесплатный план
   - Или свой хостинг MySQL

3. **В Vercel → Environment Variables:**
   - `DATABASE_URL` = `mysql://user:pass@host:3306/dbname`
   - `NEXTAUTH_URL` и `NEXTAUTH_SECRET` (как выше)

4. **Миграции:**
   ```bash
   npx prisma migrate deploy
   ```

---

## Проверка после деплоя

1. Открой `https://твой-домен.vercel.app/login`
2. Попробуй войти с демо-логином (`markaz` / `2020331`)
3. Если ошибка "Неверный логин или пароль":
   - Проверь, что `DATABASE_URL` в Vercel правильный
   - Проверь, что миграции применены (таблицы созданы)
   - Проверь, что есть пользователь в БД (запусти seed или создай вручную)

---

## Быстрое исправление прямо сейчас

Если уже задеплоено с SQLite и не работает:

1. **В Vercel → Settings → Environment Variables:**
   - Удали старый `DATABASE_URL` (если был с SQLite)
   - Добавь новый `DATABASE_URL` от PostgreSQL/MySQL провайдера

2. **В коде** (уже сделано):
   - `prisma/schema.prisma` → `provider = "postgresql"` ✅

3. **Запушь изменения:**
   ```bash
   git add prisma/schema.prisma
   git commit -m "fix: switch to PostgreSQL for Vercel"
   git push
   ```

4. **После деплоя** Vercel пересоберёт проект с новой схемой.

5. **Примени миграции** (через Vercel CLI или вручную подключись к БД):
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

---

## Рекомендация

**Используй Vercel Postgres** (Вариант 1) — это самый простой способ:
- Бесплатно
- Автоматическая настройка
- Интеграция с Vercel
- Не нужно настраивать внешний сервис
