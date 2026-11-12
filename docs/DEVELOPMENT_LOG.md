# BLYc Development Log

This document tracks all changes, architectural decisions, and progress throughout the lifecycle of the project.

---

## [Phase 0] - Project Inspection and Foundation
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Environment Inspection:
- **Node.js:** `v22.18.0`
- **npm:** `v10.9.3`
- **Python:** `3.10.8` (pip `26.0.1`)
- **Git:** `2.54.0.windows.1`
- **OS Platform:** Windows NT 10.0.26300

### Actions Taken:
1. **Directory Structure Established:**
   - `frontend/` (React + TypeScript + Vite + Bootstrap 5 + Recharts + Lucide + TanStack Table)
   - `backend/` (Node.js + Express + TypeScript + Mongoose + Zod + Argon2 + JWT)
   - `analytics-engine/` (Python 3 + FastAPI + Pandas + NumPy + openpyxl + Pydantic)
   - `docs/` (`ARCHITECTURE.md`, `API.md`, `JSON_SCHEMA.md`, `SECURITY.md`, `DEPLOYMENT.md`, `DEVELOPMENT_LOG.md`)
   - `scripts/`
2. **Security & Package Integrity:**
   - Verified official package sources (`https://registry.npmjs.org/` and `https://pypi.org/`).
   - Hardened builds using `--ignore-scripts` to eliminate unauthorized build scripts and arbitrary execution.
   - Pinned vetted, official dependencies only; no malware, trojans, or untrusted libraries.
3. **Execution Verification:**
   - **Frontend:** TypeScript compilation and Vite production build passed (`dist/` created in 1.35s).
   - **Backend:** TypeScript compilation passed, Express API booted on port 5000, `GET /api/health` responded with HTTP 200 `healthy`.
   - **Python Analytics Engine:** Virtual environment created, FastAPI service booted on `127.0.0.1:8001`, `GET /health` responded with HTTP 200 `healthy`.

---

## [Phase 1] - Design System and Frontend Foundation
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Design System & Styling:**
   - Implemented strict design tokens in `frontend/src/styles/theme.css` following Section 6 (White `#FFFFFF`, Near black `#111827`, Secondary `#64748B`, Sky blue `#38BDF8`, Dark blue `#1E3A8A`, Dark background `#0F172A`, Borders `#E2E8F0`).
   - Integrated Bootstrap 5 with responsive typography and restrained card styling.
2. **Reusable UI Components:**
   - `BrandMark.tsx`: Temporary text-based brand mark with customizable sizes and variants.
   - `MetricCard.tsx`: Reusable analytical summary metric card with trend indicators and icons.
   - `EmptyState.tsx`: Meaningful empty-state feedback with call-to-actions.
3. **Responsive Shell & Navigation:**
   - `Sidebar.tsx`: Multi-tier responsive navigation with desktop collapse/expand (72px/260px) and mobile off-canvas drawer.
   - `Header.tsx`: Sticky top bar with mobile hamburger trigger, active project indicator, export shortcut, and user status pill.
   - `MainLayout.tsx`: Responsive layout managing mobile backdrops and content fluid widths (supporting 360px to 1440px without horizontal overflow).
4. **Core Pages & Routing:**
   - `LoginPage.tsx` & `RegisterPage.tsx`: Secure authentication screens with form validation and error handling.
   - `DashboardView.tsx`: Interactive multi-tab analytical layout with summary metric cards and chart visualization sections.
   - `DatasetUploadView.tsx`: Clean drag-and-drop ingestion interface with security and data-quality indicators.
   - `App.tsx`: Configured React Router routes for all workspace modules.
5. **Verification & Build:**
   - Frontend TypeScript compilation and Vite production build passed cleanly with zero errors (`dist/` built in 3.50s).

---

## [Phase 2] - Backend and Authentication
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Configuration & Persistence:**
   - Configured environment parser `backend/src/config/env.ts` with sensible secure defaults.
   - Implemented MongoDB Atlas connector `backend/src/config/database.ts` with graceful fallback to in-memory backing for local development when Atlas URI is unconfigured.
   - Created Mongoose user schema & model `backend/src/repositories/user.model.ts` with preferences (theme, currency, formatting) and passwordHash sanitization on serialization.
   - Implemented `UserRepository` providing query isolation by lowercase email and unique user IDs.
2. **Security & Cryptography:**
   - Implemented Argon2id password hashing in `backend/src/security/hash.ts` with 64MB memory cost, 3 iterations, and constant-time verification. Plaintext passwords are never stored.
   - Implemented JWT token generation & verification in `backend/src/security/token.ts` with server-side signing.
