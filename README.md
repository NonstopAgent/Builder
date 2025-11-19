# Super Builder

AI-powered development assistant with multi-agent collaboration and autonomous task execution.

## Quick Start

Frontend (Vite + React):
1. cd frontend
2. npm install
3. npm run dev

Deployment (Vercel):
- Project root is connected to Vercel.
- vercel.json builds the frontend from /frontend and serves from /frontend/dist.

## 🚀 Quick Start

### Backend (FastAPI + Python)

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY
uvicorn backend.main:app --reload
```

Backend: http://localhost:8000

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

From the repository root, the key frontend commands are:
- `cd frontend && npm install`
- `cd frontend && npm run dev`
- `cd frontend && npm run build`

## 🏗️ Architecture

```
super-builder/
├── backend/          # FastAPI server with AI agents (deployable via Railway or similar)
├── frontend/         # Vite + React UI built and served via Vercel
├── docs/             # Documentation
├── plans/            # Product and planning notes
└── workspace/        # AI-managed files and examples
```

## ✨ Features

- **Multi-Agent System**: Requirements gathering, council debate, execution monitoring
- **Claude-Powered**: Uses Anthropic's Claude for planning and code generation
- **Real-time Execution**: Live logs and verification
- **File Operations**: Sandboxed workspace for AI-generated code
- **Premium Workflows**: Enhanced task creation with architecture debates

## 🌐 Deployment

### Backend (Railway)
1. Connect GitHub repo
2. Add environment variables:
   - `BUILDER_AGENT=claude`
   - `ANTHROPIC_API_KEY=sk-ant-...`
   - `ANTHROPIC_MODEL=claude-sonnet-4-20250514`
3. Deploy

### Frontend (Vercel)
1. Import GitHub repo
2. Configure:
   - Root Directory: Leave blank
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/dist`
3. Add environment variable:
   - `VITE_API_URL` = your Railway URL
4. Deploy

## 🔑 Environment Variables

**Backend (.env):**
```env
BUILDER_AGENT=claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
PORT=8000
```

**Frontend (.env or Vercel):**
```env
VITE_API_URL=http://localhost:8000
```

## 🛠️ Tech Stack

**Backend:** FastAPI, Python 3.9+, Anthropic Claude API, Pydantic  
**Frontend:** React 18, TypeScript, Vite, TanStack Query, Tailwind CSS

## 📚 Documentation

See `docs/` directory for detailed guides.

## 📝 License

MIT
