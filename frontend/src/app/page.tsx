"use client";

import Image from "next/image";
import { Sidebar } from "@/components/app/sidebar";
import { ProcessView } from "@/components/app/process-view";
import { ReportView } from "@/components/app/report-view";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header: 左侧与边栏同宽；Tab 在右侧区域水平居中，与输出面板对齐 */}
      <header className="flex h-[52px] shrink-0 items-center bg-[#222222]">
        <div className="flex h-full w-[320px] shrink-0 items-center justify-start gap-2.5 border-r border-white/10 px-5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0"
            aria-hidden
          >
            <path
              d="M7 18V12l3-4h8l3 4v6l-3 3H10l-3-3z"
              stroke="#6CC3C5"
              strokeWidth="1.5"
              fill="none"
            />
            <rect x="11" y="13" width="2" height="5" rx="0.5" fill="#6CC3C5" />
            <rect x="15" y="11" width="2" height="7" rx="0.5" fill="#6CC3C5" />
          </svg>
          <Image
            src="/chartly-text.svg"
            alt="Chartly"
            width={83}
            height={24}
            className="h-[22px] w-auto"
            priority
          />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-8 self-stretch px-4">
          <TabButton
            label="分析过程"
            active={activeTab === "process"}
            onClick={() => setActiveTab("process")}
          />
          <TabButton
            label="最终报告"
            active={activeTab === "report"}
            onClick={() => setActiveTab("report")}
          />
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#262626]">
          <div className="flex-1 overflow-hidden">
            {activeTab === "process" ? <ProcessView /> : <ReportView />}
          </div>
        </main>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-full items-center text-sm font-medium transition-colors"
      style={{ color: active ? "#FFFFFF" : "#A1A1A1" }}
    >
      {label}
      {active && (
        <span
          className="absolute bottom-1 left-1/2 h-[2.5px] -translate-x-1/2 rounded-full bg-chartly"
          style={{ width: "60%" }}
        />
      )}
    </button>
  );
}
