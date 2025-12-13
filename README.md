# CrimeBoard 🔍

> Upload evidence. AI agents auto-build a floating laser evidence board with suspect ranking. One click generates a courtroom-ready Case File PDF.

**Built with DigitalOcean: Gradient™ AI Platform, Functions, Spaces, Managed PostgreSQL, App Platform**

![CrimeBoard](https://img.shields.io/badge/DigitalOcean-Hackathon-blue)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                  │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │   Next.js on DO App Platform                                 │   │
│   │   ├─ Evidence Board (React Flow)                            │   │
│   │   ├─ Suspect Nodes with Guilt %                             │   │
│   │   └─ Multi-file Upload → Presigned PUT → Spaces             │   │
│   └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────┐
        │                           │                       │
        ▼                           ▼                       ▼
┌───────────────┐        ┌──────────────────┐    ┌──────────────────┐
│ DO Spaces     │        │ DO Managed       │    │ DO Functions     │
│ (Presigned)   │        │ PostgreSQL       │    │ (Serverless)     │
└───────────────┘        └──────────────────┘    └──────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────┐
│              DigitalOcean Gradient™ AI Platform                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  7-AGENT ORCHESTRATION PIPELINE                                │ │
│  │                                                                 │ │
│  │  1. ForensicTagger    → Extract objects, locations, timestamps │ │
│  │  2. WitnessAnalyst    → Suspect descriptors, timeline hints    │ │
│  │  3. PsychoProfiler    → Behavioral hypotheses                  │ │
│  │  4. SuspectRanker     → Guilt probability 0-100%               │ │
│  │  5. ConnectionMapper  → Graph nodes and edges                  │ │
│  │  6. DeskSergeant      → Merge all outputs                      │ │
│  │  7. CaseFileWriter    → Prosecutor-ready narratives            │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CrimeBoard-KB (Knowledge Base)                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### Multi-File Upload (Presigned PUT)
- Select multiple images, PDFs, text files at once
- Files upload **directly to Spaces** via presigned PUT URLs
- Never sends file bytes through API routes (avoids 1MB limits)
- Per-file upload status indicators

### Multi-Agent Investigation
- **7 specialized AI agents** analyze evidence in sequence
- Each agent builds on previous outputs
- Returns structured JSON for board rendering

### Suspect Ranking
- 2-5 suspects with **guilt probability (0-100%)**
- Each suspect shows:
  - Why suspected (with evidence citations)
  - Key attributes (description, vehicle, last seen)
  - Relationships to other suspects
  - Recommended next action

### Presigned URL Security
- All Spaces objects are **private**
- Every image/PDF renders via presigned READ URL
- URLs expire after 1 hour (configurable)
- CORS configured for upload domains

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- `doctl` CLI authenticated
- DigitalOcean account with Spaces, Functions, Gradient access

### 1. Clone and Install
```bash
git clone https://github.com/YOUR_USERNAME/crimeboard_ocean.git
cd crimeboard_ocean
cd apps/web && npm install
```

### 2. Environment Setup
```bash
cp .env.example apps/web/.env.local
# Edit with your credentials
```

### 3. Database Setup
```bash
# Add your IP to trusted sources first!
psql $DATABASE_URL -f db/migrations/001_initial.sql
```

### 4. Spaces CORS Setup (Required!)
In DO Control Panel → Spaces → Bucket → Settings → CORS:
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3000", "https://your-app.ondigitalocean.app"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}
```

### 5. Run Locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📦 Deployment

### Deploy Functions
```bash
doctl serverless install
doctl serverless connect
cd functions && doctl serverless deploy .
```

### Deploy Web App
```bash
doctl apps create --spec .do/app.yaml
```

---

## 🎬 Demo Script (90 seconds)

| Time | Action |
|------|--------|
| 0-10s | "CrimeBoard uses 7 AI agents orchestrated by DigitalOcean Gradient" |
| 10-25s | Create case, multi-select upload (3-4 files at once) |
| 25-45s | Click Analyze → watch "Analyzing (7 agents)..." |
| 45-60s | Board populates with evidence nodes AND suspect nodes |
| 60-75s | Click suspect → show guilt %, reasons, relationships |
| 75-90s | Click Close Case File → PDF shows full suspect analysis |

---

## 🏆 DigitalOcean Products Used

| Product | How We Used It |
|---------|----------------|
| **Gradient™ AI Platform** | 7-agent orchestration, function routing, knowledge base |
| **Functions** | 6 serverless endpoints (upload, OCR, tag-image, composite, casefile-pdf, signed-url) |
| **Spaces** | Private evidence storage, presigned PUT/GET URLs |
| **Managed PostgreSQL** | Cases, evidence, board nodes, edges, suspects |
| **App Platform** | Next.js frontend hosting |

---

## 📁 Project Structure
```
crimeboard_ocean/
├── apps/web/
│   ├── app/                    # Next.js App Router
│   │   └── api/cases/[id]/     # CRUD, analyze, upload, close
│   ├── components/             # EvidenceBoard, NodePanel, UploadModal
│   └── lib/
│       ├── agents.ts           # 7-agent orchestration
│       ├── gradient.ts         # Gradient API wrapper
│       ├── spaces.ts           # S3/Spaces client
│       └── db.ts               # PostgreSQL pool
├── functions/                  # DO Functions
├── db/migrations/              # SQL schema
└── .do/app.yaml                # App Platform spec
```

---

## 🔒 Why Presigned URLs Are Mandatory

1. **Spaces buckets are private** → No public object access
2. **1MB Functions limit** → Can't send file bytes through API
3. **Browser-direct upload** → Presigned PUT URL bypasses API
4. **Secure rendering** → Presigned GET URLs for images/PDFs
5. **Expiring access** → URLs auto-expire, preventing permanent leaks

---

## 📄 License
MIT - Built for DigitalOcean Hackathon
