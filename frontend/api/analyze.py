"""
Vercel Python Serverless Function — Chartly Agent.

Receives file content (base64) + analysis goal via POST,
runs the multi-step LLM agent loop with code execution,
and streams SSE events back to the client.
"""

from __future__ import annotations

import base64
import io
import json
import os
import re
import sys
import textwrap
import traceback
from http.client import responses
from typing import Any, Generator

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "deepseek-chat")
MAX_AGENT_STEPS = int(os.getenv("MAX_AGENT_STEPS", "15"))
WRAP_UP_THRESHOLD = 0.7

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
你是 Chartly 数据分析引擎——一个专业的数据分析 Agent。你的任务是根据用户上传的数据表格和分析需求，自主完成从数据探索到最终报告的全部流程。

## 核心原则

1. **高效执行**：你总共最多只能进行约 10 轮交互，务必合理规划步骤，不要拆分过细。尽量在一次代码调用中完成多项计算。
2. **尽早收尾**：当你已经收集到足够的分析结果时，立即输出 `<REPORT>` 和 `<CHART>`，不要继续无意义的探索。
3. **代码要高效**：每次 `run_code` 调用应包含尽可能多的有用计算，避免只做一件小事。

## 工作模式

你拥有一个工具 `run_code`，可以执行 Python 代码。代码在持久命名空间中运行，变量在多轮调用间共享。

## 输出格式

你的回答必须使用以下标签来结构化输出：

- `<THINK>...</THINK>` — 推理过程、分析计划、决策依据
- `<TOOL>{"action": "run_code", "code": "..."}</TOOL>` — 调用工具执行代码
- `<REPORT>...</REPORT>` — 最终面向用户的 Markdown 报告（包含分析结论）
- `<CHART>{"title": "...", "option": {...}}</CHART>` — ECharts 图表配置 JSON
- `<MERMAID>...</MERMAID>` — Mermaid 流程图/图表

## 推荐工作流程（控制在 4-7 轮内完成）

1. 【第 1 轮】`<THINK>` 分析需求 + `<TOOL>` 加载数据并查看结构、基本统计
2. 【第 2-3 轮】`<TOOL>` 执行核心分析计算（合并多个计算到单次代码执行中）
3. 【第 4-5 轮】输出 `<CHART>` 图表 + `<REPORT>` 完整报告

⚠️ 切记：不要把简单计算拆成多步，一次代码中可以同时完成多项分析。

## ECharts 图表规范

使用 `<CHART>` 标签输出完整的 ECharts option JSON：
```
<CHART>
{
  "title": "图表标题",
  "option": {
    "title": {"text": "..."},
    "tooltip": {},
    "xAxis": {...},
    "yAxis": {...},
    "series": [...]
  }
}
</CHART>
```
图表配色推荐：主色 #6CC3C5，辅助色 #4aa3a5, #8dd9db, #f5a623, #e86452。背景透明。

## 代码执行规范

- 数据已通过 `DATA_BYTES` (bytes) 和 `DATA_FILENAME` (str) 注入到命名空间
- 加载方式：`pd.read_excel(io.BytesIO(DATA_BYTES))` 或 `pd.read_csv(io.BytesIO(DATA_BYTES))`
- 命名空间持久共享，无需重复 import
- 输出关键结果用 print()
- 代码报错时修正后重新执行

## 结束条件

当分析充分时，在**同一轮回复中**同时输出所有 `<CHART>` 和 `<REPORT>`。
最终报告应包含：数据概览、核心发现、关键结论和建议。
"""

USER_PROMPT_TEMPLATE = """\
## 分析任务

{user_goal}

## 数据文件信息

- 文件名：{filename}
- 文件类型：{filetype}

请开始分析。先用一次代码调用加载数据并探索其结构，然后高效推进分析。
"""

WRAP_UP_REMINDER = """\
⚠️ 你已经使用了大部分可用步数。请在下一轮回复中：
1. 基于目前已获得的所有分析结果
2. 直接输出 `<CHART>` 图表和 `<REPORT>` 最终报告
3. 不要再调用 `<TOOL>` 执行新代码

