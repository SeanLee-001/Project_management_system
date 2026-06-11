"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWithinInterval,
  parseISO,
  differenceInDays,
} from "date-fns";

interface ProgressPhase {
  phase: string;
  startDate: string;
  endDate: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
}

interface GanttChartProps {
  data: string; // JSON string of ProgressPhase[]
}

export default function GanttChart({ data }: GanttChartProps) {
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);

  const phases = useMemo(() => {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [data]);

  const dateRange = useMemo(() => {
    if (phases.length === 0) return null;

    const allDates = phases.flatMap((phase) => {
      const start = parseISO(phase.startDate);
      const end = parseISO(phase.endDate);
      return [start, end];
    });

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // 扩展范围以包含整个月份
    const start = startOfMonth(minDate);
    const end = endOfMonth(maxDate);

    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [phases]);

  if (phases.length === 0 || !dateRange) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">暂无项目进度计划</p>
      </div>
    );
  }

  const totalDays = dateRange.days.length;
  const dayWidth = Math.max(30, Math.min(50, 1200 / totalDays)); // 响应式列宽

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "todo":
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "completed":
        return "已完成";
      case "in_progress":
        return "进行中";
      case "todo":
        return "待开始";
      default:
        return "";
    }
  };

  const getPhasePosition = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const startDayIndex = differenceInDays(start, dateRange.start);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: (startDayIndex * dayWidth) / totalDays * 100,
      width: (duration * dayWidth) / totalDays * 100,
    };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 头部时间轴 */}
      <div className="overflow-x-auto">
        <div
          className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10"
          style={{ minWidth: `${totalDays * dayWidth}px` }}
        >
          {/* 年份行 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 py-1 text-center border-b border-gray-200 dark:border-gray-600">
            {format(dateRange.start, "yyyy年")}
          </div>
          {/* 月份和日期 */}
          <div className="flex">
            {dateRange.days.map((day, index) => (
              <div
                key={index}
                className="flex-shrink-0 text-center border-r border-gray-200 dark:border-gray-600"
                style={{ width: dayWidth }}
              >
                {day.getDate() === 1 || index === 0 ? (
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 py-1">
                    {format(day, "M月")}
                  </div>
                ) : null}
                <div
                  className={`text-sm py-2 ${
                    format(day, "EEE") === "周六" || format(day, "EEE") === "周日"
                      ? "text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 甘特图主体 */}
        <div
          className="relative"
          style={{ minWidth: `${totalDays * dayWidth}px`, minHeight: `${phases.length * 50 + 20}px` }}
        >
          {/* 背景网格 */}
          <div className="absolute inset-0 flex">
            {dateRange.days.map((day, index) => (
              <div
                key={index}
                className={`flex-shrink-0 border-r border-gray-100 dark:border-gray-700 ${
                  format(day, "EEE") === "周六" || format(day, "EEE") === "周日"
                    ? "bg-red-50 dark:bg-red-900/10"
                    : ""
                }`}
                style={{ width: dayWidth }}
              />
            ))}
          </div>

          {/* 阶段条 */}
          <div className="relative py-3 space-y-2 px-2">
            {phases.map((phase, index) => {
              const position = getPhasePosition(phase.startDate, phase.endDate);
              return (
                <div
                  key={index}
                  className="relative h-8 rounded-md cursor-pointer group"
                  onMouseEnter={() => setHoveredPhase(phase.phase)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  {/* 阶段名称（左侧固定） */}
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-white dark:bg-gray-800 z-20 flex items-center px-2 text-sm font-medium text-gray-900 dark:text-white truncate shadow-sm"
                    style={{ width: "100px", maxWidth: "100px" }}
                  >
                    {phase.phase}
                  </div>

                  {/* 进度条 */}
                  <div
                    className={`absolute top-1 bottom-1 rounded-md ${getStatusColor(phase.status)} opacity-90 group-hover:opacity-100 transition-opacity shadow-sm`}
                    style={{
                      left: `calc(100px + ${position.left}%)`,
                      width: `${Math.max(position.width, 2)}%`,
                    }}
                  >
                    {/* 进度条文字 */}
                    <div className="absolute left-0 top-0 bottom-0 flex items-center px-2">
                      <span className="text-xs text-white font-medium truncate">
                        {phase.status === "completed" && "✓ "}
                        {phase.startDate.split("-")[1]}-{phase.startDate.split("-")[2]} 至 {phase.endDate.split("-")[1]}-{phase.endDate.split("-")[2]}
                      </span>
                    </div>
                  </div>

                  {/* 悬浮提示 */}
                  {hoveredPhase === phase.phase && (
                    <div
                      className="absolute z-30 left-full ml-2 top-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
                      style={{ maxWidth: "300px" }}
                    >
                      <div className="font-semibold mb-1">{phase.phase}</div>
                      <div className="opacity-80">
                        {phase.startDate} ~ {phase.endDate}
                      </div>
                      {phase.description && (
                        <div className="mt-1 opacity-80">{phase.description}</div>
                      )}
                      {phase.status && (
                        <div className="mt-1 text-green-400">
                          状态: {getStatusText(phase.status)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>已完成</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span>进行中</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded bg-gray-400"></div>
          <span>待开始</span>
        </div>
      </div>
    </div>
  );
}
