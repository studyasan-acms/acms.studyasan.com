# 🚀 Production Deployment Guide

This guide provides step-by-step instructions for deploying and operating the StudyAsan ACMS on a fresh Linux VPS (Ubuntu 22.04 / 24.04 LTS).

---

## 1. Server Prerequisites

* **Operating System**: Ubuntu 22.04 / 24.04 LTS (x86_64)
* **Minimum Specs**: 6 CPU Cores, 12 GB RAM, 200 GB SSD
* **Domain Names Required**:
  1. `acms.studyasan.com` (Main web application & API)
  2. `janus.studyasan.com` (Janus WebRTC gateway & WebSockets)

---

## 2. Server Environment Setup

### 2.1 Update System & Install Core Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx postgresql postgresql-contrib libmicrohttpd-dev libjansson-dev libssl-dev libsofia-sip-ua-dev libglib2.0-dev libopus-dev libogg-dev libcurl4-openssl-dev liblua5.3-dev libconfig-dev pkg-config gengetopt libtool automake
```

### 2.2 Install Node.js 20+ & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 3. Database Setup (PostgreSQL)

```bash
sudo -u postgres psql
```

Inside PostgreSQL prompt:
```sql
CREATE DATABASE acms_db;
CREATE USER acms_user WITH ENCRYPTED PASSWORD 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE acms_db TO acms_user;
ALTER DATABASE acms_db OWNER TO acms_user;
\q
```

---

## 4. Janus WebRTC Server Setup

### 4.1 Install Janus Gateway
```bash
sudo apt install -y janus
```

### 4.2 Configure Janus
Ensure the following files exist in `/etc/janus/`:
1. `/etc/janus/janus.jcfg` (NAT STUN server & media ports)
2. `/etc/janus/janus.transport.websockets.jcfg` (WebSocket port `8989` on `127.0.0.1`)
3. `/etc/janus/janus.plugin.videoroom.jcfg` (VideoRoom plugin)

### 4.3 Enable and Start Janus Service
```bash
sudo systemctl enable janus
sudo systemctl restart janus
sudo systemctl status janus
```

---

## 5. Application Deployment

### 5.1 Clone Repository
```bash
cd /root
git clone git@github.com:xdastechnology/acms.git
cd acms
```

### 5.2 Configure Environment Variables
Create `/root/acms/backend/.env`:
```env
DATABASE_URL="postgresql://acms_user:YOUR_STRONG_PASSWORD@localhost:5432/acms_db?schema=public"
JWT_SECRET="YOUR_RANDOM_SECURE_JWT_SECRET"
PORT=3000
NODE_ENV="production"

# AWS S3 Storage & Database Backups
AWS_ACCESS_KEY_ID="YOUR_AWS_KEY"
AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET"
AWS_REGION="ap-south-1"
AWS_S3_BUCKET="studyasan-media-bucket"

# Janus Configuration
JANUS_HTTP_API="http://127.0.0.1:8088/janus"
JANUS_ADMIN_KEY="YOUR_JANUS_ADMIN_KEY"

# Cron Schedules (Optional overrides)
DB_BACKUP_CRON_SCHEDULE="0 2 * * *"
DATA_RETENTION_CRON_SCHEDULE="0 3 * * *"
```

Create `/root/acms/frontend/.env`:
```env
VITE_API_URL="/api"
VITE_JANUS_URL="wss://janus.studyasan.com/janus"
```

### 5.3 Build the Project
```bash
# Build Backend
cd /root/acms/backend
npm install
npx prisma generate
npx prisma db push
npm run build

# Build Frontend
cd /root/acms/frontend
npm install
npm run build
```

---

## 6. NGINX Reverse Proxy & SSL Setup

### 6.1 Main Application Config: `/etc/nginx/sites-available/acms.studyasan.com`
```nginx
server {
    server_name acms.studyasan.com;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 80;
}
```

### 6.2 Janus Config: `/etc/nginx/sites-available/janus.conf`
```nginx
server {
    server_name janus.studyasan.com;

    location /janus {
        proxy_pass http://127.0.0.1:8989;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api {
        proxy_pass http://127.0.0.1:8088/janus;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 80;
}
```

### 6.3 Enable Virtual Hosts & Obtain SSL
```bash
sudo ln -sf /etc/nginx/sites-available/acms.studyasan.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/janus.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install SSL via Certbot
sudo certbot --nginx -d acms.studyasan.com -d janus.studyasan.com
```

---

## 7. Process Management (PM2)

### 7.1 Start Backend Service
```bash
cd /root/acms/backend
pm2 start npm --name "acms-backend" -- run start
pm2 save
pm2 startup
```

---

## 8. Ongoing Updates & CI/CD Pipeline

To deploy new updates from GitHub, run the automated build script:
```bash
cd /root/acms
git pull origin main
./build.sh
```

The `./build.sh` script automatically:
1. Generates Prisma clients & applies database schema changes (`prisma db push`).
2. Compiles backend TypeScript (`npm run build`).
3. Compiles production frontend bundle (`npm run build`).
4. Gracefully restarts the PM2 process (`pm2 restart 0`).