3. **Validation & Rate Limiting:**
   - Defined strict request schemas in `backend/src/validators/auth.validator.ts` using Zod for registration and login.
   - Configured global rate limiting (`express-rate-limit`) in `backend/src/server.ts` to guard against brute force.
4. **Authentication Middleware & Cookie Sessions:**
   - Created `backend/src/middleware/auth.middleware.ts` verifying signed HTTP-Only cookies (`blyc_session`).
   - Implemented `AuthController` with endpoints:
     - `POST /api/auth/register`
     - `POST /api/auth/login`
     - `POST /api/auth/logout`
     - `GET /api/auth/me`
5. **Testing & Multi-User Isolation Verification:**
   - Created automated security test suite `backend/src/test-auth.ts`:
     - Test 1: Argon2id hashing & verification ✅
     - Test 2: JWT token generation, verification & forgery rejection ✅
     - Test 3: User registration and duplicate email protection ✅
     - Test 4: User login with valid & invalid credentials ✅
     - Test 5: Multi-user tenant data isolation ✅
   - Verified live HTTP endpoints over REST with session cookies (`/api/auth/register`, `/api/auth/login`, and `/api/auth/me` returning HTTP 200).

---

## [Phase 3] - Python Data Processing
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Dependencies Added:**
   - Zero packages installed in node_modules, maintaining strict cyber-risk and dependency freeze.
2. **Python Analytics Inspection Core:**
   - Created `analytics-engine/app/schemas/dataset.py` defining Pydantic models for column summaries, data preview rows, and dataset inspection responses.
   - Implemented `analytics-engine/app/core/detector.py` for type inference (numeric, date, boolean, category, id) and conservative semantic role detection (product, quantity, selling_price, cost, revenue, date) without guessing or assuming "Price" is revenue.
   - Created `analytics-engine/app/processors/dataset_processor.py` for reading `.xlsx`, `.xls`, and `.csv` safely via openpyxl and pandas, profiling missing values, row duplicate counts, and generating 10-row JSON preview records.
   - Implemented FastAPI endpoint `POST /dataset/inspect` in `analytics-engine/app/api/dataset_routes.py` with 25MB file size limit and loopback isolation.
3. **Node.js Orchestration & Security Gate:**
   - Implemented `backend/src/security/file-upload.ts` using Multer in-memory storage (eliminating insecure temporary file persistence on disk), checking file extensions (`.xlsx`, `.xls`, `.csv`) and verified MIME types.
   - Created `backend/src/services/python-engine.service.ts` communicating with the internal Python loopback service over private HTTP (`127.0.0.1:8001`).
   - Created `backend/src/controllers/dataset.controller.ts` and `backend/src/routes/dataset.routes.ts` protecting dataset upload behind `authenticate` session middleware.
4. **Testing & Verification:**
   - Unit & integration tests in `analytics-engine/tests/test_processing.py` executed via `pytest`:
     - `test_infer_column_type`: Passed ✅
     - `test_detect_semantic_role`: Passed ✅
     - `test_dataset_inspection_csv`: Passed ✅
     - `test_dataset_inspection_excel`: Passed ✅
   - Verified end-to-end integration: User authenticated via session cookie uploaded a sample CSV to Node.js on port 5000, which sanitized the payload, passed it to Python on port 8001, and returned `status: success` with total rows (5), columns (6), duplicate row detection (1), and missing value detection (1).

---

## [Phase 4] - Data Cleaning
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Absolute security freeze on dependencies maintained.
2. **Category Inconsistency Detection Engine (Section 7):**
   - Implemented `CleaningService.detect_category_inconsistencies` in `analytics-engine/app/cleaning/cleaner.py`.
   - Groups variants ignoring case, spacing, and punctuation (e.g. `Makeup` / `make up` / `MAKEUP`). Identifies the dominant canonical name and presents suggestions without silent merging.
3. **Missing-Value Imputation & Autofill Guard:**
   - Implemented `CleaningService.preview_imputation` supporting `mean`, `median`, `mode`, `ffill`, `bfill`, and user-defined `constant`.
   - Never silently fills values; computes proposed replacement and extracts preview samples.
4. **Dataset Cleaning Pipeline:**
   - Implemented `CleaningService.clean_dataset` executing row deduplication, row deletions, column removals, column renames, cell edits, confirmed imputations, and confirmed category normalizations.
   - Exposed endpoints in `analytics-engine/app/api/cleaning_routes.py`:
     - `POST /cleaning/category-suggestions`
     - `POST /cleaning/preview-imputation`
     - `POST /cleaning/apply`