请立即生成最终报告。
"""

FORCE_FINISH_PROMPT = """\
你已到达最后一轮。请立即基于目前所有分析结果，输出完整的 `<REPORT>` 报告和相关 `<CHART>` 图表。
不要再调用任何工具，直接生成最终报告。
"""


# ---------------------------------------------------------------------------
# Protocol helpers
# ---------------------------------------------------------------------------
TAG_PATTERN = re.compile(r"<(THINK|TOOL|REPORT|CHART|MERMAID)>(.*?)</\1>", re.DOTALL)

TAG_TO_TYPE = {
    "THINK": "think",
    "TOOL": "tool",
    "REPORT": "report",
    "CHART": "chart",
    "MERMAID": "mermaid",
}


def sse_encode(event_type: str, content: str) -> str:
    payload = json.dumps({"type": event_type, "content": content}, ensure_ascii=False)
    return f"data: {payload}\n\n"


class StreamParser:
    def __init__(self):
        self.buffer = ""

    def feed(self, chunk: str) -> list[tuple[str, str]]:
        self.buffer += chunk
        events = []
        while True:
            m = TAG_PATTERN.search(self.buffer)
            if not m:
                break
            tag = m.group(1)
            content = m.group(2).strip()
            evt_type = TAG_TO_TYPE.get(tag)
            if evt_type:
                events.append((evt_type, content))
            self.buffer = self.buffer[m.end():]
        return events

    def flush(self) -> list[tuple[str, str]]:
        events = []
        remaining = self.buffer.strip()
        if remaining:
            events.append(("think", remaining))
        self.buffer = ""
        return events


# ---------------------------------------------------------------------------
# Code execution sandbox (in-memory)
# ---------------------------------------------------------------------------
def create_namespace(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    ns: dict[str, Any] = {"__builtins__": __builtins__}
    if extra:
        ns.update(extra)
    return ns


def run_python_code(code: str, namespace: dict[str, Any]) -> dict[str, Any]:
    old_stdout, old_stderr = sys.stdout, sys.stderr
    stdout_buf, stderr_buf = io.StringIO(), io.StringIO()
    sys.stdout, sys.stderr = stdout_buf, stderr_buf

    error = None
    try:
        exec(textwrap.dedent(code), namespace)
    except Exception:
        error = traceback.format_exc()
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr

    return {
        "stdout": stdout_buf.getvalue(),
        "stderr": stderr_buf.getvalue(),
        "error": error,
    }


# ---------------------------------------------------------------------------
# Agent loop (synchronous generator for Vercel streaming)
# ---------------------------------------------------------------------------
def run_agent_sync(user_goal: str, filename: str, file_bytes: bytes) -> Generator[str, None, None]:
    """Synchronous generator that yields SSE-encoded strings."""
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

    filetype = filename.rsplit(".", 1)[-1] if "." in filename else "unknown"
    user_message = USER_PROMPT_TEMPLATE.format(
        user_goal=user_goal,
        filename=filename,
        filetype=filetype,
    )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    namespace = create_namespace({
        "DATA_BYTES": file_bytes,
        "DATA_FILENAME": filename,
    })

    yield sse_encode("status", "规划中")

    for step in range(1, MAX_AGENT_STEPS + 1):
        is_last_step = step == MAX_AGENT_STEPS
        approaching_limit = step >= int(MAX_AGENT_STEPS * WRAP_UP_THRESHOLD)

        if is_last_step:
            messages.append({"role": "user", "content": FORCE_FINISH_PROMPT})

        full_response = ""
        parser = StreamParser()

        try:
            stream = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=8192,
                stream=True,
            )

            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    text = delta.content
                    full_response += text
                    for evt_type, content in parser.feed(text):
                        yield sse_encode(evt_type, content)

            for evt_type, content in parser.flush():
                yield sse_encode(evt_type, content)

        except Exception as e:
            yield sse_encode("error", f"LLM 调用失败: {str(e)}")
            break

        messages.append({"role": "assistant", "content": full_response})

        has_tool = "<TOOL>" in full_response and "</TOOL>" in full_response
        has_report = "<REPORT>" in full_response and "</REPORT>" in full_response

        if has_tool and not is_last_step:
            yield sse_encode("status", "执行代码中")

            for tool_json_str in re.findall(r"<TOOL>(.*?)</TOOL>", full_response, re.DOTALL):
                try:
                    tool_call = json.loads(tool_json_str.strip())
                except json.JSONDecodeError:
                    yield sse_encode("error", "工具调用 JSON 解析失败")
                    continue

                action = tool_call.get("action", "")
                code = tool_call.get("code", "")

                if action == "run_code" and code:
                    yield sse_encode("code", code)
                    result = run_python_code(code, namespace)

                    result_text = ""
                    if result["stdout"]:
                        result_text += f"stdout:\n{result['stdout']}\n"
                    if result["stderr"]:
                        result_text += f"stderr:\n{result['stderr']}\n"
                    if result["error"]:
                        result_text += f"error:\n{result['error']}\n"
                    if not result_text:
                        result_text = "(无输出)"

                    yield sse_encode("result", result_text)

                    feedback = f"代码已执行完毕，结果如下：\n{result_text}\n"
                    if approaching_limit and not has_report:
                        remaining_steps = MAX_AGENT_STEPS - step
                        feedback += f"\n⚠️ 注意：你还剩 {remaining_steps} 轮可用。{WRAP_UP_REMINDER}"

                    messages.append({"role": "user", "content": feedback})

            if not has_report:
                yield sse_encode("status", "分析中")
                continue

        if has_report:
            yield sse_encode("status", "生成报告中")
            yield sse_encode("done", "分析完成")
            return

        if not has_tool and not has_report:
            if approaching_limit:
                messages.append({"role": "user", "content": WRAP_UP_REMINDER})
            else:
                messages.append({
                    "role": "user",
                    "content": "请继续分析，使用 <TOOL> 执行代码或使用 <REPORT> 输出最终报告。",
                })
            continue

    yield sse_encode("status", "正在生成最终报告...")
    yield sse_encode("done", "分析完成")


# ---------------------------------------------------------------------------
# Vercel Serverless Handler
# ---------------------------------------------------------------------------
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return

        goal = data.get("goal", "")
        filename = data.get("filename", "data.xlsx")
        file_b64 = data.get("file", "")

        if not goal or not file_b64:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing goal or file"}).encode())
            return

        file_bytes = base64.b64decode(file_b64)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            for event in run_agent_sync(goal, filename, file_bytes):
                self.wfile.write(event.encode("utf-8"))
                self.wfile.flush()
        except Exception as e:
            error_event = sse_encode("error", str(e))
            self.wfile.write(error_event.encode("utf-8"))
            self.wfile.flush()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
