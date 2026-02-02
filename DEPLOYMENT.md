# Deployment Guide

This guide covers deploying the Work Tracker application across all platforms.

## Architecture Overview

```
┌─────────────────────────┐
│  Frontend (React)       │ → Vercel
│  client/                │
└─────────────────────────┘

┌─────────────────────────┐
│  Backend (Express)      │ → Render
│  server/                │
└─────────────────────────┘

┌─────────────────────────┐
│  Desktop (Electron)     │ → GitHub Releases
│  client/electron/       │
└─────────────────────────┘

┌─────────────────────────┐
│  Database (MongoDB)     │ → MongoDB Atlas
│                         │
└─────────────────────────┘
```

---

## 1. Backend Deployment (Render)

### Prerequisites
- Render account (free tier available at render.com)
- MongoDB Atlas account (free tier at mongodb.com)
- GitHub repository pushed

### Steps

#### 1.1 Create MongoDB Atlas Database

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free tier cluster
3. Create database user with password
4. Whitelist IP: `0.0.0.0/0` (or your specific IP)
5. Copy connection string: `mongodb+srv://user:password@cluster.mongodb.net/work-tracker`

#### 1.2 Deploy to Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `work-tracker-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/work-tracker
   JWT_SECRET=your-secret-key-here (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   NODE_ENV=production
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```
6. Deploy

**Backend URL** → `https://work-tracker-backend.onrender.com`

---

## 2. Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (free tier at vercel.com)
- Backend URL from Render deployment

### Steps

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select `client` folder as root:
   - **Root Directory**: `client`
4. Configure environment variables:
   ```
   VITE_API_URL=https://work-tracker-backend.onrender.com
   ```
5. Deploy

**Frontend URL** → `https://work-tracker.vercel.app`

---

## 3. Desktop App Releases (GitHub)

### Prerequisites
- Git tag created (v1.0.0)
- GitHub repository

### Automatic Release Process

The GitHub Actions workflow automatically:
- Builds for Windows, macOS, and Linux
- Creates GitHub Release with installers

#### To Create a Release

1. **Bump version** in `client/package.json`:
   ```json
   "version": "1.0.1"
   ```

2. **Create and push tag**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **Workflow automatically**:
   - ✅ Builds all 3 installers
   - ✅ Creates GitHub Release
   - ✅ Uploads installers to releases

4. **Users download from**: GitHub → Releases → Download installer for their OS

### Manual Build (if needed)

```bash
cd client
npm install

# Windows
npm run electron:build:win
# Output: dist-electron/TimeFlow Setup.exe

# macOS
npm run electron:build:mac
# Output: dist-electron/TimeFlow.dmg

# Linux
npm run electron:build:linux
# Output: dist-electron/TimeFlow-*.AppImage
```

---

## 4. Auto-Update Configuration

The desktop app automatically checks for updates from GitHub Releases.

### How it works:
1. App checks GitHub releases on startup
2. If new version found → Download in background
3. Shows notification when ready
4. Installs on next restart

### Configuration in `electron/main.js`:
```javascript
import setupUpdater from './updater.js';
setupUpdater(); // Initialize auto-updater
```

---

## Environment Variables Reference

### Backend (.env)
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-secret-key
NODE_ENV=production
CORS_ORIGIN=https://your-vercel-frontend.vercel.app
PORT=3000
```

### Frontend (.env.local in client/)
```
VITE_API_URL=https://your-render-backend.onrender.com
```

---

## Post-Deployment Checklist

- [ ] Backend API responding at Render URL
- [ ] Frontend loads from Vercel URL
- [ ] Frontend can connect to backend API
- [ ] Database connection working
- [ ] Login functionality working
- [ ] Created first GitHub release tag
- [ ] Desktop app auto-updates enabled
- [ ] CORS properly configured

---

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_URL` environment variable
- Verify backend CORS_ORIGIN matches frontend URL
- Check backend is running on Render

### GitHub Actions workflow not triggering
- Ensure tag follows pattern: `v*.*.*` (v1.0.0)
- Check repository has GitHub token (auto-included)

### Auto-updates not working
- Ensure electron-updater is installed: `npm install electron-updater`
- Repository must be public for GitHub releases
- Check updater.js is imported in main.js

---

## Deployment Costs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel | Yes | Frontend, limited builds |
| Render | Yes | Backend with limitations |
| MongoDB Atlas | Yes | 512MB storage, adequate for testing |
| GitHub Actions | Yes | Free for public repos |
| GitHub Releases | Yes | Free storage |

**Total**: Can run entire stack free during development phase.

---

## Next Steps

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Test connectivity
4. Create first GitHub release
5. Distribute desktop app link to users
