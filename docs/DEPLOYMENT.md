# BLYc Single-Server Deployment Guide (Ubuntu VPS & Windows Dev)

## 1. Unified Single-Server Topology
BLYc operates as a unified single-server deployment running on a low-cost Ubuntu VPS or Windows development machine.

- **Port 5000 (Tier 2 Node.js API Gateway):** Exposed publicly behind Nginx or Caddy reverse proxy.
  - Serves compiled static frontend assets (`frontend/dist/`).
  - Exposes REST API routes (`/api/...`).
- **Port 8001 (Tier 3 Python FastAPI Engine):** Internal loopback only (`http://127.0.0.1:8001`). Shielded from public access.
- **Port 5173 (Tier 1 React Vite Dev Server):** Local development mode only.

---

## 2. Windows Local Development Startup

### Terminal 1: Python Analytics Engine
```powershell
cd analytics-engine
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### Terminal 2: Node.js Backend API
```powershell
cd backend
npm run build
npm start
```

### Terminal 3: React Frontend (Dev)
```powershell
cd frontend
npm run dev
```

---

## 3. Ubuntu VPS Production Deployment Guide

### Step 1: System Packages & Runtime Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git python3 python3-venv python3-pip nginx certbot python3-certbot-nginx

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 2: Install Process Manager (PM2)
```bash
sudo npm install -g pm2
```

### Step 3: Clone Repository & Configure Environment
```bash
git clone <repository_url> /var/www/blyc
cd /var/www/blyc
cp .env.example .env
nano .env # Configure MongoDB URI, JWT Secrets, Groq API Key
```

### Step 4: Build Frontend & Install Backend
```bash
# Frontend Build
cd /var/www/blyc/frontend
npm ci --ignore-scripts
npm run build

# Backend Setup
cd /var/www/blyc/backend
npm ci --ignore-scripts
npm run build
```

### Step 5: Setup Python Virtual Environment
```bash
cd /var/www/blyc/analytics-engine
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

### Step 6: Start Services via PM2
Create `ecosystem.config.js` in `/var/www/blyc`:
```javascript
module.exports = {
  apps: [
    {
      name: "blyc-python",
      cwd: "./analytics-engine",
      script: "./venv/bin/python",
      args: "-m uvicorn app.main:app --host 127.0.0.1 --port 8001",
      instances: 1,
      autorestart: true,
      env: {
        PYTHONPATH: "."
      }
    },
    {
      name: "blyc-backend",
      cwd: "./backend",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
```
Start PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 7: Configure Nginx Reverse Proxy
```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 25M;
}
```
Enable SSL via Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```
