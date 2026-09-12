# 📚 StudyAsan ACMS — Master Project & Handover Documentation

Welcome to the **StudyAsan Academy & Classroom Management System (ACMS)** repository. This documentation is written specifically for incoming engineers, system administrators, and tech leads to understand, deploy, maintain, and scale the application.

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
