export type AnalysisPhase =
  | "idle"
  | "uploading"
  | "planning"
  | "coding"
  | "analyzing"
  | "reporting"
  | "done"
  | "error";

export interface ProcessStep {
  id: string;
  type: string;
  content: string;
  timestamp: number;
}

export interface StreamEvent {
  type: string;
  content: string;
}
