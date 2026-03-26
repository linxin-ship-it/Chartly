"use client";

import { useEffect, useRef } from "react";
import { ProcessStep } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Code2,
  Terminal,
  ClipboardList,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface ProcessViewProps {
  steps: ProcessStep[];
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  thinking: {
    label: "思考",
    icon: <Brain className="h-4 w-4" />,
    className: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
  },
  plan: {
    label: "计划",
    icon: <ClipboardList className="h-4 w-4" />,
    className: "border-l-violet-500 bg-violet-50/50 dark:bg-violet-950/20",
  },
  tool_call: {
    label: "代码",
    icon: <Code2 className="h-4 w-4" />,
    className: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  },
  tool_result: {
    label: "结果",
    icon: <Terminal className="h-4 w-4" />,
    className: "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  status: {
    label: "状态",
    icon: <Sparkles className="h-4 w-4" />,
    className: "border-l-gray-400 bg-gray-50/50 dark:bg-gray-950/20",
  },
  report: {
    label: "报告",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  },
  error: {
    label: "错误",
    icon: <AlertCircle className="h-4 w-4" />,
    className: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  },
  done: {
    label: "完成",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
  },
};

function StepCard({ step }: { step: ProcessStep }) {
  const config = TYPE_CONFIG[step.type] || TYPE_CONFIG.thinking;

  if (step.type === "done" || (step.type === "status" && !step.content)) return null;
  if (step.type === "report") return null;

  let displayContent = step.content;
  if (step.type === "tool_call") {
    try {
      const parsed = JSON.parse(step.content);
      displayContent = parsed.code || step.content;
    } catch {
      displayContent = step.content;
    }
  }

  return (
    <Card className={`border-l-4 ${config.className} shadow-none`}>
      <CardContent className="px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          {config.icon}
          <Badge variant="outline" className="text-xs">
            {config.label}
          </Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(step.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
          {displayContent}
        </pre>
      </CardContent>
    </Card>
  );
}

export function ProcessView({ steps }: ProcessViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length]);

  const visibleSteps = steps.filter(
    (s) => s.type !== "done" && s.type !== "report" && s.content,
  );

  if (visibleSteps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">上传文件并输入分析需求后，分析过程将在此显示</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4">
        {visibleSteps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
