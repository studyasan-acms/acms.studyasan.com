# 🔑 Environment Variables Reference Guide

This document lists every environment variable used in StudyAsan ACMS.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable Name | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **`DATABASE_URL`** | **Yes** | `postgresql://user:pass@localhost:5432/acms_db?schema=public` | PostgreSQL database connection string. |
| **`JWT_SECRET`** | **Yes** | `d4e1...` (64+ chars random string) | Secret key used for signing authentication JWT tokens. |
| **`PORT`** | No | `3000` | Port for Express server and Socket.IO (defaults to 3000). |
| **`NODE_ENV`** | No | `production` / `development` | Runtime environment. |
| **`AWS_ACCESS_KEY_ID`** | **Yes** | `AKIAIOSFODNN7EXAMPLE` | AWS IAM access key for S3 bucket uploads and backups. |
| **`AWS_SECRET_ACCESS_KEY`** | **Yes** | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | AWS IAM secret key. |
| **`AWS_REGION`** | **Yes** | `ap-south-1` | AWS S3 Region. |
| **`AWS_S3_BUCKET`** | **Yes** | `studyasan-media` | AWS S3 Bucket Name. |
| **`JANUS_HTTP_API`** | **Yes** | `http://127.0.0.1:8088/janus` | Internal HTTP URL for Janus API calls. |
| **`JANUS_ADMIN_KEY`** | No | `janusoverlord` | Optional admin key if configured in `janus.plugin.videoroom.jcfg`. |
| **`DB_BACKUP_CRON_SCHEDULE`**| No | `0 2 * * *` | Cron schedule expression for automated DB backups (default 2 AM). |
| **`DB_BACKUP_RETENTION_COUNT`**| No | `30` | Number of daily S3 backups to retain before auto-pruning. |
| **`DATA_RETENTION_CRON_SCHEDULE`**| No | `0 3 * * *` | Cron schedule for data retention purge (default 3 AM). |
| **`GEMINI_API_KEY`** | No | `AIzaSy...` | Google Gemini API key for AI quiz & activity generation. |
| **`SMTP_HOST`** | No | `smtp.zoho.com` | Email SMTP host. |
| **`SMTP_PORT`** | No | `465` | Email SMTP port (465 for SSL, 587 for TLS). |
| **`SMTP_USER`** | No | `no-reply@studyasan.com` | SMTP username / sender account. |
| **`SMTP_PASSWORD`** | No | `••••••••` | SMTP password / app password. |
| **`SMTP_FROM_EMAIL`** | No | `StudyAsan <no-reply@studyasan.com>` | Default "From" email display header. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable Name | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **`VITE_API_URL`** | **Yes** | `/api` (or `https://acms.studyasan.com/api`) | Base URL for REST API requests. |
| **`VITE_JANUS_URL`** | **Yes** | `wss://janus.studyasan.com/janus` | Public Secure WebSocket endpoint for Janus WebRTC signaling. |
| **`VITE_FIREBASE_API_KEY`** | No | `AIzaSy...` | Firebase Web Push Notification key (if enabled). |
| **`VITE_FIREBASE_PROJECT_ID`** | No | `studyasan-app` | Firebase Project ID. |
| **`VITE_FIREBASE_VAPID_KEY`** | No | `BN...` | Firebase VAPID key for web push subscriptions. |
