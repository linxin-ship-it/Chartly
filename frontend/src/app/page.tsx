"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sidebar } from "@/components/app/sidebar";
import { ProcessView } from "@/components/app/process-view";
import { ReportView } from "@/components/app/report-view";
import { useAnalysisStore } from "@/lib/store";

export default function HomePage() {
  const {
    phase,
    steps,
    report,
    file,
    goal,
    setFile,
    setGoal,
    start,
    stop,
    reset,
  } = useAnalysisStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        file={file}
        goal={goal}
        phase={phase}
        onFileChange={setFile}
        onGoalChange={setGoal}
        onStart={start}
        onStop={stop}
        onReset={reset}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <Tabs defaultValue="process" className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-6 pt-3">
            <TabsList>
              <TabsTrigger value="process">分析过程</TabsTrigger>
              <TabsTrigger value="report" className="relative">
                最终报告
                {report && (
                  <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="process"
            className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            <ProcessView steps={steps} />
          </TabsContent>

          <TabsContent
            value="report"
            className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden"
          >
            <ReportView content={report} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
