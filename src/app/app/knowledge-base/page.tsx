"use client";

import { useState } from "react";
import KnowledgeBaseManagement from "@/components/KnowledgeBaseManagement";
import ReportPanel from "@/components/ReportPanel";

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"kb" | "report">("kb");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">知识库管理</h1>
          <p className="text-gray-600">根据项目和任务自动生成的知识库，支持附件管理</p>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("kb")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "kb"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            知识库
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "report"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            项目报告
          </button>
        </div>

        {activeTab === "kb" ? <KnowledgeBaseManagement /> : <ReportPanel />}
      </div>
    </div>
  );
}
