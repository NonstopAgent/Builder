"""Agents package for the Super Builder backend.

This package exposes helper functions to obtain instances of
agents that perform autonomous task planning and execution.

Currently it only exposes the `get_agent` function from
``super_builder.py``. Additional agents or helper functions
should be added here as the project grows.
"""

# re-export get_agent for convenient import in main
from .super_builder import get_agent  # noqa: F401
