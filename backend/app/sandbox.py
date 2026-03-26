"""
Sandboxed Python code executor.
Runs user-generated code in a restricted namespace with captured stdout/stderr.
"""

import io
import sys
import traceback
import textwrap
from typing import Any


class CodeSandbox:
    """Maintains a persistent namespace across multiple code executions within one session."""

    def __init__(self) -> None:
        self._namespace: dict[str, Any] = {}

    def run(self, code: str) -> dict:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        stdout_buf = io.StringIO()
        stderr_buf = io.StringIO()
        sys.stdout = stdout_buf
        sys.stderr = stderr_buf

        error = None
        try:
            exec(textwrap.dedent(code), self._namespace)
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
