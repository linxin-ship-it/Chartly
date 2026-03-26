"use client";

import { AnalysisPhase } from "@/lib/types";
import { FileUpload } from "./file-upload";
import { StatusIndicator } from "./status-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RotateCcw, BarChart3 } from "lucide-react";

interface SidebarProps {
  file: File | null;
  goal: string;
  phase: AnalysisPhase;
  onFileChange: (file: File | null) => void;
  onGoalChange: (goal: string) => void;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

const RUNNING_PHASES: AnalysisPhase[] = [
  "uploading",
  "planning",
  "coding",
  "analyzing",
  "reporting",
];

export function Sidebar({
  file,
  goal,
  phase,
  onFileChange,
  onGoalChange,
  onStart,
  onStop,
  onReset,
}: SidebarProps) {
  const isRunning = RUNNING_PHASES.includes(phase);
  const canStart = !!file && goal.trim().length > 0 && !isRunning;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">Chartly</h1>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <div>
          <label className="mb-2 block text-sm font-medium">数据文件</label>
          <FileUpload
            file={file}
            onFileChange={onFileChange}
            disabled={isRunning}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">分析需求</label>
          <Textarea
            placeholder="例如：分析各季度销售趋势，找出销量最高的产品类别，并给出优化建议"
            value={goal}
            onChange={(e) => onGoalChange(e.target.value)}
            disabled={isRunning}
            className="min-h-[120px] resize-none"
          />
        </div>

        <Separator />

        <StatusIndicator phase={phase} />

        <div className="flex flex-col gap-2">
          {!isRunning ? (
            <Button onClick={onStart} disabled={!canStart} className="w-full gap-2">
              <Play className="h-4 w-4" />
              开始分析
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              className="w-full gap-2"
            >
              <Square className="h-4 w-4" />
              停止分析
            </Button>
          )}

          {(phase === "done" || phase === "error") && (
            <Button
              onClick={onReset}
              variant="outline"
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              重新开始
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
