"use client";

import { useEffect, useRef } from "react";
import {
  Brain,
  Code2,
  Terminal,
  AlertCircle,
  BarChart3,
  GitBranch,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { ProcessItem, EventType } from "@/lib/types";

const ITEM_STYLES: Record<
  EventType,
  { icon: React.ElementType; accent: string; bg: string; label: string }
> = {
  status: { icon: ChevronRight, accent: "text-chartly", bg: "bg-chartly/10", label: "状态" },
  think: { icon: Brain, accent: "text-purple-400", bg: "bg-purple-400/10", label: "思考" },
  tool: { icon: Code2, accent: "text-blue-400", bg: "bg-blue-400/10", label: "工具" },
  code: { icon: Code2, accent: "text-amber-400", bg: "bg-amber-400/10", label: "代码" },
  result: { icon: Terminal, accent: "text-green-400", bg: "bg-green-400/10", label: "结果" },
  report: { icon: FileText, accent: "text-chartly", bg: "bg-chartly/10", label: "报告" },
  chart: { icon: BarChart3, accent: "text-chartly", bg: "bg-chartly/10", label: "图表" },
  mermaid: { icon: GitBranch, accent: "text-cyan-400", bg: "bg-cyan-400/10", label: "流程图" },
  error: { icon: AlertCircle, accent: "text-red-400", bg: "bg-red-400/10", label: "错误" },
  done: { icon: ChevronRight, accent: "text-green-400", bg: "bg-green-400/10", label: "完成" },
};

function ProcessCard({ item }: { item: ProcessItem }) {
  const style = ITEM_STYLES[item.type] || ITEM_STYLES.think;
  const Icon = style.icon;
  const isCode = item.type === "code";
  const isResult = item.type === "result";

  return (
    <div className={`rounded-lg ${style.bg} border border-white/5 p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${style.accent}`} />
        <span className={`text-xs font-medium uppercase tracking-wider ${style.accent}`}>
          {style.label}
        </span>
        <span className="ml-auto text-xs text-white/40">
          {new Date(item.timestamp).toLocaleTimeString("zh-CN")}
        </span>
      </div>
      {(isCode || isResult) ? (
        <pre className="overflow-x-auto rounded-md bg-[#1a1a1a] p-3 text-xs leading-relaxed text-white/80 font-mono">
          <code>{item.content}</code>
        </pre>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
          {item.content}
        </p>
      )}
    </div>
  );
}

export function ProcessView() {
  const processItems = useAppStore((s) => s.processItems);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [processItems]);

  if (processItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#262626] text-white/50">
        <Brain className="mb-4 h-12 w-12 opacity-30" />
        <p className="text-sm">上传数据并开始分析后，AI 的思考过程将在这里展示</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex h-full flex-col gap-3 overflow-y-auto bg-[#262626] p-5">
      {processItems.map((item) => (
        <ProcessCard key={item.id} item={item} />
      ))}
    </div>
  );
}
