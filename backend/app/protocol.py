"""
Streaming protocol: structured tags that allow the frontend to route
different content types to different UI components.

Tag format in LLM output:
  <THINK>...</THINK>       — internal reasoning (shown in process view)
  <TOOL>...</TOOL>         — tool call decision JSON
  <REPORT>...</REPORT>     — final user-facing markdown report
  <CHART>...</CHART>       — ECharts option JSON
  <MERMAID>...</MERMAID>   — Mermaid diagram source

SSE event types sent to frontend:
  status   — phase change (planning / coding / reporting)
  think    — model reasoning text
  tool     — tool call decision
  code     — code about to be executed
  result   — tool execution result
  report   — final report fragment
  chart    — ECharts config JSON
  mermaid  — Mermaid diagram source
  error    — error message
  done     — stream finished
"""

from __future__ import annotations
import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Generator


class EventType(str, Enum):
    STATUS = "status"
    THINK = "think"
    TOOL = "tool"
    CODE = "code"
    RESULT = "result"
    REPORT = "report"
    CHART = "chart"
    MERMAID = "mermaid"
    ERROR = "error"
    DONE = "done"


@dataclass
class SSEEvent:
    event: EventType
    data: str

    def encode(self) -> str:
        payload = json.dumps({"type": self.event.value, "content": self.data}, ensure_ascii=False)
        return f"data: {payload}\n\n"


TAG_PATTERN = re.compile(
    r"<(THINK|TOOL|REPORT|CHART|MERMAID)>(.*?)</\1>",
    re.DOTALL,
)

TAG_TO_EVENT: dict[str, EventType] = {
    "THINK": EventType.THINK,
    "TOOL": EventType.TOOL,
    "REPORT": EventType.REPORT,
    "CHART": EventType.CHART,
    "MERMAID": EventType.MERMAID,
}


def parse_tags(text: str) -> list[SSEEvent]:
    """Extract all tagged sections from a complete LLM response."""
    events: list[SSEEvent] = []
    for match in TAG_PATTERN.finditer(text):
        tag_name = match.group(1)
        content = match.group(2).strip()
        event_type = TAG_TO_EVENT.get(tag_name)
        if event_type:
            events.append(SSEEvent(event=event_type, data=content))
    return events


@dataclass
class StreamParser:
    """
    Incremental parser that buffers streaming text and emits SSE events
    as soon as complete tagged sections are found.
    """
    buffer: str = ""
    _open_tags: list[str] = field(default_factory=list)

    def feed(self, chunk: str) -> list[SSEEvent]:
        self.buffer += chunk
        events: list[SSEEvent] = []
        while True:
            found = TAG_PATTERN.search(self.buffer)
            if not found:
                break
            tag_name = found.group(1)
            content = found.group(2).strip()
            event_type = TAG_TO_EVENT.get(tag_name)
            if event_type:
                events.append(SSEEvent(event=event_type, data=content))
            self.buffer = self.buffer[found.end():]
        return events

    def flush(self) -> list[SSEEvent]:
        """Return any remaining untagged text as a think event."""
        events: list[SSEEvent] = []
        remaining = self.buffer.strip()
        if remaining:
            events.append(SSEEvent(event=EventType.THINK, data=remaining))
        self.buffer = ""
        return events
