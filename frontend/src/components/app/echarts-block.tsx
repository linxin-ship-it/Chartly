"use client";

import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart, RadarChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

interface EChartsBlockProps {
  optionJson: string;
}

export function EChartsBlock({ optionJson }: EChartsBlockProps) {
  const option = useMemo(() => {
    try {
      return JSON.parse(optionJson);
    } catch {
      return null;
    }
  }, [optionJson]);

  if (!option) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        图表配置解析失败
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border bg-card p-2">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: 400, width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
