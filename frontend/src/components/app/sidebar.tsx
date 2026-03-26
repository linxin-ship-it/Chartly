"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "./file-upload";
import { StatusIndicator } from "./status-indicator";
import { useAppStore } from "@/lib/store";
import { startAnalysis } from "@/lib/api";
import { Play } from "lucide-react";

export function Sidebar() {
  const [file, setFile] = useState<File | null>(null);
  const [goal, setGoal] = useState("");
  const status = useAppStore((s) => s.status);
  const isRunning = !["idle", "done", "error"].includes(status);

  const handleSubmit = async () => {
    if (!file || !goal.trim()) return;
    try {
      await startAnalysis(file, goal.trim());
    } catch (err) {
      useAppStore.getState().setStatus("error");
      useAppStore.getState().addProcessItem({
        id: `error-${Date.now()}`,
        type: "error",
        content: `分析失败: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now(),
      });
    }
  };

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col gap-5 border-r border-white/10 bg-[#222222] p-5">
      <h2 className="text-base font-semibold text-white">分析任务</h2>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            数据文件
          </label>
          <FileUpload file={file} onFileChange={setFile} disabled={isRunning} />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted">
            分析需求
          </label>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={"例：对销售数据进行描述性统计，分析各区域/产品的销售趋势，找出关键增长点和风险点，并给出建议。"}
            rows={5}
            disabled={isRunning}
            className="resize-none border-white/15 bg-[#333333] text-white placeholder:text-text-muted/50 focus:border-chartly focus:ring-chartly/30"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!file || !goal.trim() || isRunning}
          className="w-full gap-2 bg-chartly text-white font-semibold hover:bg-chartly/90 border-0 disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          {isRunning ? "分析中..." : "开始分析"}
        </Button>
      </div>

      <div className="mt-auto">
        <StatusIndicator status={status} />
      </div>
    </aside>
  );
}
