"use client";

import { AnalysisPhase } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  Code2,
  BarChart3,
  FileText,
} from "lucide-react";

interface StatusIndicatorProps {
  phase: AnalysisPhase;
}

const PHASE_CONFIG: Record<
  AnalysisPhase,
  { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  idle: { label: "就绪", icon: null, variant: "outline" },
  uploading: {
    label: "上传中…",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    variant: "secondary",
  },
  planning: {
    label: "规划中…",
    icon: <Brain className="h-3.5 w-3.5 animate-pulse" />,
    variant: "default",
  },
  coding: {
    label: "执行代码中…",
    icon: <Code2 className="h-3.5 w-3.5 animate-pulse" />,
    variant: "default",
  },
  analyzing: {
    label: "分析数据中…",
    icon: <BarChart3 className="h-3.5 w-3.5 animate-pulse" />,
    variant: "default",
  },
  reporting: {
    label: "生成报告中…",
    icon: <FileText className="h-3.5 w-3.5 animate-pulse" />,
    variant: "default",
  },
  done: {
    label: "分析完成",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    variant: "default",
  },
  error: {
    label: "出现错误",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    variant: "destructive",
  },
};

export function StatusIndicator({ phase }: StatusIndicatorProps) {
  const config = PHASE_CONFIG[phase];
  if (phase === "idle") return null;

  return (
    <Badge variant={config.variant} className="gap-1.5 py-1 text-xs">
      {config.icon}
      {config.label}
    </Badge>
  );
}
