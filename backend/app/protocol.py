"""
Streaming protocol definitions.

The LLM output is wrapped in explicit tags so the backend parser can route
different content types to different frontend UI components:

  <THINKING>...</THINKING>     - model's internal reasoning (shown in process view)
  <TOOL_CALL>...</TOOL_CALL>   - tool invocation decisions (JSON)
  <TOOL_RESULT>...</TOOL_RESULT> - tool execution results
  <REPORT>...</REPORT>         - final markdown report for the user
  <STATUS>...</STATUS>         - phase transitions (planning / coding / reporting)
  <PLAN>...</PLAN>             - execution plan

Each SSE event sent to the frontend carries:
  { "type": "<tag>", "content": "<text>" }
"""

import json
import re
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Generator


class EventType(str, Enum):
    THINKING = "thinking"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    REPORT = "report"
    STATUS = "status"
    PLAN = "plan"
    ERROR = "error"
    DONE = "done"


@dataclass
class StreamEvent:
    type: EventType
    content: str

    def to_sse(self) -> str:
        payload = json.dumps(asdict(self), ensure_ascii=False)
        return f"data: {payload}\n\n"


TAG_PATTERN = re.compile(
    r"<(THINKING|TOOL_CALL|TOOL_RESULT|REPORT|STATUS|PLAN)>(.*?)</\1>",
    re.DOTALL,
)

TAG_TO_EVENT: dict[str, EventType] = {
    "THINKING": EventType.THINKING,
    "TOOL_CALL": EventType.TOOL_CALL,
    "TOOL_RESULT": EventType.TOOL_RESULT,
    "REPORT": EventType.REPORT,
    "STATUS": EventType.STATUS,
    "PLAN": EventType.PLAN,
}


def parse_tagged_output(text: str) -> list[StreamEvent]:
    """Parse a complete LLM response into structured events."""
    events: list[StreamEvent] = []
    for match in TAG_PATTERN.finditer(text):
        tag = match.group(1)
        content = match.group(2).strip()
        event_type = TAG_TO_EVENT.get(tag, EventType.THINKING)
        events.append(StreamEvent(type=event_type, content=content))
    return events


class StreamingProtocolParser:
    """
    Incremental parser that processes streaming LLM text chunks.
    Yields structured events as soon as closing tags are detected.
    """

    def __init__(self) -> None:
        self._buffer = ""

    def feed(self, chunk: str) -> Generator[StreamEvent, None, None]:
        self._buffer += chunk
        while True:
            match = TAG_PATTERN.search(self._buffer)
            if not match:
                break
            tag = match.group(1)
            content = match.group(2).strip()
            event_type = TAG_TO_EVENT.get(tag, EventType.THINKING)
            yield StreamEvent(type=event_type, content=content)
            self._buffer = self._buffer[match.end():]

    def flush(self) -> Generator[StreamEvent, None, None]:
        remaining = self._buffer.strip()
        if remaining:
            yield StreamEvent(type=EventType.THINKING, content=remaining)
        self._buffer = ""
