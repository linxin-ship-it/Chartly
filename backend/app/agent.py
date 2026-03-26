"""
Core agent loop: LLM makes the loop, LLM in the loop, LLM ends the loop.

The agent autonomously plans, executes code, inspects results, and iterates
until it produces a final report or hits the step limit.
"""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from .config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, MAX_AGENT_STEPS
from .protocol import StreamEvent, EventType, StreamingProtocolParser
from .sandbox import CodeSandbox
from .prompts import build_initial_messages, build_tool_result_message

logger = logging.getLogger(__name__)


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)


def _preview_file(file_path: str) -> str:
    """Read first 5 rows of the uploaded data file for context."""
    try:
        import pandas as pd
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path, nrows=5)
        else:
            df = pd.read_excel(file_path, nrows=5)
        return df.to_string(index=False)
    except Exception as e:
        return f"Failed to preview file: {e}"


async def run_agent(
    user_goal: str,
    file_path: str,
) -> AsyncGenerator[StreamEvent, None]:
    """
    Main agent loop. Yields StreamEvents that the API layer sends via SSE.
    """
    client = _get_client()
    sandbox = CodeSandbox()
    sandbox._namespace["__file_path__"] = file_path

    file_preview = _preview_file(file_path)
    messages = build_initial_messages(user_goal, file_path, file_preview)

    yield StreamEvent(type=EventType.STATUS, content="planning")

    for step in range(1, MAX_AGENT_STEPS + 1):
        logger.info(f"Agent step {step}/{MAX_AGENT_STEPS}")

        full_response = ""
        parser = StreamingProtocolParser()

        try:
            stream = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=8192,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_response += delta.content
                    for event in parser.feed(delta.content):
                        yield event

            for event in parser.flush():
                yield event

        except Exception as e:
            logger.error(f"LLM call failed at step {step}: {e}")
            yield StreamEvent(type=EventType.ERROR, content=f"LLM call failed: {e}")
            break

        messages.append({"role": "assistant", "content": full_response})

        report_found = "<REPORT>" in full_response
        if report_found:
            yield StreamEvent(type=EventType.STATUS, content="done")
            break

        tool_call_match = _extract_tool_call(full_response)
        if tool_call_match:
            action = tool_call_match.get("action")
            if action == "run_code":
                code = tool_call_match.get("code", "")
                yield StreamEvent(type=EventType.STATUS, content="coding")

                logger.info(f"Executing code:\n{code[:200]}...")
                result = sandbox.run(code)

                result_summary = _format_result_summary(result)
                yield StreamEvent(
                    type=EventType.TOOL_RESULT,
                    content=result_summary,
                )

                feedback = build_tool_result_message(result)
                messages.append(feedback)
                continue

        if step == MAX_AGENT_STEPS:
            yield StreamEvent(
                type=EventType.ERROR,
                content="Reached maximum analysis steps. Please try a simpler query.",
            )

    yield StreamEvent(type=EventType.DONE, content="")


def _extract_tool_call(text: str) -> dict | None:
    """Extract the JSON payload from a <TOOL_CALL>...</TOOL_CALL> block."""
    import re
    match = re.search(r"<TOOL_CALL>(.*?)</TOOL_CALL>", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1).strip())
    except json.JSONDecodeError:
        return None


def _format_result_summary(result: dict) -> str:
    parts = []
    if result["stdout"]:
        stdout = result["stdout"]
        if len(stdout) > 3000:
            stdout = stdout[:1500] + "\n...(truncated)...\n" + stdout[-1500:]
        parts.append(f"**Output:**\n```\n{stdout}\n```")
    if result["error"]:
        parts.append(f"**Error:**\n```\n{result['error']}\n```")
    return "\n\n".join(parts) if parts else "Code executed successfully (no output)."
