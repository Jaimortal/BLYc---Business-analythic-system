# BLYc REST API Specification

All endpoints are served under `/api` by the Node.js API orchestrator (Tier 2).

## Authentication & Session
- `POST /api/auth/register` - Create user account (Argon2id password hashing)
- `POST /api/auth/login` - Authenticate user, issue secure HTTP-only JWT cookie
- `POST /api/auth/logout` - Clear session cookie
- `GET /api/auth/me` - Validate session and retrieve current user context

## Dataset & Processing (Orchestrated with Python Engine)
- `POST /api/dataset/upload` - Secure file upload (`.xlsx`, `.xls`, `.csv`), validates magic bytes and routes to internal Python engine
- `POST /api/dataset/clean` - Submit confirmed data-cleaning actions (imputation, deduplication, category normalization)
- `GET /api/dataset/preview` - Fetch paginated preview and quality summary

## Analytics & Dashboards
- `GET /api/analytics/summary` - Retrieve automatically calculated descriptive and business metrics
- `POST /api/analytics/recalculate` - Recalculate metrics upon user modifications
- `GET /api/dashboard/tabs` - Retrieve configured dashboard tabs and visualization settings
- `POST /api/dashboard/tabs` - Update or create custom dashboard tabs and widgets

## Project Persistence & Export/Import
- `GET /api/projects` - List user projects
- `POST /api/projects` - Save/update project metadata
- `GET /api/projects/:id/export` - Export versioned BLYc JSON project, cleaned Excel workbook, or CSV
- `POST /api/projects/import` - Import and validate an existing BLYc JSON project file

## AI Assistant (Groq API `openai/gpt-oss-20b`)
- `POST /api/ai/ask` - Submit a natural-language question regarding verified business analytics
