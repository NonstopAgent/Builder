"""Utility functions for reading and writing files within the workspace.

These helpers encapsulate file system access to ensure that all file
operations are constrained to the ``workspace`` directory at the root of
the repository. They provide safe read and write methods and a helper
to compute diffs between two versions of text.
"""

from __future__ import annotations

import difflib
from pathlib import Path
from typing import List, Dict

# Base directory for file operations relative to the repository root.
# The workspace is located at the root of the ``builder`` project (sibling to ``backend``).
WORKSPACE_DIR = Path(__file__).resolve().parents[2] / "workspace"


def _resolve_path(path: str) -> Path:
    """Resolve a relative path within the workspace directory."""
    base = WORKSPACE_DIR.resolve()
    target = (base / path).resolve()
    if not str(target).startswith(str(base)):
        raise ValueError(f"Attempted to access file outside workspace: {path}")
    return target


def read_file(path: str) -> str:
    """Read and return the contents of a file within the workspace."""
    target = _resolve_path(path)
    if not target.exists():
        raise FileNotFoundError(f"File not found: {path}")
    return target.read_text(encoding="utf-8")


def write_file(path: str, content: str) -> None:
    """Write text to a file within the workspace, creating parents if needed."""
    target = _resolve_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def diff_text(original: str, modified: str) -> List[str]:
    """Compute a unified diff between two strings."""
    diff = difflib.unified_diff(
        original.splitlines(),
        modified.splitlines(),
        fromfile="original",
        tofile="modified",
        lineterm="",
    )
    return list(diff)

# ---------------------------------------------------------------------------
# Directory listing


def list_dir(path: str = "") -> List[Dict[str, str]]:
    """List directories and files within the workspace relative to the given path.

    Parameters
    ----------
    path: str
        A relative directory path within the workspace. If empty, the
        workspace root is used.

    Returns
    -------
    List[Dict[str, str]]
        A list of entries, each with ``name`` and ``type`` keys where
        type is either ``file`` or ``directory``.

    Raises
    ------
    ValueError
        If the resolved path lies outside of the workspace.
    FileNotFoundError
        If the path does not exist or is not a directory.
    """
    target = _resolve_path(path)
    if not target.exists():
        raise FileNotFoundError(f"Path not found: {path}")
    if not target.is_dir():
        raise FileNotFoundError(f"Path is not a directory: {path}")
    entries: List[Dict[str, str]] = []
    for child in sorted(target.iterdir()):
        entry_type = "directory" if child.is_dir() else "file"
        entries.append({"name": child.name, "type": entry_type})
    return entries
