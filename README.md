# EduForge AI — Production Question Paper Generator

A production-ready **AI Question Paper Generator** featuring **Role-Based Access Control (`OWNER`, `ADMIN`, `USER`), Subscription-Based Authorization (`FREE`, `BASIC`, `PREMIUM`), Technical Diagram Rendering, and Dual Printable A4 PDF Export (Student Question Paper + Confidential Answer Key)**.

This repository includes two complete ways to run the project locally:
1. **Full-Stack Web Application (Node.js + Express + React + TypeScript + Vite)** — Includes the full Authentication, Subscription & Billing Gateway, Owner/Admin Governance Console, and Interactive Question Paper Studio on port `3000`.
2. **Python + Streamlit Application (`app/app.py`)** — Includes the modular Python service architecture (`Pydantic`, `ReportLab`, `PyMuPDF`, `python-docx`, `google-genai`) on port `8501`.

---

## 1. Prerequisites

Before installing the project on your local machine, ensure you have the following installed:

- **Node.js**: `v20.x` or `v22.x` (LTS recommended) and **npm** (or **bun**)
- **Python** *(optional, for running the Streamlit app)*: `Python 3.10+` or `3.11+` and `pip`
- **Docker & Docker Compose** *(optional, for containerized deployment)*
- **Google Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/apikey)

---

## 2. Quick Start: Local Installation (Full-Stack Web App)

Follow these steps to run the complete Full-Stack Web App (with Authentication, Owner Subscription Exemption, Subscription Plans, and PDF Question Paper Generator) on your computer:

### Step 1: Clone or Download the Project

```bash
git clone <your-repository-url> eduforge-ai
cd eduforge-ai
```
*(If you downloaded the project as a ZIP archive from AI Studio, extract the ZIP folder and open a terminal inside the extracted root directory.)*

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Create and Configure the `.env` File

Copy the example environment file `.env.example` to `.env`:

```bash
# macOS / Linux
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` in your code editor and set your `GEMINI_API_KEY` and optional security secrets:

```env
# Required: Your Google Gemini API Key
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Configurable Gemini Model & Generation Parameters
GEMINI_MODEL=gemini-3.1-flash-lite-preview
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_OUTPUT_TOKENS=8192
QUESTION_BATCH_SIZE=15

# Application & Security Limits
MAX_UPLOAD_SIZE_MB=10
LOG_LEVEL=INFO
APP_URL=http://localhost:3000

# Authentication, Session & Owner Migration Configuration
OWNER_USERNAME=Akash00894
OWNER_EMAIL=owner@eduforge.ai
# Optional: Set OWNER_PASSWORD on first boot to rotate/initialize the OWNER bcrypt password hash
OWNER_PASSWORD=
OWNER_PASSWORD_HASH=
JWT_SECRET=replace_with_a_strong_random_64_char_secret
PAYMENT_WEBHOOK_SECRET=replace_with_a_strong_webhook_hmac_secret
SESSION_DURATION_HOURS=24
```

### Step 4: Database & Owner Account Initialization

- The application uses a relational schema (`Users`, `SubscriptionPlans`, `Subscriptions`, `Payments`, `UsageRecords`, `AuditLogs`, `Sessions`) defined in `data/schema.sql` and persisted automatically in `data/eduforge_db.json`.
- On server startup, `runStartupMigration()` in `src/server/authAndSubscription.ts` automatically verifies that the `OWNER` account (`Akash00894`) exists in the `Users` table with a cost-12 `bcrypt` `password_hash` and `role: "OWNER"`.
- If you supply `OWNER_PASSWORD` in `.env`, the startup migration automatically hashes it with `bcrypt` (cost factor 12) and updates the `OWNER` record in the database without ever storing plaintext passwords.

### Step 5: Run the Development Server

Start the full-stack Express + Vite server:

```bash
npm run dev
```

Open your browser and navigate to:

```text
http://localhost:3000
```

### Step 6: Production Build & Execution

To compile the frontend assets and run in production mode:

```bash
npm run build
NODE_ENV=production npm start
```

---

## 3. Local Installation (Python + Streamlit Application)

If you want to run the standalone **Python + Streamlit** version located in the `app/` directory:

### Step 1: Create and Activate a Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate on macOS / Linux
source .venv/bin/activate

