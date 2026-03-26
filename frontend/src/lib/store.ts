import { create } from "zustand";
import type { ProcessItem, AnalysisStatus, ChartConfig } from "./types";

interface AppState {
  status: AnalysisStatus;
  processItems: ProcessItem[];
  reportMarkdown: string;
  charts: ChartConfig[];
  mermaidDiagrams: string[];
  activeTab: "process" | "report";
  fileName: string | null;

  setStatus: (s: AnalysisStatus) => void;
  addProcessItem: (item: ProcessItem) => void;
  appendReport: (md: string) => void;
  addChart: (chart: ChartConfig) => void;
  addMermaid: (src: string) => void;
  setActiveTab: (tab: "process" | "report") => void;
  setFileName: (name: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: "idle" as AnalysisStatus,
  processItems: [] as ProcessItem[],
  reportMarkdown: "",
  charts: [] as ChartConfig[],
  mermaidDiagrams: [] as string[],
  activeTab: "process" as const,
  fileName: null as string | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  addProcessItem: (item) =>
    set((state) => ({ processItems: [...state.processItems, item] })),
  appendReport: (md) =>
    set((state) => ({ reportMarkdown: state.reportMarkdown + md })),
  addChart: (chart) =>
    set((state) => ({ charts: [...state.charts, chart] })),
  addMermaid: (src) =>
    set((state) => ({ mermaidDiagrams: [...state.mermaidDiagrams, src] })),
  setActiveTab: (activeTab) => set({ activeTab }),
  setFileName: (fileName) => set({ fileName }),
  reset: () => set({ ...initialState }),
}));
