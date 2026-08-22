# HealthChain360 Architecture Guide

Welcome to the HealthChain360 codebase. This document serves as the primary map for new developers onboarding onto the project. 

This application uses a highly modular **Feature-Sliced Design**, optimized for Vite code-splitting, aggressive offline caching, and strict serverless security.

## Core Tech Stack
* **Frontend:** React 18, Vite, React Router, TailwindCSS, Lucide Icons
* **Global State:** Zustand (stores/), React Query
* **Offline Storage:** \idb-keyval\ (IndexedDB) for heavy data, \localStorage\ for sync state
* **Backend:** Vercel Serverless Functions (Node.js)
* **Database & Auth:** Supabase (PostgreSQL, Row-Level Security)
* **AI Provider:** Google Gemini 2.5 Flash
* **Payments:** Razorpay

---

## Directory Structure

\\\	ext
/
├── api/                  # Vercel Serverless Functions (Backend)
│   ├── cron/             # Scheduled tasks (e.g., revoking expired entitlements)
│   ├── utils/            # Shared backend logic (e.g., IP & User rate limiting)
│   └── gemini.js         # Secure AI Proxy (Hides API keys from the browser)
│
├── src/                  # React Frontend
│   ├── components/       # Shared UI components
│   │   ├── layout/       # AppShell, ProtectedRoutes
│   │   └── ui/           # Buttons, Modals, ErrorBoundaries
│   │
│   ├── features/         # Feature-Sliced Domains (Code-Split Entry Points)
│   │   ├── auth/         # Login, Password Reset
│   │   ├── dashboard/    # Case Management, DDx Board
│   │   ├── mdt/          # Multi-Disciplinary Team (AI Collaboration)
│   │   └── profile/      # Settings, Medical Profile
│   │
│   ├── hooks/            # Custom React Hooks (\useIsMobile\, etc.)
│   ├── services/         # Core Business Logic & External APIs
│   │   ├── CaseEngine.ts # AI prompt engineering & case management
│   │   └── SyncOutbox.ts # Offline-first synchronization engine
│   │
│   └── stores/           # Zustand Global State
│
└── supabase/             # Database Infrastructure
    └── migrations/       # PostgreSQL Schema & RLS Policies
\\\

---

## Key Architectural Patterns

### 1. Offline-First Synchronization (\SyncOutbox.ts\)
The app is designed to work in intermittent network conditions (e.g., inside hospitals).
* **Local Mutations First:** When a user creates a case, it is immediately written to IndexedDB.
* **Sync Outbox:** A mutation event is queued in \SyncOutbox.ts\. 
* **Conflict Resolution:** We use **Last-Write-Wins (LWW)** based on timestamps. If the cloud version has a newer \updated_at\, the local device will gracefully drop its sync payload to prevent overwriting newer data from another device.

### 2. Large Payload Storage (\idb-keyval\)
Medical transcripts and multi-agent AI JSON payloads can easily exceed the browser's 5MB \localStorage\ limit. 
* To prevent \QuotaExceededError\ crashes, all heavy arrays (Cases, MDT transcripts, Health Memory) are serialized into **IndexedDB** using \idb-keyval\.
* \localStorage\ is reserved exclusively for small, synchronous state (UI preferences, active profile ID).

### 3. Defensive AI & Array Capping (\CaseEngine.ts\)
To prevent infinite payload expansion (which causes AI token exhaustion and database bloat), all chronological arrays are strictly capped:
* \events.slice(0, 100)\
* \medicalRecords.slice(0, 50)\
* \differentialHistory.slice(0, 20)\

### 4. Secure AI Proxying (\pi/gemini.js\)
The Gemini API key is **never** bundled in the Vite frontend.
* The frontend makes requests to \/api/gemini\.
* The Vercel Serverless Function attaches the secret \GEMINI_API_KEY\.
* The proxy enforces a dual-tier rate limit (IP-based and User-ID-based) to prevent billing abuse.
* \ercel.json\ sets \maxDuration: 60\ to ensure long-running AI streaming requests do not timeout.

### 5. Server-Only Ledger Tables & RLS (\supabase/migrations/\)
The database security model utilizes **Row-Level Security (RLS)** to the maximum extent.
* Standard tables (\cases\, \profiles\) strictly enforce \uth.uid() = user_id\.
* **Ledger Tables** (\payments\, \i_requests\, \i_usage_daily\) have explicit \evoke all from anon, authenticated\ constraints.
* This means even if a malicious user compromises a JWT, they cannot mutate their billing status or AI quota, as those tables are only readable/writable by the Vercel \service_role\ backend.

### 6. Seamless Deployment Recovery (\FallbackError.tsx\)
Vite code-splits the app into hashed chunks (e.g., \CaseDashboard-X9y8z7.js\). 
* When a new deployment occurs, Vercel deletes the old chunks.
* If a user with a stale browser tab attempts to navigate, Vite throws a \dynamically imported module\ error.
* The global \ErrorBoundary\ catches this specific error and silently reloads the window to pull the latest \index.html\, preventing broken sessions without disrupting the user experience.
