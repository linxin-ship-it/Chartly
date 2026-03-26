"use client";

import { useEffect, useRef } from "react";
import type { ChartConfig } from "@/lib/types";

interface EChartsBlockProps {
  config: ChartConfig;
}

export function EChartsBlock({ config }: EChartsBlockProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof import("echarts")["init"]> | null>(null);

  useEffect(() => {
    let disposed = false;

    const initChart = async () => {
      const echarts = await import("echarts");
      if (disposed || !chartRef.current) return;

      if (instanceRef.current) {
        instanceRef.current.dispose();
      }

      const chart = echarts.init(chartRef.current, "dark");
      instanceRef.current = chart;

      const option = {
        backgroundColor: "transparent",
        ...config.option,
      };

      chart.setOption(option);

      const resizeObserver = new ResizeObserver(() => {
        chart.resize();
      });
      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    };

    initChart();

    return () => {
      disposed = true;
      instanceRef.current?.dispose();
    };
  }, [config]);

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-white/10 bg-[#262626] p-4">
      {config.title && (
        <h4 className="mb-3 text-sm font-medium text-white">{config.title}</h4>
      )}
      <div ref={chartRef} className="h-[350px] w-full" />
    </div>
  );
}
