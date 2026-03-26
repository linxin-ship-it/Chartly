export type EventType =
  | "status"
  | "think"
  | "tool"
  | "code"
  | "result"
  | "report"
  | "chart"
  | "mermaid"
  | "error"
  | "done";

export interface StreamEvent {
  type: EventType;
  content: string;
}

export interface ProcessItem {
  id: string;
  type: EventType;
  content: string;
  timestamp: number;
}

export interface ChartConfig {
  title: string;
  option: Record<string, unknown>;
}

export type AnalysisStatus =
  | "idle"
  | "uploading"
  | "planning"
  | "coding"
  | "analyzing"
  | "reporting"
  | "done"
  | "error";

export const STATUS_LABELS: Record<AnalysisStatus, string> = {
  idle: "就绪",
  uploading: "上传中",
  planning: "规划中",
  coding: "执行代码中",
  analyzing: "分析中",
  reporting: "生成报告中",
  done: "分析完成",
  error: "出错了",
};
