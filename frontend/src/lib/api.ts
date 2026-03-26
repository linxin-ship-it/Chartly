import type { StreamEvent, ChartConfig } from "./types";
import { useAppStore } from "./store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let itemCounter = 0;

function statusToPhase(statusText: string): "planning" | "coding" | "analyzing" | "reporting" | "done" {
  if (statusText.includes("规划")) return "planning";
  if (statusText.includes("代码") || statusText.includes("执行")) return "coding";
  if (statusText.includes("分析")) return "analyzing";
  if (statusText.includes("报告")) return "reporting";
  if (statusText.includes("完成") || statusText.includes("结束")) return "done";
  return "analyzing";
}

export async function startAnalysis(file: File, goal: string): Promise<void> {
  const store = useAppStore.getState();
  store.reset();
  store.setStatus("uploading");
  store.setFileName(file.name);
  store.setActiveTab("process");
  itemCounter = 0;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("goal", goal);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    store.setStatus("error");
    store.addProcessItem({
      id: `item-${++itemCounter}`,
      type: "error",
      content: `请求失败: ${response.status} ${errorText}`,
      timestamp: Date.now(),
    });
    return;
  }

  store.setStatus("planning");

  const reader = response.body?.getReader();
  if (!reader) {
    store.setStatus("error");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const jsonStr = trimmed.slice(6);
      let event: StreamEvent;
      try {
        event = JSON.parse(jsonStr);
      } catch {
        continue;
      }

      handleEvent(event);
    }
  }

  if (buffer.trim()) {
    const trimmed = buffer.trim();
    if (trimmed.startsWith("data: ")) {
      try {
        const event: StreamEvent = JSON.parse(trimmed.slice(6));
        handleEvent(event);
      } catch { /* ignore */ }
    }
  }

  const finalStatus = useAppStore.getState().status;
  if (finalStatus !== "done" && finalStatus !== "error") {
    store.setStatus("done");
  }
}

function handleEvent(event: StreamEvent): void {
  const store = useAppStore.getState();

  switch (event.type) {
    case "status": {
      const phase = statusToPhase(event.content);
      store.setStatus(phase);
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "status",
        content: event.content,
        timestamp: Date.now(),
      });
      break;
    }

    case "think":
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "think",
        content: event.content,
        timestamp: Date.now(),
      });
      break;

    case "code":
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "code",
        content: event.content,
        timestamp: Date.now(),
      });
      break;

    case "result":
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "result",
        content: event.content,
        timestamp: Date.now(),
      });
      break;

    case "report":
      store.appendReport(event.content + "\n");
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "report",
        content: "报告已生成",
        timestamp: Date.now(),
      });
      store.setActiveTab("report");
      break;

    case "chart": {
      try {
        const chartConfig: ChartConfig = JSON.parse(event.content);
        store.addChart(chartConfig);
        store.addProcessItem({
          id: `item-${++itemCounter}`,
          type: "chart",
          content: chartConfig.title || "图表",
          timestamp: Date.now(),
        });
      } catch {
        store.addProcessItem({
          id: `item-${++itemCounter}`,
          type: "error",
          content: "图表配置解析失败",
          timestamp: Date.now(),
        });
      }
      break;
    }

    case "mermaid":
      store.addMermaid(event.content);
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "mermaid",
        content: "流程图已生成",
        timestamp: Date.now(),
      });
      break;

    case "error":
      store.addProcessItem({
        id: `item-${++itemCounter}`,
        type: "error",
        content: event.content,
        timestamp: Date.now(),
      });
      break;

    case "done":
      store.setStatus("done");
      break;
  }
}
