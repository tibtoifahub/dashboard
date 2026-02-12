# Команды для деплоя на VPS сервер

## Шаг 1: Подготовка сервера (выполни на сервере)

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20.x через NVM (если проблемы с DNS)
# Сначала попробуй исправить DNS:
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf

# Затем обнови apt
sudo apt update

# Если все еще не работает, используй NVM:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 200

nvm alias default 20
node --version  # должно быть v20.x
npm --version
```

# Установка MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation
# При установке выбери:
# - Set root password? Yes
# - Password validation? Medium
# - Remove anonymous users? Yes
# - Disallow root login remotely? Yes
# - Remove test database? Yes
# - Reload privilege tables? Yes
```

## Шаг 2: Создание базы данных MySQL

```bash
sudo mysql -u root -p
```

В MySQL консоли выполни (замени `твой_пароль` на свой пароль):

```sql
CREATE DATABASE dashboard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dashboard_user'@'localhost' IDENTIFIED BY 'твой_пароль';
GRANT ALL PRIVILEGES ON dashboard_db.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Шаг 3: Установка Nginx и PM2

```bash
# Установка Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Установка PM2
sudo npm install -g pm2
pm2 startup
# Выполни команду, которую выведет PM2 (например: sudo env PATH=... pm2 startup systemd -u user --hp /home/user)
```

## Шаг 4: Подготовка проекта (локально на твоем компьютере)

### 4.1. Переключить схему на MySQL

Скопируй `prisma/schema.mysql.prisma` в `prisma/schema.prisma` или измени вручную:

```bash
# Windows PowerShell
Copy-Item prisma\schema.mysql.prisma prisma\schema.prisma

# Linux/macOS
cp prisma/schema.mysql.prisma prisma/schema.prisma
```

### 4.2. Создать .env.production (локально)

Создай файл `.env.production` с содержимым:

```env
DATABASE_URL="mysql://dashboard_user:твой_пароль@localhost:3306/dashboard_db"
NEXTAUTH_URL="https://твой-домен.ru"
NEXTAUTH_SECRET="сгенерируй-случайную-строку-минимум-32-символа"
NODE_ENV="production"
```

Для генерации NEXTAUTH_SECRET выполни:
```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))

# Linux/macOS
openssl rand -base64 32
```

### 4.3. Сборка проекта (локально)

```bash
npm ci
npm run build
```

### 4.4. Копирование статики (локально)

```bash
# Windows PowerShell
Copy-Item -Recurse -Force public .next\standalone\
Copy-Item -Recurse -Force .next\static .next\standalone\.next\

# Linux/macOS
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
```

## Шаг 5: Загрузка на сервер

### Вариант А: Через Git (рекомендуется)

```bash
# На сервере
cd /var/www
sudo git clone https://github.com/твой-логин/dashboard.git
cd dashboard
sudo chown -R $USER:$USER /var/www/dashboard
```

### Вариант Б: Через SCP (с локального компьютера)

```bash
# Создать директорию на сервере
ssh user@твой-ip
sudo mkdir -p /var/www/dashboard
sudo chown -R $USER:$USER /var/www/dashboard
exit

