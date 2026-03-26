"use client";

import { create } from "zustand";
import { startAnalysis } from "./api";
import type { AnalysisPhase, ProcessStep, StreamEvent } from "./types";

function phaseFromStatusContent(content: string): AnalysisPhase | null {
  const t = content.trim().toLowerCase();
  if (
    t === "planning" ||
    t === "coding" ||
    t === "analyzing" ||
    t === "reporting" ||
    t === "done"
  ) {
    return t;
  }
  return null;
}

function applyStreamEvent(
  event: StreamEvent,
): Partial<{
  phase: AnalysisPhase;
  report: string | null;
}> {
  if (event.type === "status") {
    const p = phaseFromStatusContent(event.content);
    if (p) return { phase: p };
    return {};
  }
  if (event.type === "report") {
    return { report: event.content, phase: "reporting" };
  }
  if (event.type === "error") {
    return { phase: "error" };
  }
  if (event.type === "done") {
    return { phase: "done" };
  }
  return {};
}

interface AnalysisState {
  phase: AnalysisPhase;
  steps: ProcessStep[];
  report: string | null;
  file: File | null;
  goal: string;
  abortController: AbortController | null;
  setFile: (file: File | null) => void;
  setGoal: (goal: string) => void;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  phase: "idle",
  steps: [],
  report: null,
  file: null,
  goal: "",
  abortController: null,

  setFile: (file) => set({ file }),
  setGoal: (goal) => set({ goal }),

  reset: () => {
    get().abortController?.abort();
    set({
      phase: "idle",
      steps: [],
      report: null,
      file: null,
      goal: "",
      abortController: null,
    });
  },

  stop: () => {
    get().abortController?.abort();
    set({ phase: "idle", abortController: null });
  },

  start: async () => {
    const { file, goal } = get();
    if (!file || !goal.trim()) return;

    get().abortController?.abort();

    set({
      phase: "uploading",
      steps: [],
      report: null,
      abortController: null,
    });

    const appendStep = (event: StreamEvent) => {
      const step: ProcessStep = {
        id: crypto.randomUUID(),
        type: event.type,
        content: event.content,
        timestamp: Date.now(),
      };
      set((s) => ({ steps: [...s.steps, step], ...applyStreamEvent(event) }));
    };

    const controller = await startAnalysis(
      file,
      goal.trim(),
      (event) => {
        appendStep(event);
      },
      () => {
        set({ phase: "done", abortController: null });
      },
      (error) => {
        const step: ProcessStep = {
          id: crypto.randomUUID(),
          type: "error",
          content: error,
          timestamp: Date.now(),
        };
        set((s) => ({
          steps: [...s.steps, step],
          phase: "error",
          abortController: null,
        }));
      },
    );

    set((s) => ({
      abortController: controller,
      ...(s.phase === "uploading" ? { phase: "planning" as const } : {}),
    }));
  },
}));
