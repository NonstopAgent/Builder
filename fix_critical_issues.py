#!/usr/bin/env python3
"""
Utility script to normalize critical project settings for Super Builder.

Run from the repository root:

    python fix_critical_issues.py

The script trims backend dependencies, refreshes frontend package defaults,
adds lightweight type-alignment notes, and writes a quick-fix guide.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


ROOT = Path(__file__).resolve().parent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _print_header(title: str) -> None:
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)


def _safe_read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# 1. requirements.txt cleanup
# ---------------------------------------------------------------------------

def fix_requirements_txt() -> None:
    """Overwrite requirements.txt with a minimal, correct dependency set."""
    _print_header("🔧 Fixing requirements.txt")

    minimal_requirements = """\
fastapi
uvicorn[standard]
pydantic>=2.0.0
python-dotenv>=1.0.0
openai>=0.27.0
anthropic>=0.40.0
httpx>=0.27.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
"""

    requirements_path = ROOT / "requirements.txt"
    requirements_path.write_text(minimal_requirements.strip() + "\n", encoding="utf-8")
    print(f"✅ Updated {requirements_path} with minimal dependency set")


# ---------------------------------------------------------------------------
# 2. frontend/package.json fix
# ---------------------------------------------------------------------------

def fix_frontend_package_json() -> None:
    """
    Ensure frontend/package.json has a sane React + Vite + TS setup.

    If the file exists, merge in required dependencies and scripts.
    If it does not exist, create a simple default.
    """
    _print_header("🔧 Fixing frontend/package.json")

    frontend_dir = ROOT / "frontend"
    package_json_path = frontend_dir / "package.json"
    _ensure_dir(frontend_dir)

    base_pkg: Dict[str, Any] = {
        "name": "super-builder-frontend",
        "version": "0.1.0",
        "private": True,
        "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview",
            "test": "vitest",
        },
        "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0",
            "axios": "^1.6.7",
        },
        "devDependencies": {
            "typescript": "^5.3.0",
            "vite": "^5.0.0",
            "@types/react": "^18.0.37",
            "@types/react-dom": "^18.0.11",
        },
    }

    if package_json_path.exists():
        existing = _safe_read_json(package_json_path)

        # Merge scripts and dependencies while preserving any custom entries.
        base_pkg["scripts"] = {**base_pkg["scripts"], **existing.get("scripts", {})}
        base_pkg["dependencies"] = {**base_pkg["dependencies"], **existing.get("dependencies", {})}
        base_pkg["devDependencies"] = {
            **base_pkg["devDependencies"],
            **existing.get("devDependencies", {}),
        }

    package_json_path.write_text(
        json.dumps(base_pkg, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    print(f"✅ Updated {package_json_path}")


# ---------------------------------------------------------------------------
# 3. Type consistency patch note
# ---------------------------------------------------------------------------

def write_type_consistency_patch() -> None:
    """Document expected Task and Step shapes to align FE/BE."""
    _print_header("📝 Writing TYPE_CONSISTENCY_PATCH.md")

    text = """# Type Consistency Patch – Super Builder

This document describes the expected shapes of Task and Step objects so that
backend models and frontend types stay aligned.

---

## Task

Required fields:

- `id: int`
- `type: str`
- `goal: str`
- `project_id: Optional[str]`
- `status: Literal[\"queued\", \"in_progress\", \"completed\", \"failed\"]`
- `plan: List[Step]`
- `current_step: Optional[int]`
- `logs: List[str]`
- `created_at: str`  (ISO timestamp)
- `updated_at: str`  (ISO timestamp)

## Step

Required fields:

- `description: str`
- `status: Literal[\"pending\", \"completed\", \"failed\"]`
- `logs: List[str]`
- `error: Optional[str]`
- `metadata: Dict[str, Any]`
- `created_at: str`
- `updated_at: str`

---

## Frontend / Backend Mapping Notes

- When sending data **from frontend to backend**:
  - Use `projectId` in DTOs if needed, but convert to `project_id` before storing.
- When reading **from backend**:
  - Treat `current_step` as `number | null`.
  - Don’t assume `plan` is non-empty; newly created tasks may have `plan = []`.

Keep this file in the repo root and update it whenever you change models.
"""

    path = ROOT / "TYPE_CONSISTENCY_PATCH.md"
    path.write_text(text, encoding="utf-8")
    print(f"✅ Wrote {path}")


# ---------------------------------------------------------------------------
# 4. Quick fix guide
# ---------------------------------------------------------------------------

def write_quick_fix_guide() -> None:
    """Write QUICK_FIX_GUIDE.md with setup instructions."""
    _print_header("📘 Writing QUICK_FIX_GUIDE.md")

    text = """# Quick Fix Guide – Super Builder

After cloning or pulling updates, run:

```bash
python fix_critical_issues.py
pip install -r requirements.txt
cd frontend
npm install
```

Then start the services:

```bash
# Backend
uvicorn backend.main:app --reload

# Frontend (from frontend/)
npm run dev
```

If something breaks:

1. Re-run `python fix_critical_issues.py`.
2. Make sure `.env` has your `ANTHROPIC_API_KEY` (if using Claude).
3. Run backend tests:

   ```bash
   pytest test_backend.py -v
   ```

4. Check `UPDATES.md` and `TESTING_AND_IMPROVEMENTS.md` for more detail.
"""

    path = ROOT / "QUICK_FIX_GUIDE.md"
    path.write_text(text, encoding="utf-8")
    print(f"✅ Wrote {path}")


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------

def main() -> None:
    _print_header("🚀 Super Builder – Critical Fixes")

    fix_requirements_txt()
    fix_frontend_package_json()
    write_type_consistency_patch()
    write_quick_fix_guide()

    print("\nAll critical fixes applied.")
    print("Next steps:")
    print("  1. pip install -r requirements.txt")
    print("  2. cd frontend && npm install")
    print("  3. Configure your .env (ANTHROPIC_API_KEY, BUILDER_AGENT)")
    print("  4. Run backend tests: pytest test_backend.py -v")
    print("  5. Start backend + frontend and verify basic flows.")
    print("\nFor more detail, see TESTING_AND_IMPROVEMENTS.md and UPDATES.md.")


if __name__ == "__main__":
    main()