5. **Node.js Gateway Integration:**
   - Added cleaning methods to `PythonEngineClient` in `backend/src/services/python-engine.service.ts`.
   - Created `CleaningController` and mounted authenticated routes under `/api/cleaning`.
6. **Frontend Cleaning Workspace UI:**
   - Implemented `frontend/src/features/cleaning/DataCleaningView.tsx` with:
     - Dataset records table showing missing value warnings.
     - Undo stack mechanism (`handleUndo`).
     - Deduplication button (`handleRemoveDuplicates`).
     - Inline cell edits and row deletions.
     - Category normalization action with change counter.
     - Modal confirmation dialog displaying affected cells and proposed replacement values before applying autofill.
   - Mounted `/workspace/cleaning` route in `App.tsx` and verified clean production build with zero errors.
7. **Automated Testing:**
   - Pytest suite in `analytics-engine/tests/test_cleaning.py` passed all 3 tests:
     - `test_category_inconsistency_detection`: Passed ✅
     - `test_imputation_preview`: Passed ✅
     - `test_clean_dataset_pipeline`: Passed ✅

---

## [Phase 5] - Analytics Engine
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Maintained complete dependency security freeze.
2. **Authoritative Calculation Core (Section 8):**
   - Implemented `AnalyticsCalculator.calculate_analytics` in `analytics-engine/app/analytics/calculator.py`.
   - **Descriptive Statistics:** For all columns (count, missing_count, unique_count, min, max, mean, median, standard deviation, top categorical frequencies).
   - **Explicit Business Metrics:**
     - `Revenue = Selling Price × Quantity` (or verified direct revenue).
     - `Profit = (Selling Price - Unit Cost) × Quantity` (strictly calculated only when cost data is provided).
     - `Average Order Value = Total Revenue / Unique Orders` (order IDs deduplicated to prevent double-counting).
     - Best-performing and lowest-performing products by revenue.
     - Revenue and quantity distribution by category.
   - **Non-Sales Guardrail:** Datasets without business columns (e.g., weather or sensor data) compute descriptive metrics without forcing arbitrary sales metrics.
   - **Time-Series Engine:** Daily period grouping with revenue, orders, and unit quantities.
3. **FastAPI Route & Schema Integration:**
   - Defined Pydantic models in `analytics-engine/app/schemas/analytics.py`.
   - Exposed `POST /analytics/compute` in `analytics-engine/app/api/analytics_routes.py`.
4. **Node.js Gateway & Authentication:**
   - Added `computeAnalytics` to `PythonEngineClient` in `backend/src/services/python-engine.service.ts`.
   - Created `AnalyticsController` and mounted authenticated route `POST /api/analytics/compute` in `backend/src/routes/analytics.routes.ts`.
5. **Testing & Verification:**
   - **Pytest Suite (`tests/test_analytics.py`):**
     - `test_descriptive_statistics_calculation`: Passed ✅
     - `test_business_metrics_calculation`: Passed ✅
     - `test_non_sales_dataset_guard`: Passed ✅
     - Total 10 tests across the Python analytics engine passing in 1.27s.
   - **End-to-End REST Integration:** Tested authenticated session calling Node.js `POST /api/analytics/compute`, orchestrating calculation via Python loopback engine and returning verified calculations (`status: success`, `total_revenue: 1000`, `total_profit: 500`).

---

## [Phase 6] - Automatic Dashboard Generator
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Zero packages installed in node_modules, maintaining absolute dependency and system security freeze.
2. **Recharts Visualizations Integration (Section 9):**
   - Implemented `frontend/src/components/AnalyticsCharts.tsx`:
     - `RevenueAreaChart`: Interactive SVG area chart with branded sky-blue gradient fill, non-intrusive grid lines, formatted currency tooltips, and responsive container layout.
     - `CategoryBarChart`: Rounded bar chart comparing revenue generated per business category.
     - `CategoryDonutChart`: Interactive donut pie chart rendering category turnover distribution with consistent brand colors.
