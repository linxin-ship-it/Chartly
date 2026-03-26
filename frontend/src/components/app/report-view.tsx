"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "@/lib/store";
import { EChartsBlock } from "./echarts-block";
import { MermaidBlock } from "./mermaid-block";
import { FileText } from "lucide-react";

export function ReportView() {
  const reportMarkdown = useAppStore((s) => s.reportMarkdown);
  const charts = useAppStore((s) => s.charts);
  const mermaidDiagrams = useAppStore((s) => s.mermaidDiagrams);

  if (!reportMarkdown && charts.length === 0 && mermaidDiagrams.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#262626] text-white/50">
        <FileText className="mb-4 h-12 w-12 opacity-30" />
        <p className="text-sm">分析完成后，最终报告将在这里展示</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#262626] p-6">
      <div className="mx-auto max-w-4xl">
        {reportMarkdown && (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {reportMarkdown}
            </ReactMarkdown>
          </div>
        )}

        {charts.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {charts.map((chart, i) => (
              <EChartsBlock key={`chart-${i}`} config={chart} />
            ))}
          </div>
        )}

        {mermaidDiagrams.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {mermaidDiagrams.map((src, i) => (
              <MermaidBlock key={`mermaid-${i}`} source={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
