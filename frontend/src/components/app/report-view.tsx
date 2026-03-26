"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EChartsBlock } from "./echarts-block";
import { MermaidBlock } from "./mermaid-block";

interface ReportViewProps {
  content: string;
}

interface ContentSegment {
  type: "markdown" | "echarts" | "mermaid";
  content: string;
  key: string;
}

function parseReportContent(markdown: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const codeBlockRegex = /```(echarts|mermaid)\s*\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "markdown",
        content: markdown.slice(lastIndex, match.index),
        key: `md-${idx++}`,
      });
    }

    segments.push({
      type: match[1] as "echarts" | "mermaid",
      content: match[2].trim(),
      key: `${match[1]}-${idx++}`,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markdown.length) {
    segments.push({
      type: "markdown",
      content: markdown.slice(lastIndex),
      key: `md-${idx++}`,
    });
  }

  return segments;
}

function MarkdownSegment({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        table: ({ children, ...props }) => (
          <div className="my-4 overflow-x-auto">
            <table
              className="min-w-full border-collapse border border-border text-sm"
              {...props}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }) => (
          <thead className="bg-muted" {...props}>
            {children}
          </thead>
        ),
        th: ({ children, ...props }) => (
          <th
            className="border border-border px-3 py-2 text-left font-semibold"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-border px-3 py-2" {...props}>
            {children}
          </td>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code
              className={`block overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 ${className || ""}`}
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-4">{children}</pre>,
        h1: ({ children }) => (
          <h1 className="mb-4 mt-8 text-2xl font-bold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 mt-6 text-xl font-semibold">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-5 text-lg font-semibold">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-7 text-foreground/90">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-6 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-6 list-decimal space-y-1">{children}</ol>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ReportView({ content }: ReportViewProps) {
  const segments = useMemo(() => parseReportContent(content), [content]);

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">分析完成后，最终报告将在此显示</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <article className="prose prose-zinc dark:prose-invert mx-auto max-w-none p-6">
        {segments.map((seg) => {
          switch (seg.type) {
            case "echarts":
              return <EChartsBlock key={seg.key} optionJson={seg.content} />;
            case "mermaid":
              return <MermaidBlock key={seg.key} code={seg.content} />;
            default:
              return <MarkdownSegment key={seg.key} content={seg.content} />;
          }
        })}
      </article>
    </ScrollArea>
  );
}
