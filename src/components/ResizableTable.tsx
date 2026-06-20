"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useResponsive } from "@/hooks/useResponsive";

export interface Column<T = any> {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  priority?: "high" | "medium" | "low"; // 移动端列显示优先级
  freezable?: boolean; // 是否可冻结，默认 true
}

interface ResizableTableProps<T = any> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  storageKey: string;
  isLoading?: boolean;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPagination?: boolean;
  maxFreezeColumns?: number;
  rowClassName?: (row: T, index: number) => string;
  showRowIndex?: boolean;
}

// 右键菜单组件
function ContextMenu({
  x,
  y,
  column,
  isFrozen,
  frozenCount,
  maxFreezeColumns,
  onFreeze,
  onUnfreeze,
  onClose,
}: {
  x: number;
  y: number;
  column: Column;
  isFrozen: boolean;
  frozenCount: number;
  maxFreezeColumns: number;
  onFreeze: () => void;
  onUnfreeze: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // 调整菜单位置，防止超出屏幕
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const canFreeze = !isFrozen && frozenCount < maxFreezeColumns && column.freezable !== false;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        {column.title}
      </div>
      {isFrozen ? (
        <button
          onClick={() => {
            onUnfreeze();
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          取消冻结
        </button>
      ) : (
        <button
          onClick={() => {
            onFreeze();
            onClose();
          }}
          disabled={!canFreeze}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
            canFreeze
              ? "hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
          }`}
          title={!canFreeze && frozenCount >= maxFreezeColumns ? `最多冻结 ${maxFreezeColumns} 列` : ""}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {frozenCount >= maxFreezeColumns ? `已达到最大冻结数(${maxFreezeColumns})` : "冻结此列"}
        </button>
      )}
    </div>,
    document.body
  );
}

export function ResizableTable<T = any>({
  title,
  columns,
  data,
  storageKey,
  isLoading,
  onSort,
  sortKey: externalSortKey,
  sortDirection: externalSortDirection,
  pageSize = 20,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  showPagination = true,
  maxFreezeColumns = 6,
  rowClassName,
  showRowIndex = true,
}: ResizableTableProps<T>) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    // 使用默认宽度
    const defaultWidths: Record<string, number> = {};
    columns.forEach((col) => {
      defaultWidths[col.key] = col.width || 200;
    });

    // 从localStorage加载保存的列宽
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`table-widths-${storageKey}`);
      if (saved) {
        try {
          const savedWidths = JSON.parse(saved);
          // 合并保存的宽度和默认宽度，确保新增列有默认值
          const mergedWidths: Record<string, number> = { ...defaultWidths };
          Object.keys(savedWidths).forEach((key) => {
            // 只使用有效的数值
            if (typeof savedWidths[key] === "number" && !isNaN(savedWidths[key])) {
              mergedWidths[key] = savedWidths[key];
            }
          });
          return mergedWidths;
        } catch {
          return defaultWidths;
        }
      }
    }

    return defaultWidths;
  });

  // 冻结列状态 - 存储冻结的列key数组
  const [frozenColumns, setFrozenColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`table-frozen-${storageKey}`);
      if (saved) {
        return JSON.parse(saved);
      }
    }
    return [];
  });

  const [internalSortKey, setInternalSortKey] = useState<string>(() => {
    // 从localStorage加载保存的排序
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`table-sort-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.key;
      }
    }
    return "";
  });

  const [internalSortDirection, setInternalSortDirection] = useState<"asc" | "desc">(() => {
    // 从localStorage加载保存的排序方向
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`table-sort-${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.direction;
      }
    }
    return "asc";
  });

  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const { isMobile } = useResponsive();
  const [dragLineX, setDragLineX] = useState<number | null>(null);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    column: Column;
  } | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 保存列宽到localStorage
  useEffect(() => {
    localStorage.setItem(`table-widths-${storageKey}`, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);

  // 保存冻结列到localStorage
  useEffect(() => {
    localStorage.setItem(`table-frozen-${storageKey}`, JSON.stringify(frozenColumns));
  }, [frozenColumns, storageKey]);

  // 保存排序到localStorage
  useEffect(() => {
    if (internalSortKey) {
      localStorage.setItem(
        `table-sort-${storageKey}`,
        JSON.stringify({ key: internalSortKey, direction: internalSortDirection })
      );
    }
  }, [internalSortKey, internalSortDirection, storageKey]);

  // 拖拽时禁用文本选择，改变光标
  useEffect(() => {
    if (resizingKey) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      return () => {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
    }
  }, [resizingKey]);

  // 使用外部或内部排序状态
  const currentSortKey = externalSortKey ?? internalSortKey;
  const currentSortDirection = externalSortDirection ?? internalSortDirection;

  // 计算冻结列的总宽度
  const frozenWidth = frozenColumns.reduce((sum, key) => sum + (columnWidths[key] || 200), 0);

  // 计算每列的left位置（用于sticky定位）
  const getColumnLeft = (columnKey: string) => {
    const frozenIndex = frozenColumns.indexOf(columnKey);
    if (frozenIndex === -1) return 0;

    let left = 0;
    for (let i = 0; i < frozenIndex; i++) {
      left += columnWidths[frozenColumns[i]] || 200;
    }
    return left;
  };

  // 冻结列
  const handleFreezeColumn = (columnKey: string) => {
    if (frozenColumns.length >= maxFreezeColumns) return;
    if (frozenColumns.includes(columnKey)) return;

    // 找到该列在原始列中的位置
    const columnIndex = columns.findIndex((col) => col.key === columnKey);

    // 将列添加到冻结列表（按原始顺序）
    const newFrozenColumns = [...frozenColumns, columnKey].sort((a, b) => {
      const indexA = columns.findIndex((col) => col.key === a);
      const indexB = columns.findIndex((col) => col.key === b);
      return indexA - indexB;
    });

    setFrozenColumns(newFrozenColumns);
  };

  // 取消冻结
  const handleUnfreezeColumn = (columnKey: string) => {
    setFrozenColumns(frozenColumns.filter((key) => key !== columnKey));
  };

  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, column: Column) => {
    e.preventDefault();
    e.stopPropagation();

    // 操作列不允许冻结
    if (column.key === "actions" || column.freezable === false) {
      return;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      column,
    });
  };

  // 调整列宽
  const handleMouseDown = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingKey(key);
    startX.current = e.clientX;
    const column = columns.find((col) => col.key === key);
    startWidth.current = columnWidths[key] ?? column?.width ?? 200;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (resizingKey) {
        const diff = e.clientX - startX.current;
        const column = columns.find((col) => col.key === resizingKey);
        const minWidth = column?.minWidth || 80;
        const maxWidth = column?.maxWidth || 1000;

        const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth.current + diff));

        setDragLineX(e.clientX);

        setColumnWidths((prev) => ({
          ...prev,
          [resizingKey]: newWidth,
        }));
      }
    },
    [resizingKey, columns]
  );

  const handleMouseUp = useCallback(() => {
    setResizingKey(null);
    setDragLineX(null);
  }, []);

  useEffect(() => {
    if (resizingKey) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [resizingKey, handleMouseMove, handleMouseUp]);

  // 排序处理
  const handleSort = (key: string) => {
    const column = columns.find((col) => col.key === key);
    if (!column || !column.sortable) return;

    let newDirection: "asc" | "desc" = "asc";

    if (currentSortKey === key) {
      newDirection = currentSortDirection === "asc" ? "desc" : "asc";
    }

    // 如果有外部排序函数，使用外部排序
    if (onSort) {
      onSort(key, newDirection);
    } else {
      setInternalSortKey(key);
      setInternalSortDirection(newDirection);
    }
  };

  // 对数据进行排序
  const sortedData = [...data].sort((a, b) => {
    if (!currentSortKey) return 0;

    const aVal = a[currentSortKey as keyof T];
    const bVal = b[currentSortKey as keyof T];

    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    if (aVal > bVal) comparison = 1;

    return currentSortDirection === "desc" ? -comparison : comparison;
  });

  // 分页逻辑
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && onPageChange) {
      onPageChange(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  // 渲染单元格内容
  const renderCellContent = (column: Column, row: T) => {
    let content: React.ReactNode;
    if (column.render) {
      const rendered = column.render((row as any)[column.key], row);
      if (rendered !== null && rendered !== undefined && typeof rendered === "object") {
        if (Array.isArray(rendered)) {
          content = rendered.map((item, idx) => {
            if (item !== null && item !== undefined && typeof item === "object" && !React.isValidElement(item)) {
              return <span key={idx}>{JSON.stringify(item)}</span>;
            }
            return item;
          });
        } else if (!React.isValidElement(rendered)) {
          content = JSON.stringify(rendered);
        } else {
          content = rendered;
        }
      } else {
        content = rendered;
      }
    } else {
      const rawValue = (row as any)[column.key];
      if (rawValue !== null && rawValue !== undefined && typeof rawValue === "object") {
        if (Array.isArray(rawValue)) {
          content = rawValue.map((item, idx) => {
            if (item !== null && item !== undefined && typeof item === "object" && !React.isValidElement(item)) {
              return <span key={idx}>{JSON.stringify(item)}</span>;
            }
            return item;
          });
        } else if (!React.isValidElement(rawValue)) {
          content = JSON.stringify(rawValue);
        } else {
          content = rawValue;
        }
      } else {
        content = rawValue;
      }
    }
    return content ?? "-";
  };

  // 移动端卡片视图
  if (isMobile) {
    return (
      <div className="table-card-view">
        {title && (
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 px-1">{title}</h3>
        )}
        {paginatedData.map((row, index) => (
          <div
            key={(row as any).id || index}
            className="table-card-item"
          >
            <div className="space-y-1.5">
              {columns.map((column) => {
                const priority = column.priority || "medium";
                return (
                  <div key={column.key} className="table-card-row">
                    <span className="table-card-label">{column.title}</span>
                    <span className="table-card-value">{renderCellContent(column, row)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            暂无数据
          </div>
        )}
        {/* 分页控件 */}
        {showPagination && (
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>共</span>
                <span className="font-medium text-gray-900 dark:text-white">{sortedData.length}</span>
                <span>条</span>
                <span className="ml-2">每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>条</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 touch-target"
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 touch-target"
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 touch-target"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 touch-target"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 冻结列提示 */}
      {frozenColumns.length > 0 && (
        <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span>
            已冻结 {frozenColumns.length} 列：{frozenColumns.map((key) => columns.find((c) => c.key === key)?.title).join("、")}
          </span>
          <button
            onClick={() => setFrozenColumns([])}
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            清除全部
          </button>
        </div>
      )}

      {/* 表格容器 */}
      <div
        ref={containerRef}
        className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative"
      >
        {/* 标题 */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          </div>
        )}
        {/* 加载中指示器 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">加载中...</span>
          </div>
        )}
        {/* 拖拽指示线 */}
        {dragLineX !== null && (
          <div
            className="fixed top-0 bottom-0 w-[2px] bg-blue-500 z-50 pointer-events-none"
            style={{
              left: `${dragLineX}px`,
              boxShadow: "0 0 4px rgba(59, 130, 246, 0.5)",
            }}
          />
        )}

        <div 
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 220px)' }} 
        >
          <table
            ref={tableRef}
            className="border-collapse"
            style={{
              width: `${Object.values(columnWidths).reduce((a, b) => a + b, 0)}px`,
              minWidth: '100%',
            }}
          >
            <thead className="sticky top-0 z-30 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-sm">
              <tr>
                {showRowIndex && (
                  <th className="px-2 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 select-none w-[48px] min-w-[48px]">
                    序号
                  </th>
                )}
                {columns.map((column) => {
                  const isFrozen = frozenColumns.includes(column.key);
                  const columnLeft = getColumnLeft(column.key);

                  return (
                    <th
                      key={column.key}
                      className={`relative px-4 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 select-none whitespace-nowrap tracking-wide uppercase ${
                        resizingKey === column.key ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      } ${isFrozen ? "bg-gray-100 dark:bg-gray-700" : ""}`}
                      style={{
                        width: columnWidths[column.key] ?? column.width ?? 200,
                        ...(isFrozen
                          ? {
                              position: "sticky",
                              left: columnLeft,
                              zIndex: 40,
                            }
                          : {}),
                      }}
                      onContextMenu={(e) => handleContextMenu(e, column)}
                    >
                      <div
                        className="flex items-center gap-2"
                        onClick={() => column.sortable && handleSort(column.key)}
                        style={{ cursor: column.sortable ? "pointer" : "default" }}
                      >
                        {isFrozen && (
                          <svg
                            className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <title>已冻结</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        )}
                        <span>{column.title}</span>
                        {column.sortable && currentSortKey === column.key && (
                          <span className="text-blue-500 dark:text-blue-400">
                            {currentSortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                      {/* 可调整宽度的手柄 */}
                      <div
                        className={`absolute right-[-4px] top-0 h-full w-[8px] cursor-col-resize transition-all duration-150 z-10 ${
                          resizingKey === column.key
                            ? "bg-blue-500"
                            : "bg-transparent hover:bg-blue-300 dark:hover:bg-blue-700"
                        }`}
                        onMouseDown={(e) => handleMouseDown(e, column.key)}
                        style={{
                          marginLeft: "-4px",
                          paddingLeft: "4px",
                        }}
                      >
                        <div
                          className={`absolute right-[3px] top-0 h-full w-[2px] rounded-full ${
                            resizingKey === column.key
                              ? "bg-blue-500"
                              : "bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
                          }`}
                        />
                      </div>
                      {/* 冻结列右边框阴影 */}
                      {isFrozen && !frozenColumns.includes(columns[columns.findIndex((c) => c.key === column.key) + 1]?.key) && (
                        <div className="absolute right-0 top-0 bottom-0 w-[4px] bg-gradient-to-r from-transparent to-black/10 dark:to-white/5 pointer-events-none" />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800">
              {paginatedData.map((row, index) => (
                <tr
                  key={(row as any).id || index}
                  className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/30 transition-all duration-200 ${rowClassName ? rowClassName(row, index) : ""}`}
                >
                  {showRowIndex && (
                    <td className="px-2 py-4 text-center text-xs text-gray-500 dark:text-gray-400 w-[48px]">
                      {((currentPage ?? 1) - 1) * (pageSize ?? 20) + index + 1}
                    </td>
                  )}
                  {columns.map((column) => {
                    const isFrozen = frozenColumns.includes(column.key);
                    const columnLeft = getColumnLeft(column.key);

                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100 ${
                          isFrozen ? "bg-white dark:bg-gray-800" : ""
                        }`}
                        style={{
                          width: columnWidths[column.key] ?? column.width ?? 200,
                          ...(isFrozen
                            ? {
                                position: "sticky",
                                left: columnLeft,
                                zIndex: 10,
                              }
                            : {}),
                        }}
                      >
                        {renderCellContent(column, row)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">暂无数据</div>
        )}

        {/* 分页控件 */}
        {showPagination && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>每页</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>条</span>
                <span className="ml-2">
                  共 {data.length} 条，第 {currentPage} / {totalPages} 页
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  首页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  下一页
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          column={contextMenu.column}
          isFrozen={frozenColumns.includes(contextMenu.column.key)}
          frozenCount={frozenColumns.length}
          maxFreezeColumns={maxFreezeColumns}
          onFreeze={() => handleFreezeColumn(contextMenu.column.key)}
          onUnfreeze={() => handleUnfreezeColumn(contextMenu.column.key)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