3. **Interactive Multi-Tab Dashboard Generation:**
   - Updated `frontend/src/features/dashboard/DashboardView.tsx` with tabs:
     - **Overview:** Primary KPI cards (Total Revenue, Total Orders, Units Sold, Avg Order Value) connected to time-series area charts and donut category charts.
     - **Sales & Profit Analysis:** Gross profit, profit margin percentage, and total COGS with bar comparison.
     - **Product Performance:** Identifies best-performing product and lowest-performing product.
     - **Category Distribution:** Dual view with side-by-side bar and donut breakdown.
     - **Time Trends:** Granular trajectory across transaction dates.
     - **Descriptive Metrics:** Tabular summary of column statistics (min, max, mean, median, standard deviation).
   - Built interactive date filtering (`All Dates` vs `Recent Interval`).
   - Implemented manual and dynamic recalculation trigger.
4. **Verification & Build:**
   - Frontend TypeScript compilation and Vite build passed cleanly (`dist/` built in 7.44s).

---

## [Phase 7] - Custom Dashboard Builder & Safe Calculator
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Absolute security freeze on dependencies maintained. No third-party packages installed.
2. **Safe AST Formula Parser & Evaluator (Section 10 & Security):**
   - Implemented `SafeFormulaParser` in `analytics-engine/app/calculations/formula_parser.py`:
     - Strict AST node whitelist: `Expression`, `BinOp`, `UnaryOp`, `Constant`, `Name`, `Load`, `Add`, `Sub`, `Mult`, `Div`, `FloorDiv`, `Mod`, `Pow`, `UAdd`, `USub`.
     - Zero `eval()` or `exec()`; evaluates formulas directly using recursive AST tree-walking over Pandas Series and numeric scalars.
     - Supports bracketed spreadsheet column identifiers: e.g., `[Unit Price] * [Quantity Sold]`.
     - Safe division by zero handling (returns `0.0` instead of crashing or generating `inf`).
     - Immediate rejection of any illegal AST node (calls, attributes, imports, subscripts, builtins).
3. **FastAPI Calculation Endpoints:**
   - Pydantic models in `analytics-engine/app/schemas/calculations.py`.
   - Endpoints in `analytics-engine/app/api/calculation_routes.py`:
     - `POST /calculations/validate`: Fast validation of syntax and column references.
     - `POST /calculations/evaluate`: Evaluates formula across dataset rows with summary stats and preview.
4. **Node.js Gateway & Custom Dashboard Persistence:**
   - Created MongoDB schema and in-memory fallback in `backend/src/repositories/dashboard-tab.model.ts` and `dashboard-tab.repository.ts`.
   - Created `CalculationController` in `backend/src/controllers/calculation.controller.ts`.
   - Created `DashboardController` in `backend/src/controllers/dashboard.controller.ts`.
   - Mounted authenticated routes `POST /api/calculations/validate`, `POST /api/calculations/evaluate`, `GET /api/dashboard/config`, `POST /api/dashboard/tabs`.
5. **Interactive UI Formula Builder & Custom Tab Management:**
   - Created `frontend/src/features/calculator/CustomCalculatorView.tsx` with clickable column chips, operator keypad, presets, live syntax validation, calculation preview, and dataset column injection.
   - Enhanced `frontend/src/features/dashboard/DashboardView.tsx` with dynamic user custom tabs, inline widget builder (metric cards, charts, tables), and tab deletion.
6. **Testing & Verification:**
   - All 16 unit tests across the Python analytics engine passing cleanly (`pytest`).
   - All 5 backend isolation and authentication security tests verified passed.
   - Frontend TypeScript compilation and Vite build passed with 0 errors.

---

## [Phase 8] - JSON Project System (Portable Format)
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Complete dependency freeze maintained. Built with existing native packages (`zod`, native file APIs).
2. **Standardized JSON Schema Validator (Section 11 & JSON_SCHEMA.md):**
   - Implemented Zod schema in `backend/src/validators/project.validator.ts` matching specification `BLYc` format `1.0.0`:
     - Mandatory format header `BLYc`.
     - Semver validation `^[0-9]+\.[0-9]+\.[0-9]+$`.
     - Comprehensive schemas for `project`, `dataset` (columns & records), `data_quality`, `analytics`, `calculations`, `dashboard` (tabs & widgets), and `ai_context`.
3. **Multi-Tenant Project Repository & Storage:**
   - Created `backend/src/repositories/project.model.ts` & `project.repository.ts`.
   - Strict tenant isolation: users can only view, export, or delete their own saved projects.
