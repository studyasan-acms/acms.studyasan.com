# 📚 StudyAsan ACMS — Master Project & Handover Documentation

Welcome to the **StudyAsan Academy & Classroom Management System (ACMS)** repository. This documentation is written specifically for incoming engineers, system administrators, and tech leads to understand, deploy, maintain, and scale the application.

---

## 🧭 Documentation Sitemap

| Document | Description |
| :--- | :--- |
| **[01. Architecture & System Overview](file:///root/acms/docs/01_ARCHITECTURE_AND_SYSTEM_OVERVIEW.md)** | Full tech stack, database schema overview, core modules, RBAC, and repository structure. |
| **[02. Janus WebRTC & Live Classroom Guide](file:///root/acms/docs/02_JANUS_WEBRTC_AND_CLASSROOM_GUIDE.md)** | Deep dive into Janus Media Server, VideoRoom SFU plugin, signaling, data channels, and whiteboard sync. |
| **[03. Production Deployment Guide](file:///root/acms/docs/03_PRODUCTION_DEPLOYMENT_GUIDE.md)** | Step-by-step installation on Ubuntu, NGINX configuration, SSL certificates, and PM2 setup. |
| **[04. Backups & Disaster Recovery Guide](file:///root/acms/docs/04_BACKUPS_AND_DISASTER_RECOVERY.md)** | Automated S3 database backups, manual dump/restore commands, and disaster recovery runbook. |
| **[05. Cron Jobs & Scheduled Tasks](file:///root/acms/docs/05_CRON_JOBS_AND_AUTOMATED_TASKS.md)** | Complete schedule of automated background jobs (backups, retention, session scheduler, Janus cleanup). |
| **[06. Environment Variables Reference](file:///root/acms/docs/06_ENVIRONMENT_VARIABLES_REFERENCE.md)** | Complete reference guide for all backend and frontend `.env` configuration keys. |

---

## ⚡ Quick Start for Developers

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **PostgreSQL**: `v15.x` or higher
* **Janus WebRTC Gateway**: `v1.x` with VideoRoom & WebSockets enabled

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone git@github.com:xdastechnology/acms.git
   cd acms
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   cp .env.example .env # Configure your DATABASE_URL, JWT_SECRET, etc.
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

3. **Setup Frontend**:
   ```bash
   cd ../frontend
   cp .env.example .env # Configure VITE_API_URL, VITE_JANUS_URL, etc.
   npm install
   npm run dev
   ```

4. **One-Click Build & Restart (Production)**:
   ```bash
   ./build.sh
   ```

---

## 🛠️ Tech Stack at a Glance

* **Frontend**: React 18, TypeScript, Vite, TailwindCSS (StudyAsan Blue `#0276D3` & Orange `#eca209`), Lucide Icons, Canvas-Confetti, Katex.
* **Backend**: Node.js, Express.js (ES Modules), TypeScript, Prisma ORM, Socket.IO, node-cron.
* **Database**: PostgreSQL 15+ hosted locally / cloud.
* **Live Video & Media**: Janus WebRTC Gateway (SFU architecture with VideoRoom plugin).
* **Storage**: AWS S3 for documents, recordings, cover images, and database backups.
* **Reverse Proxy & Web Server**: NGINX with Let's Encrypt SSL (`acms.studyasan.com` & `janus.studyasan.com`).
* **Process Manager**: PM2 (`acms-backend`).
