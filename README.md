# BLYc — Business Analytics Calculator

**Upload your data. Understand your business.**

BLYc is an automated business analytics calculator designed primarily for small businesses, startups, independent sellers, and non-technical business owners. It inspects spreadsheets (Excel, CSV), identifies anomalies and data quality issues, automatically computes statistics and business performance indicators, renders responsive visual dashboards, provides a custom calculation engine, and integrates an AI business interpretation assistant.

---

## 🛠️ Technology Stack


- **Presentation Layer (Tier 1):** React, Vite, TypeScript, Bootstrap 5, Recharts, TanStack Table, Lucide React.
- **Application / API Layer (Tier 2):** Node.js, Express.js, MongoDB Atlas (Mongoose), JWT authentication with HTTP-only cookies, Zod validation, Helmet security.
- **Data Processing Layer (Tier 3):** Python 3, FastAPI, Pandas, NumPy, openpyxl, Pydantic. Bound strictly to internal loopback (`127.0.0.1:8001`).
- **Persistence Layer (Tier 4):** MongoDB Atlas (User authentication, dashboard layouts, custom calculation metadata, project manifests).
- **AI Interpretation Layer (Tier 5):** Groq API utilizing pinned model `openai/gpt-oss-20b`.

---

## 🏗️ Architecture Overview

BLYc implements an N-tier logical architecture designed for single-server hostability:
- **Client (React UI)** communicates strictly with **Tier 2 (Node API Gateway)** via HTTPS/REST.
- **Tier 2** handles authentication, multi-tenant isolation, project security, and relays data processing tasks to **Tier 3 (Python FastAPI)** over private localhost.
- **Tier 2** acts as the AI Context Orchestrator, assembling sanitized, token-budgeted analytics context to send to **Tier 5 (Groq API)**. The raw datasets and private credentials are never sent to third-party AI APIs.

For full architectural diagrams and specifications, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v20+` or `v22+`
- Python `3.10+`
- MongoDB Atlas account (free tier)
- Groq API Key (free tier)

### Environment Configuration
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### Installation
1. Install Python Analytics Engine:
```bash
python -m venv analytics-engine/venv
./analytics-engine/venv/Scripts/python -m pip install -r analytics-engine/requirements.txt
```

2. Install Node.js Backend:
```bash
cd backend
npm install
npm run build
```

3. Install React Frontend:
```bash
cd frontend
npm install
npm run build
```

---

## 🏃 How to Run the Project

### Option A: Quick Start (Recommended — One Click / One Script)

#### Windows Batch:
Double-click or run from the root project folder:
```cmd
.\scripts\start-all-local.bat
```

#### Windows PowerShell:
```powershell
.\scripts\start-all-local.ps1
```

Both services will launch in separate terminal windows automatically:
- **Python Engine:** `http://127.0.0.1:8001`
- **BLYc Web App & API:** `http://localhost:5000`

---

### Option B: Manual Start (Step-by-Step in 2 Terminals)

#### Terminal 1 — Python Analytics Engine:
```powershell
cd analytics-engine
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```
> *(Keep this terminal running. The Python engine handles statistical formulas, column profiling, data cleaning, and calculations)*

#### Terminal 2 — Node.js Backend & Unified Web App:
```powershell
cd backend
npm start
```
> *(Serves the production frontend bundle and API endpoints at `http://localhost:5000`)*

Now open your browser and navigate to:
👉 **`http://localhost:5000`**

---

### Option C: Development Mode (with Vite Frontend Hot-Reloading)

If you are modifying frontend UI code and want instant hot-reloading:

1. **Terminal 1 (Python):**
   ```powershell
   cd analytics-engine
   .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
   ```

2. **Terminal 2 (Backend API):**
   ```powershell
   cd backend
   npm run dev
   ```

3. **Terminal 3 (Vite Frontend):**
   ```powershell
   cd frontend
   npm run dev
   ```
   Open: **`http://localhost:5173`**

---

## 🔄 Rebuilding After Code Changes

If you make changes to frontend React components or backend TypeScript code:

```powershell
# Rebuild Frontend:
cd frontend
npm run build

# Rebuild Backend:
cd ../backend
npm run build
```

---

## 🧪 Running Automated Tests

To run the complete test suite (Python test suite + backend integration tests):
```cmd
.\scripts\run-all-tests.bat
```

Or test Python cleaning & analytics directly:
```powershell
cd analytics-engine
.\venv\Scripts\python.exe -m pytest tests -v
```

---

## 👥 Credits

**Project Owner:** Jaime Perez  
**Architecture, Prompt Engineering & Integration:** Jaime Perez  
**AI-Assisted Development:**
- **ChatGPT:** Architecture planning, system design, and security guidance.
- **Google Gemini:** Primary AI programmer and implementation assistant.
- **Claude:** Additional AI development assistance and review.
