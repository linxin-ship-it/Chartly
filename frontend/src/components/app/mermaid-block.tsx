"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidBlockProps {
  source: string;
}

export function MermaidBlock({ source }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#6CC3C5",
            primaryBorderColor: "#4aa3a5",
            primaryTextColor: "#ffffff",
            lineColor: "#A1A1A1",
            secondaryColor: "#333333",
            tertiaryColor: "#262626",
          },
        });

        if (cancelled || !containerRef.current) return;

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, source);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Mermaid 渲染失败");
        }
      }
    };

    renderDiagram();
    return () => { cancelled = true; };
  }, [source]);

  if (error) {
    return (
      <div className="my-4 rounded-lg bg-red-900/20 p-4 text-sm text-red-400">
        Mermaid 渲染错误：{error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto rounded-lg border border-white/10 bg-[#262626] p-4 [&_svg]:max-w-full"
    />
  );
}
