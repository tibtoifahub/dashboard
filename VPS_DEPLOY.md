# Деплой на VPS сервер

Инструкция для размещения проекта на VPS (Ubuntu/Debian) с Node.js, MySQL и Nginx.

## Требования

- VPS с Ubuntu 20.04+ или Debian 11+
- Root доступ или пользователь с sudo
- Домен, указывающий на IP VPS
- Минимум 1 GB RAM, 10 GB диска

---

## 1. Подготовка сервера

### 1.1. Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2. Установка Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # должно быть v20.x
```

### 1.3. Установка MySQL

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Создай базу данных и пользователя:

```bash
sudo mysql -u root -p
```

В MySQL консоли:

```sql
CREATE DATABASE dashboard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dashboard_user'@'localhost' IDENTIFIED BY 'твой_безопасный_пароль';
GRANT ALL PRIVILEGES ON dashboard_db.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 1.4. Установка Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 1.5. Установка PM2 (менеджер процессов)

```bash
sudo npm install -g pm2
pm2 startup  # выполни команду, которую выведет PM2
```

---

## 2. Подготовка проекта (локально)

### 2.1. Переключить схему на MySQL

Убедись, что `prisma/schema.prisma` использует:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 2.2. Создать .env.production

```env
DATABASE_URL="mysql://dashboard_user:твой_пароль@localhost:3306/dashboard_db"
NEXTAUTH_URL="https://твой-домен.ru"
NEXTAUTH_SECRET="сгенерируй-случайную-строку-32-символа"
NODE_ENV="production"
```

### 2.3. Сборка проекта

```bash
npm ci
export DATABASE_URL="mysql://dashboard_user:пароль@localhost:3306/dashboard_db"
export NEXTAUTH_URL="https://твой-домен.ru"
export NEXTAUTH_SECRET="твой-секрет"
npm run build
```

### 2.4. Копирование статики в standalone

```bash
# Linux/macOS
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Windows PowerShell
Copy-Item -Recurse -Force public .next\standalone\
Copy-Item -Recurse -Force .next\static .next\standalone\.next\
```

---

## 3. Загрузка на сервер

### 3.1. Создать директорию на сервере

```bash
sudo mkdir -p /var/www/dashboard
sudo chown -R $USER:$USER /var/www/dashboard
```

### 3.2. Загрузить файлы

**Вариант А: через SCP (с локального компьютера):**

```bash
scp -r .next/standalone/* user@твой-ip:/var/www/dashboard/
scp -r prisma user@твой-ip:/var/www/dashboard/
scp package.json user@твой-ip:/var/www/dashboard/
```

**Вариант Б: через Git (рекомендуется):**

```bash
# На сервере
cd /var/www
git clone https://github.com/твой-логин/dashboard.git
cd dashboard
npm ci --omit=dev
npm run build
# Скопируй public и .next/static в .next/standalone (как в шаге 2.4)
```

### 3.3. Структура на сервере

```
/var/www/dashboard/
  server.js          ← из .next/standalone
  node_modules/      ← из .next/standalone
  .next/
    static/
    ...
  public/
  prisma/
    schema.prisma
    migrations/
    seed.cjs
  package.json
  .env               ← создай этот файл
```

---

## 4. Настройка на сервере

### 4.1. Создать .env файл

```bash
cd /var/www/dashboard
nano .env
```

Содержимое:

```env
DATABASE_URL="mysql://dashboard_user:твой_пароль@localhost:3306/dashboard_db"
NEXTAUTH_URL="https://твой-домен.ru"
NEXTAUTH_SECRET="твой-секрет"
NODE_ENV="production"
PORT=3000
```

### 4.2. Применить миграции и создать админа

```bash
cd /var/www/dashboard
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### 4.3. Запустить приложение через PM2

```bash
cd /var/www/dashboard
pm2 start .next/standalone/server.js --name dashboard
pm2 save
```

Проверь статус:

```bash
pm2 status
pm2 logs dashboard
```

---

## 5. Настройка Nginx

### 5.1. Создать конфиг сайта

```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Содержимое:

```nginx
server {
    listen 80;
    server_name твой-домен.ru www.твой-домен.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2. Активировать сайт

```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t  # проверить конфиг
sudo systemctl reload nginx
```

---

## 6. SSL сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d твой-домен.ru -d www.твой-домен.ru
```

Certbot автоматически обновит конфиг Nginx для HTTPS.

---

## 7. Проверка

1. Открой `https://твой-домен.ru`
2. Должна открыться страница входа
3. Войди с логином `admin` и паролем `Admin2024!Secure`

---

## Управление приложением

### Перезапуск

```bash
pm2 restart dashboard
```

### Просмотр логов

```bash
pm2 logs dashboard
```

### Остановка

```bash
pm2 stop dashboard
```

### Обновление кода

```bash
cd /var/www/dashboard
git pull
npm ci --omit=dev
npm run build
# Скопируй public и .next/static в .next/standalone
npx prisma migrate deploy  # если были изменения схемы
pm2 restart dashboard
```

---

## Частые проблемы

| Проблема | Решение |
|----------|---------|
| 502 Bad Gateway | Проверь, что PM2 запущен: `pm2 status`. Проверь порт в .env и Nginx конфиге. |
| Ошибка подключения к БД | Проверь `DATABASE_URL` в .env, убедись что MySQL запущен: `sudo systemctl status mysql`. |
| "Неверный логин или пароль" | Проверь, что seed выполнен: `npx prisma db seed`. Проверь логи PM2. |
| Приложение не запускается | Проверь логи: `pm2 logs dashboard`. Убедись что все зависимости установлены. |

---

## Безопасность

1. **Firewall**: Открой только нужные порты:
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

2. **Обновления**: Регулярно обновляй систему:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Резервные копии**: Настрой автоматические бэкапы БД:
   ```bash
   # Добавь в crontab
   0 2 * * * mysqldump -u dashboard_user -pпароль dashboard_db > /backup/dashboard_$(date +\%Y\%m\%d).sql
   ```

---

## Готово! 🚀

Приложение должно работать на `https://твой-домен.ru`.
