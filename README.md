# CrimeBoard 🔍

> Upload evidence. Agents auto-build a floating laser evidence board. One click generates a courtroom-ready Case File PDF.

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
│   │   └─ Upload / Analyze / Close Case                          │   │
│   └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ DO Spaces     │    │ DO Managed       │    │ DO Functions     │
│ Object Storage│    │ PostgreSQL       │    │ (Serverless)     │
└───────────────┘    └──────────────────┘    └─────────┬────────┘
                                                       │
                     ┌─────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│         DigitalOcean Gradient™ AI Platform                          │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  DeskSergeant (Router Agent)                                   │ │
│  │  ├─ ForensicTagger    ├─ WitnessAnalyst                       │ │
│  │  ├─ CompositeArtist   └─ ConnectionAgent                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  CrimeBoard-KB (Knowledge Base)                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- DigitalOcean account with Spaces, Functions, and Gradient access
- `doctl` CLI installed and authenticated

### 1. Clone and Install
```bash
git clone https://github.com/YOUR_USERNAME/crimeboard_ocean.git
cd crimeboard_ocean

# Install web app dependencies
cd apps/web
npm install
```

### 2. Environment Setup
```bash
# Copy and edit environment variables
cp .env.example .env.local

# Required variables:
# DATABASE_URL=postgresql://...
# SPACES_KEY=...
# SPACES_SECRET=...
# GRADIENT_AGENT_ENDPOINT=...
# GRADIENT_ACCESS_KEY=...
```

### 3. Database Setup
```bash
# Add your IP to the database's trusted sources in DO Control Panel first!
# Then run migrations
psql $DATABASE_URL -f db/migrations/001_initial.sql
```

### 4. Spaces CORS Setup (Required for uploads!)
In DigitalOcean Control Panel → Spaces → Your Bucket → Settings → CORS:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://your-app.ondigitalocean.app"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### 5. Run Locally
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```


---

## 📦 Deployment

### Deploy Functions
```bash
# Install serverless support
doctl serverless install

# Connect to your namespace
doctl serverless connect

# Deploy all functions
cd functions
doctl serverless deploy .
```

### Deploy Web App
```bash
# Create app (first time)
doctl apps create --spec .do/app.yaml

# Or update existing
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

### Create Knowledge Base (Manual)
1. Go to DigitalOcean Control Panel → Agent Platform → Knowledge Bases
2. Create "CrimeBoard-KB"
3. Add seed URLs for forensic terminology resources
4. Attach to DeskSergeant agent

---

## 🎬 Demo Script (90 seconds)

| Time | Action |
|------|--------|
| 0-15s | "CrimeBoard uses DigitalOcean Gradient AI Platform with 4 specialist agents coordinated by a router" |
| 15-30s | Create case, upload evidence bundle (photos + witness statement) |
| 30-50s | Click Analyze → show agents working → board populates with floating nodes |
| 50-70s | Interact with board - drag nodes, show laser connections, open detail panel |
| 70-90s | Click Close Case File → PDF generates → show KB-sourced chain of custody notes |

---

## 🏆 How We Used DigitalOcean

### DigitalOcean Gradient™ AI Platform
- **Router Agent (DeskSergeant)**: Coordinates 4 specialist child agents
- **Function Routing**: Calls DO Functions for OCR and image tagging
- **Knowledge Base**: RAG for chain-of-custody notes in PDFs

### DigitalOcean Functions
- 6 serverless endpoints: upload, OCR, tag-image, composite, casefile-pdf, signed-url
- Auto-scales with evidence processing load

### DigitalOcean Spaces Object Storage
- Stores all evidence files and generated PDFs
- Presigned URLs for secure access

### DigitalOcean Managed PostgreSQL
- Case metadata, evidence records, board nodes/edges
- Job tracking for async processing

### DigitalOcean App Platform
- Hosts Next.js frontend with auto-deployment from GitHub

---

## 📁 Project Structure
```
crimeboard_ocean/
├── apps/web/                 # Next.js frontend
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   └── lib/                  # DB, Spaces, Gradient clients
├── functions/                # DO Functions
│   ├── project.yml           # Serverless config
│   └── packages/crimeboard/  # Function implementations
├── db/migrations/            # SQL migrations
├── .do/app.yaml              # App Platform spec
└── README.md
```

---

## 🔒 Security Notes
- All Spaces files are private, accessed via presigned URLs
- Database uses SSL in production
- Gradient access key stored as secret
- Functions are web-accessible but can be secured

---

## 📄 License
MIT - Built for DigitalOcean Hackathon