# Activate on Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Activate on Windows (CMD)
.venv\Scripts\activate.bat
```

### Step 2: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure `.env`

Ensure `.env` in the project root contains your `GEMINI_API_KEY`:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

### Step 4: Start the Streamlit Server

```bash
streamlit run app/app.py
```

Open your browser at:

```text
http://localhost:8501
```

---

## 4. Running with Docker & Docker Compose

You can also build and run the application inside an isolated Docker container:

### Option A: Using Docker Compose (Recommended)

1. Ensure your `.env` file is present in the project root with `GEMINI_API_KEY` set.
2. Run:

```bash
docker compose up --build
```

### Option B: Using Docker CLI Directly

```bash
docker build -t eduforge-ai-generator .
docker run -p 8501:8501 --env-file .env eduforge-ai-generator
```

---

## 5. Authentication, Roles & Subscription Architecture

### Role-Based Access Control (RBAC)

| Role | Subscription Required? | Capabilities |
| :--- | :--- | :--- |
| **`OWNER`** (`Akash00894`) | **No** *(Bypasses subscription, expiry & usage limits)* | Full direct access to Question Paper Generator, Single-Question Regeneration, Custom Template Extraction, PDF & Answer Key Downloads, plus full **Owner & Admin Console** governance. |
| **`ADMIN`** | Subject to plan or admin assignment | Manage users, configure `SubscriptionPlans` in the database, assign user subscriptions, inspect webhook payments, and view `AuditLogs`. |
| **`USER`** | **Yes** (`ACTIVE` or valid `TRIAL`) | Access Question Paper Generator according to active subscription plan limits (`FREE`: 5 papers/month, `BASIC`: 50 papers/month, `PREMIUM`: 200 papers/month). |

### Authorization Flow on Protected APIs (`POST /api/generate-questions` & `POST /api/question-papers/generate`)

```text
User Login (POST /api/auth/login)
    ↓
Bcrypt Password Verification against Users Table
    ↓
Authenticated Session Token (HttpOnly Cookie + Bearer / CSRF Token)
    ↓
Check User Role
    ├── OWNER ───────────────→ Bypass Subscription & Usage Limits → Full Access
    │
    └── Normal User (USER) ──→ Validate Active Subscription (ACTIVE / TRIAL)
                                    ↓
                               Validate Plan Feature Permissions (Max Questions/Paper)
                                    ↓
                               Validate Monthly Usage Quota (UsageRecords Table)
                                    ↓
                               Allow Generation & Record Usage / Reject with 403
```

---

## 6. Project Directory Structure

```text
.
├── server.ts                              # Express backend entry point + Gemini API + Protected Routes
├── src/
│   ├── App.tsx                            # Main React workspace (Auth shell + 7-Step Generator)
│   ├── types.ts                           # Shared TypeScript interfaces
│   ├── server/
│   │   └── authAndSubscription.ts         # Users, Plans, Subscriptions, Payments, Usage & RBAC middleware
│   ├── components/
│   │   ├── LandingAndAuthView.tsx         # Landing page, Login, Register, Forgot & Reset Password
│   │   ├── SubscriptionAndDashboardView.tsx # Educator Dashboard, Pricing, Checkout & Webhook Simulator
│   │   ├── AdminOwnerConsoleView.tsx      # Owner/Admin Console (Users, Plans, Usage, Payments, Audit Logs)
│   │   ├── QuestionsEditorTab.tsx         # Interactive question editor & single-question regeneration
│   │   ├── PaperPreviewSheet.tsx          # Live A4 Student Paper & Answer Key sheet preview
│   │   └── PythonSourceModal.tsx          # Built-in Python/Streamlit code explorer
│   └── services/
│       ├── pdfGenerator.ts                # Printable A4 Student & Answer Key PDF builder (jsPDF)
│       ├── diagramRenderer.ts             # Automated technical SVG/Canvas diagram renderer for PDFs
│       ├── validationAndTemplate.ts       # Marks, count, duplicate validation & template parser
│       └── defaultSamplePaper.ts          # Initial sample configuration
├── data/
│   ├── schema.sql                         # SQL DDL schema for Users, SubscriptionPlans, Subscriptions, etc.
│   └── eduforge_db.json                   # Persistent relational database store (with migrated OWNER hash)
├── app/                                   # Complete Python + Streamlit implementation
│   ├── app.py
│   ├── config/
│   ├── models/
│   ├── services/
│   ├── utils/
│   └── tests/
├── .env.example                           # Environment variable template
├── package.json                           # Node.js scripts and dependencies
├── requirements.txt                       # Python dependencies
├── Dockerfile                             # Container image definition
└── docker-compose.yml                     # Docker Compose service configuration
```

---

## 7. Verification & Testing

- **TypeScript & Build Check**:
  ```bash
  npm run lint
  npm run build
  ```
- **Python Unit Tests**:
  ```bash
  pytest app/tests/ -v
  ```

---

## 8. Troubleshooting

1. **`GEMINI_API_KEY is not configured in server environment`**:
   - Ensure you created a `.env` file in the root folder and added `GEMINI_API_KEY=your_key`, then restart `npm run dev`.
2. **`Marks Validation Error: Configured question types sum to X marks, which does not match Maximum Marks`**:
   - Use the **Marks Presets (`40 Marks`, `80 Marks`, `100 Marks`)** in the top header or adjust the question counts/marks per question so their sum matches **Maximum Marks**.
3. **Port `3000` Already in Use**:
   - Stop any other process running on port `3000` (`lsof -i :3000` on macOS/Linux or `netstat -ano | findstr :3000` on Windows) before running `npm run dev`.
