"use client";

import { useState, useEffect } from "react";
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

interface EditableProgressPlanTableProps {
  data: string; // JSON string of ProgressPhase[]
  onChange: (data: string) => void; // Callback when data changes
  readonly?: boolean; // Optional readonly mode
}

export default function EditableProgressPlanTable({
  data,
  onChange,
  readonly = false,
}: EditableProgressPlanTableProps) {
  const [phases, setPhases] = useState<ProgressPhase[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Parse JSON data when component mounts or data prop changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(data);
      setPhases(Array.isArray(parsed) ? parsed : []);
    } catch {
      setPhases([]);
    }
  }, [data]);

  // Save changes back to parent component
  const saveChanges = (newPhases: ProgressPhase[]) => {
    const jsonData = JSON.stringify(newPhases, null, 2);
    setPhases(newPhases);
    onChange(jsonData);
  };

  const addPhase = () => {
    const newPhase: ProgressPhase = {
      phase: `阶段 ${phases.length + 1}`,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      actualStartDate: undefined,
      actualEndDate: undefined,
      description: "",
      status: "todo",
    };
    const newPhases = [...phases, newPhase];
    saveChanges(newPhases);
    setEditingIndex(newPhases.length - 1);
  };

  const deletePhase = (index: number) => {
    if (confirm("确定要删除这个阶段吗？")) {
      const newPhases = phases.filter((_, i) => i !== index);
      saveChanges(newPhases);
    }
  };

  const movePhase = (index: number, direction: "up" | "down") => {
    const newPhases = [...phases];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < newPhases.length) {
      [newPhases[index], newPhases[newIndex]] = [newPhases[newIndex], newPhases[index]];
      saveChanges(newPhases);
    }
  };

  const updatePhase = (index: number, field: keyof ProgressPhase, value: any) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    saveChanges(newPhases);
  };

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

  const calculateDelay = (plannedEndDate: string, actualEndDate?: string) => {
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

  if (phases.length === 0 && !readonly) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <p className="text-gray-500 dark:text-gray-400 mb-3">暂无项目进度计划</p>
        <button
          onClick={addPhase}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          添加阶段
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-300 dark:border-gray-600">
      {!readonly && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={addPhase}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              添加阶段
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            共 {phases.length} 个阶段
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-b-2 border-red-300 dark:border-red-700">
              <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 w-16">
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
              {!readonly && (
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/50 w-32">
                  操作
                </th>
              )}
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
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {phase.phase}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={phase.phase}
                        onChange={(e) => updatePhase(index, "phase", e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {format(parseISO(phase.startDate), "yyyy-MM-dd")}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={phase.startDate}
                        onChange={(e) => updatePhase(index, "startDate", e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {phase.actualStartDate ? format(parseISO(phase.actualStartDate), "yyyy-MM-dd") : "-"}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={phase.actualStartDate || ""}
                        onChange={(e) => updatePhase(index, "actualStartDate", e.target.value || undefined)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {format(parseISO(phase.endDate), "yyyy-MM-dd")}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={phase.endDate}
                        onChange={(e) => updatePhase(index, "endDate", e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {phase.actualEndDate ? format(parseISO(phase.actualEndDate), "yyyy-MM-dd") : "-"}
                      </span>
                    ) : (
                      <input
                        type="date"
                        value={phase.actualEndDate || ""}
                        onChange={(e) => updatePhase(index, "actualEndDate", e.target.value || undefined)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
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
                    {readonly ? (
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${getStatusColor(phase.status)}`}
                      >
                        {getStatusText(phase.status)}
                      </span>
                    ) : (
                      <select
                        value={phase.status}
                        onChange={(e) => updatePhase(index, "status", e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      >
                        <option value="todo">待开始</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {readonly ? (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {phase.description || "-"}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={phase.description || ""}
                        onChange={(e) => updatePhase(index, "description", e.target.value)}
                        placeholder="描述"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </td>
                  {!readonly && (
                    <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => movePhase(index, "up")}
                          disabled={index === 0}
                          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => movePhase(index, "down")}
                          disabled={index === phases.length - 1}
                          className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          title="下移"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deletePhase(index)}
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {phases.length > 0 && (
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
                <td colSpan={readonly ? 3 : 4} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                  {phases.length} 个阶段 | 总计划时间从 {format(parseISO(phases[0].startDate), "yyyy-MM-dd")} 到 {format(parseISO(phases[phases.length - 1].endDate), "yyyy-MM-dd")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
