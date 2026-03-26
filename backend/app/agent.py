"""
Core agent loop: LLM makes the loop, LLM in the loop, LLM ends the loop.

The agent streams SSE events to the client as it plans, executes code,
and produces the final report. Includes wrap-up logic to ensure the
model finishes within the step budget.
"""

from __future__ import annotations
import json
import re
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from .config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, MAX_AGENT_STEPS
from .prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, WRAP_UP_REMINDER, FORCE_FINISH_PROMPT
from .protocol import SSEEvent, EventType, StreamParser
from .sandbox import run_python_code, create_namespace

logger = logging.getLogger("chartly.agent")

client = AsyncOpenAI(
    api_key=OPENAI_API_KEY,
    base_url=OPENAI_BASE_URL,
)

WRAP_UP_THRESHOLD = 0.7  # start reminding at 70% of budget


async def run_agent(
    user_goal: str,
    filename: str,
    filepath: str,
) -> AsyncGenerator[str, None]:
    filetype = filename.rsplit(".", 1)[-1] if "." in filename else "unknown"
    user_message = USER_PROMPT_TEMPLATE.format(
        user_goal=user_goal,
        filename=filename,
        filepath=filepath,
        filetype=filetype,
    )

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    namespace = create_namespace({"DATA_FILE_PATH": filepath})

    yield SSEEvent(event=EventType.STATUS, data="规划中").encode()

    for step in range(1, MAX_AGENT_STEPS + 1):
        logger.info("Agent step %d / %d", step, MAX_AGENT_STEPS)
        is_last_step = step == MAX_AGENT_STEPS
        approaching_limit = step >= int(MAX_AGENT_STEPS * WRAP_UP_THRESHOLD)

        # Force the model to wrap up on last step
        if is_last_step:
            messages.append({"role": "user", "content": FORCE_FINISH_PROMPT})

        full_response = ""
        parser = StreamParser()

        try:
            stream = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=8192,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if delta and delta.content:
                    text = delta.content
                    full_response += text
                    events = parser.feed(text)
                    for evt in events:
                        yield evt.encode()

            remaining = parser.flush()
            for evt in remaining:
                yield evt.encode()

        except Exception as e:
            logger.exception("LLM call failed at step %d", step)
            yield SSEEvent(event=EventType.ERROR, data=f"LLM 调用失败: {str(e)}").encode()
            break

        messages.append({"role": "assistant", "content": full_response})

        has_tool_call = "<TOOL>" in full_response and "</TOOL>" in full_response
        has_report = "<REPORT>" in full_response and "</REPORT>" in full_response

        if has_tool_call and not is_last_step:
            yield SSEEvent(event=EventType.STATUS, data="执行代码中").encode()

            tool_matches = re.findall(r"<TOOL>(.*?)</TOOL>", full_response, re.DOTALL)

            for tool_json_str in tool_matches:
                try:
                    tool_call = json.loads(tool_json_str.strip())
                except json.JSONDecodeError:
                    yield SSEEvent(event=EventType.ERROR, data="工具调用 JSON 解析失败").encode()
                    continue

                action = tool_call.get("action", "")
                code = tool_call.get("code", "")

                if action == "run_code" and code:
                    yield SSEEvent(event=EventType.CODE, data=code).encode()

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

                    yield SSEEvent(event=EventType.RESULT, data=result_text).encode()

                    feedback = f"代码已执行完毕，结果如下：\n{result_text}\n"

                    # Inject wrap-up reminder when approaching step limit
                    if approaching_limit and not has_report:
                        remaining_steps = MAX_AGENT_STEPS - step
                        feedback += (
                            f"\n⚠️ 注意：你还剩 {remaining_steps} 轮可用。"
                            f" {WRAP_UP_REMINDER}"
                        )

                    messages.append({"role": "user", "content": feedback})

            if not has_report:
                yield SSEEvent(event=EventType.STATUS, data="分析中").encode()
                continue

        if has_report:
            yield SSEEvent(event=EventType.STATUS, data="生成报告中").encode()
            yield SSEEvent(event=EventType.DONE, data="分析完成").encode()
            return

        if not has_tool_call and not has_report:
            if approaching_limit:
                messages.append({"role": "user", "content": WRAP_UP_REMINDER})
            else:
                messages.append({
                    "role": "user",
                    "content": "请继续分析，使用 <TOOL> 执行代码或使用 <REPORT> 输出最终报告。",
                })
            continue

    # Reached max steps — do one final forced attempt to get a report
    yield SSEEvent(event=EventType.STATUS, data="正在生成最终报告...").encode()
    yield SSEEvent(event=EventType.DONE, data="分析完成").encode()
