"use client";

import { useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";

interface ProgressPhase {
  phase: string;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
}

interface ProgressPlanTableProps {
  data: string; // JSON string of ProgressPhase[]
}

export default function ProgressPlanTable({ data }: ProgressPlanTableProps) {
  const phases = useMemo(() => {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [data]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800";
      case "in_progress":
        return "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800";
      case "todo":
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300 border border-gray-200 dark:border-gray-600";
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
        return "-";
    }
  };

  const calculateDuration = (startDate: string, endDate: string, actualStartDate?: string, actualEndDate?: string) => {
    try {
      // 如果有实际时间，使用实际时间计算
      if (actualStartDate && actualEndDate) {
        const start = parseISO(actualStartDate);
        const end = parseISO(actualEndDate);
        const days = differenceInDays(end, start) + 1;
        return `${days} 天`;
      }
      // 否则使用计划时间计算
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const days = differenceInDays(end, start) + 1;
      return `${days} 天`;
    } catch {
      return "-";
    }
  };

  const calculateDelay = (plannedEndDate: string, actualEndDate?: string): { text: string; colorClass: string } => {
    try {
      if (!actualEndDate) return { text: "-", colorClass: "text-gray-900 dark:text-white" };
      const planned = parseISO(plannedEndDate);
      const actual = parseISO(actualEndDate);
      const days = differenceInDays(actual, planned);
      
      if (days > 0) {
        return { text: `延期 ${days} 天`, colorClass: "text-red-700 dark:text-red-400" };
      } else if (days < 0) {
        return { text: `提前 ${Math.abs(days)} 天`, colorClass: "text-green-700 dark:text-green-400" };
      } else {
        return { text: "按期完成", colorClass: "text-gray-900 dark:text-white" };
      }
    } catch {
      return { text: "-", colorClass: "text-gray-900 dark:text-white" };
    }
  };

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <p className="text-gray-500 dark:text-gray-400">暂无项目进度计划</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-300 dark:border-gray-600">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-b-2 border-red-300 dark:border-red-700">
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                序号
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                阶段名称
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                计划开始时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                实际开始时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                计划结束时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                实际结束时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                持续时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                延期时间
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                状态
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50">
                描述
              </th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase, index) => {
              const delayInfo = calculateDelay(phase.endDate, phase.actualEndDate);
              return (
                <tr
                  key={index}
                  className="border-b border-gray-200 dark:border-gray-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/30 text-center">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                    {phase.phase}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {format(parseISO(phase.startDate), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {phase.actualStartDate ? format(parseISO(phase.actualStartDate), "yyyy-MM-dd") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {format(parseISO(phase.endDate), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {phase.actualEndDate ? format(parseISO(phase.actualEndDate), "yyyy-MM-dd") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {calculateDuration(phase.startDate, phase.endDate, phase.actualStartDate, phase.actualEndDate)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    <span className={delayInfo.colorClass}>
                      {delayInfo.text}
                    </span>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(phase.status)}`}
                    >
                      {getStatusText(phase.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                    {phase.description || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-900/50 dark:to-gray-800/50 border-t-2 border-red-400 dark:border-red-600">
              <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                合计
              </td>
              <td className="px-4 py-3 text-sm font-bold text-red-700 dark:text-red-400 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                {(() => {
                  let totalDuration = 0;
                  phases.forEach(phase => {
                    const start = phase.actualStartDate ? parseISO(phase.actualStartDate) : parseISO(phase.startDate);
                    const end = phase.actualEndDate ? parseISO(phase.actualEndDate) : parseISO(phase.endDate);
                    totalDuration += differenceInDays(end, start) + 1;
                  });
                  return `总持续时间 ${totalDuration} 天`;
                })()}
              </td>
              <td className="px-4 py-3 text-sm font-bold border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                {(() => {
                  // 找出计划最晚结束时间
                  const latestPlannedEndDate = phases.reduce((latest, phase) => {
                    const endDate = parseISO(phase.endDate);
                    return endDate > latest ? endDate : latest;
                  }, parseISO(phases[0].endDate));

                  // 找出实际最晚结束时间
                  let latestActualEndDate: Date | null = null;
                  let hasActualEndDate = false;
                  phases.forEach(phase => {
                    if (phase.actualEndDate) {
                      hasActualEndDate = true;
                      const actualEndDate = parseISO(phase.actualEndDate);
                      if (!latestActualEndDate || actualEndDate > latestActualEndDate) {
                        latestActualEndDate = actualEndDate;
                      }
                    }
                  });

                  if (!hasActualEndDate || !latestActualEndDate) {
                    return <span className="text-gray-900 dark:text-white">-</span>;
                  }

                  const totalDelay = differenceInDays(latestActualEndDate, latestPlannedEndDate);

                  if (totalDelay > 0) {
                    return <span className="text-red-700 dark:text-red-400">总延期 {totalDelay} 天</span>;
                  } else if (totalDelay < 0) {
                    return <span className="text-green-700 dark:text-green-400">总提前 {Math.abs(totalDelay)} 天</span>;
                  } else {
                    return <span className="text-gray-900 dark:text-white">无延期</span>;
                  }
                })()}
              </td>
              <td colSpan={3} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                {phases.length} 个阶段 | 总计划时间从 {format(parseISO(phases[0].startDate), "yyyy-MM-dd")} 到 {format(parseISO(phases[phases.length - 1].endDate), "yyyy-MM-dd")}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