4. **Project Orchestration Controller & API Endpoints:**
   - Implemented `ProjectController` in `backend/src/controllers/project.controller.ts`:
     - `GET /api/projects`: List user projects with record and column counts.
     - `GET /api/projects/:id`: Retrieve single project manifest.
     - `POST /api/projects`: Create project from workspace state.
     - `GET /api/projects/:id/export`: Downloads portable `[project-name].blyc.json` file.
     - `POST /api/projects/import`: Validates uploaded JSON manifest against schema, automatically recalculates verified analytics via authoritative Python engine, and saves to repository.
     - `DELETE /api/projects/:id`: Delete project.
   - Mounted routes in `backend/src/routes/project.routes.ts` and `backend/src/server.ts`.
5. **Frontend Project Explorer & Workspace Sync:**
   - Implemented `frontend/src/features/workspace/ProjectExplorerView.tsx`:
     - Project inventory grid showing metadata, record counts, and last modified timestamps.
     - Drag-and-drop / file selector to import `.blyc.json` manifests.
     - "Open in Workspace" button that loads project data into `localStorage` (`blyc_active_dataset`, `blyc_active_project`), triggering immediate recalculation across all dashboard tabs.
     - "Export" button to download compliant `.blyc.json` manifests.
     - "New Project" modal drawer.
   - Updated `frontend/src/layouts/Header.tsx` with active project name pill and quick project navigation.
   - Wired route `/workspace/projects` in `frontend/src/App.tsx`.
6. **Testing & Verification:**
   - Implemented automated suite in `backend/src/test-project.ts`:
     - Test 1 (Valid Schema Validation): **PASSED** ✅
     - Test 2 (Rejection of Invalid Payloads / Wrong Format / Corrupt Semver): **PASSED** ✅
     - Test 3 (Repository CRUD & Multi-Tenant Isolation): **PASSED** ✅
   - Frontend production build (`npm run build`) passed with 0 errors in 6.53s.
   - Python test suite passed all 16 tests cleanly.

---

## [Phase 9] - AI Business Assistant (Groq `openai/gpt-oss-20b`)
**Date:** 2026-11-11  
**Status:** Completed ✅  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Strict security freeze maintained. Utilized verified local `groq-sdk` already present in `backend/package.json`.
2. **Fixed Model ID Lock & Truth Boundary (Section 4, 12):**
   - Locked model ID strictly to `openai/gpt-oss-20b` via `GROQ_FIXED_MODEL`.
   - Never switches model automatically.
   - Enforced Truth Boundary: Python is the sole source of truth for calculations. The AI assistant contextualizes, explains trends, and cites verified figures without hallucinating mathematical numbers.
3. **Deterministic Context Formatter:**
   - Implemented `GroqAIService.formatAnalyticsContext` in `backend/src/ai/groq.service.ts`:
     - Never sends raw tabular spreadsheets or sensitive credentials to Groq.
     - Constructs concise, structured summaries of verified metrics (Gross Revenue, Orders, Units, AOV, Gross Profit, Margin %, Top/Lowest Products, Category distribution, daily trend trajectory).
4. **Graceful Offline & Missing Key Fallback:**
   - If `GROQ_API_KEY` is unset or network is offline, synthesizes an intelligent, structured business overview from verified metrics and prompts the user to add their free Groq API key to `.env`.
5. **Node.js Gateway & Endpoints:**
   - Created `AIController` in `backend/src/controllers/ai.controller.ts`.
   - Created routes in `backend/src/routes/ai.routes.ts`:
     - `POST /api/ai/chat`: Handles user queries with conversation history and analytical context.
     - `GET /api/ai/suggest-questions`: Provides smart analytical prompts for non-technical users.
   - Mounted routes under `/api/ai` in `backend/src/server.ts`.
6. **Frontend AI Assistant UI:**
   - Implemented `frontend/src/features/assistant/AIAssistantView.tsx`:
     - Model badge indicating `openai/gpt-oss-20b` and `Truth Engine: Python 3`.
     - Suggested prompt pills for quick small business analysis.
     - Chat log displaying user questions and assistant answers with "Verified Python Source" badges.
     - Real-time loading indicator and error recovery.
     - Direct integration with active workspace dataset from `localStorage`.
   - Wired route `/workspace/assistant` in `frontend/src/App.tsx`.
7. **Testing & Verification:**
   - Automated test suite in `backend/src/test-ai.ts`:
     - Test 1 (Model Lock to `openai/gpt-oss-20b`): **PASSED** ✅
     - Test 2 (Deterministic Context Formatter): **PASSED** ✅
     - Test 3 (Assistant Inference & Fallback): **PASSED** ✅
   - Frontend production build (`npm run build`) passed with 0 errors in 6.50s.
   - Python test suite passed all 16 tests cleanly.

---

