# BLYc System Architecture

## 1. Overview
BLYc is an automated business analytics calculator designed with a logical **N-tier architecture**, operating on a unified deployment model (single-server hostable or containerized).

```mermaid
flowchart TD
    subgraph Client ["Tier 1: Presentation Layer"]
        ReactUI["React + Vite + TS (Bootstrap 5, Recharts, TanStack Table)"]
    end

    subgraph Host ["Single Server Boundary"]
        subgraph Tier2 ["Tier 2: Application / API Layer"]
            NodeAPI["Node.js + Express.js (Port 5000)"]
            Auth["Argon2id + JWT + HTTP-Only Cookies"]
            Orchestrator["Analytics & AI Context Orchestrator"]
            NodeAPI --- Auth
            NodeAPI --- Orchestrator
        end

        subgraph Tier3 ["Tier 3: Processing Layer (Private localhost only)"]
            FastAPI["Python 3 + FastAPI (Port 8001)"]
            Pandas["Pandas / NumPy / openpyxl Engine"]
            FastAPI --- Pandas
        end
    end

    subgraph Tier4 ["Tier 4: Persistence Layer"]
        Mongo["MongoDB Atlas (Users, Configurations, Project Metadata)"]
    end

    subgraph Tier5 ["Tier 5: AI Interpretation Layer"]
        Groq["Groq API (openai/gpt-oss-20b)"]
    end

    ReactUI -->|HTTPS / REST| NodeAPI
    Orchestrator -->|Internal HTTP / Private| FastAPI
    NodeAPI -->|Mongoose TLS| Mongo
    Orchestrator -->|HTTPS SDK Context-Only| Groq
```

---

## 2. Layer Responsibilities & Isolation

### Tier 1: Presentation Layer (React + Vite + TypeScript)
- Client-side data interaction, state management, and visualizations.
- Never directly contacts MongoDB, Python FastAPI, or Groq. All calls are routed through Tier 2.
- No secrets or API credentials reside in the frontend client.

### Tier 2: Application / API Layer (Node.js + Express)
- Serves as the central API gateway and security boundary.
- Enforces user authentication, authorization, session validation, and tenant/project data isolation.
- Manages dataset file uploads (validation, sanitization, passing to Python service).
- Token-budgeted context extraction for AI requests; sends only sanitized, verified statistical facts to Tier 5.

### Tier 3: Data Processing Layer (Python 3 + FastAPI)
- Bound strictly to internal loopback (`127.0.0.1:8001`), shielded from public internet exposure.
- Authoritative calculation engine for spreadsheet parsing, duplicate detection, category normalization, statistical profiling, and formula execution.
- Safe AST formula parsing prevents arbitrary code execution (`eval` and `exec` strictly prohibited).

### Tier 4: Persistence Layer (MongoDB Atlas)
- Stores user accounts, preferences, dashboard configurations, custom calculation metadata, and project manifests.
- Raw spreadsheet data is not permanently stored in MongoDB in MVP; data lives in portable JSON project manifests and user session storage.

### Tier 5: AI Interpretation Layer (Groq API)
- Fixed model: `openai/gpt-oss-20b`.
- Acts strictly as an interpretation and explanation assistant based on verified Python calculations. Never serves as the primary calculation source.
