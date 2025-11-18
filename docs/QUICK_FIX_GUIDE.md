# Quick Fix Guide – Super Builder

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