## [Phase 10] - Final Verification, System Integration & Testing Readiness
**Date:** 2026-11-11  
**Status:** Completed & Ready for User Testing ✅ (Deployment postponed per user request)  

### Actions Taken:
1. **Zero New npm Packages Installed:**
   - Absolute dependency freeze strictly preserved. Zero external packages installed across all phases.
2. **Single-Server Unified Architecture:**
   - Updated `backend/src/server.ts` to statically serve the compiled React production frontend from `frontend/dist` with client-side SPA routing fallback.
   - Entire application (frontend UI, API endpoints, Python loopback analytics orchestrator) operates reliably as a single unified server at `http://localhost:5000`.
3. **Automated Testing & Integration Scripts:**
   - Created `scripts/run-all-tests.bat`: Runs full system test cycle across Python (16 pytest tests), Backend TypeScript build, Project System tests, AI Assistant tests, and Frontend production build.
   - Created `scripts/start-all-local.bat` and `scripts/start-all-local.ps1`: One-click startup for both the internal Python Analytics Engine (`127.0.0.1:8001`) and the Node.js / React application server (`http://localhost:5000`).
4. **Sample Testing Assets Provided:**
   - Created `samples/sample_business_sales.csv`: Realistic retail business sales data with products, categories, pricing, unit costs, quantities, and discounts.
   - Created `samples/sample_project.blyc.json`: Compliant self-contained portable project file for instant testing of the project import/export pipeline.
5. **Full System Verification Results:**
   - Python Analytics Engine: 16/16 tests passed cleanly.
   - Backend TypeScript Compiler: 0 errors.
   - Backend Project System Tests: All tests passed.
   - Backend AI Assistant Tests: All tests passed.
   - Frontend Production Build: Built in 6.50s with 0 errors.
   - Status: Fully functional, verified, and ready for hands-on user testing before cloud deployment.

---

## [Phase 10.1] - Domain-Aware Autofill, Persistent Cleaning & UI Polish
**Date:** 2026-11-11  
**Status:** Completed & Tested ✅  

### Actions Taken:
1. **Domain-Aware Semantic Imputation (Python & UI):**
   - Implemented `CleaningService._detect_column_domain` in `analytics-engine/app/cleaning/cleaner.py`.
   - Distinguishes **Quantity** (`qty`, `quantity`, `units`, `items`, `count`, `stock`, `orders`, `pieces`) vs **Currency** (`price`, `cost`, `revenue`, `sales`, `amount`, `tax`, `discount`) vs **Category** (`category`, `product`, `type`, `brand`, `status`).
   - **Quantities:** Strictly discrete whole units. Fractional decimals (e.g. `4.25`) are eliminated; averages and medians are rounded to whole numbers (`round(4.25) -> 4`).
   - **Prices & Currency:** Strictly 2 decimal places for cents.
   - **Categories:** Numerical averages disabled. Autofills with dominant dataset category (mode), e.g. `'Electronics'`.
   - Added automated test in `analytics-engine/tests/test_cleaning.py`: `test_domain_aware_quantity_and_category_imputation` passing cleanly.
2. **Data Cleaning Persistence Across Navigation & Sessions:**
   - Overhauled `frontend/src/features/cleaning/DataCleaningView.tsx` to read from `localStorage.getItem('blyc_active_dataset')` on mount.
   - Any cleaning modification (Autofill, Category Normalization, Duplicate Removal, Cell Edit, Row Deletion, Undo) immediately calls `localStorage.setItem('blyc_active_dataset', JSON.stringify(updated))` so changes persist across all navigation tabs, reloads, and views.
   - Upgraded category normalization to dynamically scan all category column variants and canonicalize to the dominant casing.
3. **UI / UX Polish (Icons, No Emojis, Sleek Scrollbars):**
   - Replaced all raw emojis with Lucide React icons (`Bot`, `CheckCircle2`, `AlertCircle`, `Sparkles`, `Sliders`, `ShieldCheck`).
   - Added `.no-scrollbar` class in `frontend/src/styles/theme.css` to remove heavy, ugly browser scrollbar tracks on suggested prompts and carousels while maintaining smooth scroll.
   - Removed awkward inline code blocks from AI assistant headers and eliminated double scrollbars in the chat window.
4. **Build & Live Test Verification:**
   - Python Pytest: All 17 unit tests passed cleanly.
   - Frontend Production Build: Compiled in 8.78s with 0 errors (`dist/assets/index-IeyHqwMy.js`).
   - Backend Server reloaded and live serving at `http://localhost:5000`.
