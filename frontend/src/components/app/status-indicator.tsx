"use client";

import { Loader2, CheckCircle2, AlertCircle, Brain, Code2, FileText, Clock } from "lucide-react";
import type { AnalysisStatus } from "@/lib/types";

interface StatusIndicatorProps {
  status: AnalysisStatus;
}

const STATUS_CONFIG: Record<
  AnalysisStatus,
  { label: string; icon: React.ElementType; color: string; animate?: boolean }
> = {
  idle: { label: "就绪", icon: Clock, color: "text-text-muted" },
  uploading: { label: "上传中", icon: Loader2, color: "text-chartly", animate: true },
  planning: { label: "规划中", icon: Brain, color: "text-chartly", animate: true },
  coding: { label: "执行代码中", icon: Code2, color: "text-chartly", animate: true },
  analyzing: { label: "分析中", icon: Brain, color: "text-chartly", animate: true },
  reporting: { label: "生成报告中", icon: FileText, color: "text-chartly", animate: true },
  done: { label: "分析完成", icon: CheckCircle2, color: "text-green-400" },
  error: { label: "出错了", icon: AlertCircle, color: "text-red-400" },
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-[#333333] px-4 py-3">
      <Icon
        className={`h-4 w-4 ${config.color} ${config.animate ? "animate-spin" : ""}`}
        style={config.animate && config.icon !== Loader2 ? { animation: "pulse 2s infinite" } : undefined}
      />
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      {config.animate && (
        <span className="ml-auto flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-chartly"
              style={{
                animation: "pulse 1.4s infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
