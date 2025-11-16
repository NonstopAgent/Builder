#!/bin/bash

# Entrypoint script for running the Super Builder FastAPI backend.
# This script invokes uvicorn on the main application module and
# binds it to the port provided by the ``PORT`` environment variable.

set -e

# Default to port 8000 if PORT is not set
PORT="${PORT:-8000}"

exec uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
