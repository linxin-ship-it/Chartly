"""
Python code execution sandbox using dynamic exec().
Captures stdout and handles errors gracefully.
A shared namespace persists across calls within a single analysis session
so that variables (e.g. loaded DataFrames) are available across steps.
"""

from __future__ import annotations
import io
import sys
import textwrap
import traceback
from typing import Any


def create_namespace(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    ns: dict[str, Any] = {"__builtins__": __builtins__}
    if extra:
        ns.update(extra)
    return ns


def run_python_code(code: str, namespace: dict[str, Any] | None = None) -> dict[str, Any]:
    if namespace is None:
        namespace = create_namespace()

    old_stdout = sys.stdout
    old_stderr = sys.stderr
    stdout_buf = io.StringIO()
    stderr_buf = io.StringIO()
    sys.stdout = stdout_buf
    sys.stderr = stderr_buf

    error = None
    try:
        exec(textwrap.dedent(code), namespace)
    except Exception:
        error = traceback.format_exc()
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

    return {
        "stdout": stdout_buf.getvalue(),
        "stderr": stderr_buf.getvalue(),
        "error": error,
    }
