#!/usr/bin/env bash
set -e

echo "=== Super Builder Quick Start ==="

# 1. Create virtualenv
if [ ! -d "venv" ]; then
  echo "[1/6] Creating virtual environment..."
  python3 -m venv venv
else
  echo "[1/6] Virtual environment already exists."
fi

# 2. Activate venv
echo "[2/6] Activating virtual environment..."
# shellcheck disable=SC1091
source venv/bin/activate || source venv/Scripts/activate

# 3. Install backend deps
echo "[3/6] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Setup workspace
echo "[4/6] Setting up workspace/ directory..."
python setup_workspace.py

# 5. Create .env if missing
if [ ! -f ".env" ]; then
  echo "[5/6] Creating .env from .env.example..."
  cp .env.example .env
  echo "IMPORTANT: Edit .env and set ANTHROPIC_API_KEY before running in Claude mode."
else
  echo "[5/6] .env already exists."
fi

# 6. Final instructions
echo "[6/6] Done!"
echo
echo "To run the backend:"
echo "  source venv/bin/activate   # or venv\\Scripts\\activate on Windows"
echo "  uvicorn backend.main:app --reload"
echo
echo "To run the frontend:"
echo "  cd frontend"
echo "  npm install"
echo '  VITE_API_URL=http://localhost:8000 npm run dev'
echo
echo "Then open http://localhost:5173 in your browser."
