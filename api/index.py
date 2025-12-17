"""
Vercel serverless function entry point.
Exposes the FastAPI app from backend/main.py for Vercel deployment.
"""
import sys
from pathlib import Path

# Add the project root to the path so we can import from backend
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import the FastAPI app
from backend.main import app

# Vercel expects the app to be named 'app' or 'handler'
# FastAPI apps work directly with Vercel's Python runtime
