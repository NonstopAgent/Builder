#!/usr/bin/env bash
# Usage: ./generate_reorg_moves.sh > proposed_moves.sh
# This is a wrapper that calls the Python suggestor script on the current clone.
set -euo pipefail

PY_SCRIPT="scripts/suggest_reorg.py"
if [ ! -f "$PY_SCRIPT" ]; then
  echo "Missing $PY_SCRIPT; please add it next to this script."
  exit 1
fi

python3 "$PY_SCRIPT" --dry-run