# Загрузить файлы (с локального компьютера)
scp -r .next/standalone/* user@твой-ip:/var/www/dashboard/
scp -r prisma user@твой-ip:/var/www/dashboard/
scp package.json user@твой-ip:/var/www/dashboard/
scp -r public user@твой-ip:/var/www/dashboard/
```

## Шаг 6: Настройка на сервере

```bash
cd /var/www/dashboard

# Создать .env файл
nano .env
```

Вставь содержимое (замени значения):

```env
DATABASE_URL="mysql://dashboard_user:твой_пароль@localhost:3306/dashboard_db"
NEXTAUTH_URL="https://твой-домен.ru"
NEXTAUTH_SECRET="твой-секрет-из-шага-4.2"
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="сгенерируй-ключ-ниже"
NODE_ENV="production"
PORT=3000
```

Сгенерировать `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (на сервере или локально):
```bash
openssl rand -base64 32
```
Вставь результат в `.env`. Этот ключ нужен, чтобы после перезапуска/деплоя не было ошибок «Failed to find Server Action».

Сохрани (Ctrl+O, Enter, Ctrl+X)

```bash
# Установить зависимости
npm ci --omit=dev

# Применить миграции и создать админа
npx prisma generate
npx prisma migrate deploy
npx prisma db seed

# Запустить приложение
pm2 start .next/standalone/server.js --name dashboard
pm2 save

# Проверить статус
pm2 status
pm2 logs dashboard
```

## Шаг 7: Настройка Nginx

```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Вставь (замени `твой-домен.ru` на свой домен):

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

Сохрани и активируй:

```bash
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Шаг 8: SSL сертификат (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d твой-домен.ru -d www.твой-домен.ru
```

Следуй инструкциям:
- Email: введи свой email
- Terms: согласись (A)
- Redirect: выбери 2 (redirect HTTP to HTTPS)

## Шаг 9: Проверка

1. Открой `https://твой-домен.ru`
2. Должна открыться страница входа
3. Войди с логином `admin` и паролем `2020331`

## Управление приложением

```bash
# Перезапуск
pm2 restart dashboard

# Просмотр логов
pm2 logs dashboard

# Остановка
pm2 stop dashboard

# Статус
pm2 status
```

## Автозапуск при перезагрузке сервера

Чтобы приложение (dashboard) автоматически запускалось после перезагрузки VPS:

```bash
# 1. Настроить автозапуск PM2 (выполни команду, которую выведет pm2 startup)
pm2 startup

# 2. Сохранить текущий список процессов — после этого они будут восстанавливаться при перезагрузке
pm2 save
```

После перезагрузки сервера проверь: `pm2 status` — процесс `dashboard` должен быть в статусе `online`.

## Если сервер упал / приложение не отвечает

```bash
# Проверить статус
pm2 status

# Логи (последние 50 строк)
pm2 logs dashboard --lines 50

# Только ошибки
pm2 logs dashboard --err --lines 30

# Перезапустить приложение
cd /var/www/dashboard
pm2 restart dashboard

# Если не помогло — перезапустить с нуля
pm2 delete dashboard
pm2 start .next/standalone/server.js --name dashboard
pm2 save
```

## Ошибки «Failed to find Server Action» в логах

Если в `pm2 logs dashboard --err` видишь ошибки вида *Failed to find Server Action "…". This request might be from an older or newer deployment*:

1. **Добавь постоянный ключ шифрования** (чтобы ID Server Actions не менялись после перезапуска):
   ```bash
   # Сгенерировать ключ
   openssl rand -base64 32
   ```
   Добавь в `.env` на сервере:
   ```env
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="сюда-вставь-результат-команды"
   ```
   Перезапусти приложение: `pm2 restart dashboard`

2. **Пользователям** после деплоя сделать жёсткое обновление страницы: **Ctrl+Shift+R** (или Cmd+Shift+R на Mac), чтобы подтянуть новую сборку.

## Если что-то не работает

```bash
# Проверить PM2
pm2 status
pm2 logs dashboard --lines 50

# Проверить Nginx
sudo nginx -t
sudo systemctl status nginx

# Проверить MySQL
sudo systemctl status mysql
sudo mysql -u dashboard_user -p dashboard_db

# Проверить порт (на Ubuntu 22+ используй ss вместо netstat)
sudo ss -tlnp | grep 3000
```

## Временный доступ по туннелю (пока DNS не работает)

Если домен не резолвится (проблема у регистратора), можно открывать сайт по бесплатному HTTPS-URL через туннель.

### Вариант 1: Cloudflare Tunnel (без регистрации)

На VPS:

```bash
# Скачать cloudflared (один раз)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Запустить туннель на порт 3000 (приложение)
cloudflared tunnel --url http://127.0.0.1:3000
```

В терминале появится строка вида: `https://xxxx-xx-xx-xx-xx.trycloudflare.com` — это и есть временная ссылка на сайт. Туннель должен оставаться запущенным (не закрывать сессию или запустить в screen/tmux).

Чтобы авторизация (логин) работала по этой ссылке, в `.env` временно задай:
```env
NEXTAUTH_URL="https://ТВОЙ-URL-ИЗ-ВЫВОДА-cloudflared"
```
Затем: `pm2 restart dashboard`.

### Вариант 2: ngrok (бесплатный аккаунт)

1. Регистрация: https://ngrok.com (бесплатно).
2. На VPS установить ngrok, в настройках указать authtoken.
3. Запуск: `ngrok http 3000` — в консоли будет URL вида `https://xxxx.ngrok-free.app`.
4. В `.env`: `NEXTAUTH_URL="https://xxxx.ngrok-free.app"`, затем `pm2 restart dashboard`.

После того как провайдер настроит DNS, открой сайт по домену и верни в `.env` прежний `NEXTAUTH_URL="https://oilasalomatligi.uz"`, перезапусти `pm2 restart dashboard`.

## Важные заметки

1. **Пароль админа**: `2020331` (захардкожен в `prisma/seed.cjs`)
2. **Домен**: Убедись, что DNS записи A/AAAA указывают на IP твоего VPS
3. **Firewall**: Открой порты 22, 80, 443:
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
