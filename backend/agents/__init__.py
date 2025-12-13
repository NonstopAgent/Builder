"""Agents package for the Super Builder backend.

This package exposes helper functions to obtain instances of
agents that perform autonomous task planning and execution.

This module re-exports the core building blocks for the multi-agent
pipeline: the requirements agent, the development council, and the
legacy `get_agent` entry point for the original SuperBuilderAgent.
"""

# re-export get_agent for convenient import in main
from .super_builder import get_agent  # noqa: F401
from .requirements_agent import RequirementsAgent  # noqa: F401
from .council import DevelopmentCouncil  # noqa: F401
