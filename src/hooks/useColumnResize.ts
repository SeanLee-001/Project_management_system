"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface ColumnWidthConfig {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
}

interface UseColumnResizeOptions {
  storageKey: string;
  columns: ColumnWidthConfig[];
  /** 总容器参考宽度，用于百分比计算，默认 1200 */
  containerWidth?: number;
}

export function useColumnResize({ storageKey, columns, containerWidth = 1200 }: UseColumnResizeOptions) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial: Record<string, number> = {};
    columns.forEach((c) => {
      initial[c.key] = c.width;
    });
    return initial;
  });

  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const persistWidths = useCallback(
    (widths: Record<string, number>) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(widths));
      } catch {}
    },
    [storageKey]
  );

  const handleMouseDown = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = columnWidths[key] || columns.find((c) => c.key === key)?.width || 100;
      resizingRef.current = { key, startX, startWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths, columns]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const col = columns.find((c) => c.key === key);
      const minWidth = col?.minWidth ?? 60;
      const newWidth = Math.max(minWidth, startWidth + delta);

      setColumnWidths((prev) => {
        const next = { ...prev, [key]: newWidth };
        return next;
      });
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        setColumnWidths((prev) => {
          persistWidths(prev);
          return prev;
        });
        resizingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [columns, persistWidths]);

  const getColumnStyle = useCallback(
    (key: string, fallbackStyle?: React.CSSProperties): React.CSSProperties => {
      const width = columnWidths[key];
      if (width) return { width, minWidth: width, maxWidth: width };
      return fallbackStyle || {};
    },
    [columnWidths]
  );

  const getResizeHandleProps = useCallback(
    (key: string) => ({
      onMouseDown: handleMouseDown(key),
      className: "resize-handle",
    }),
    [handleMouseDown]
  );

  const resetWidths = useCallback(() => {
    const initial: Record<string, number> = {};
    columns.forEach((c) => {
      initial[c.key] = c.width;
    });
    setColumnWidths(initial);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [columns, storageKey]);

  return { columnWidths, getColumnStyle, getResizeHandleProps, resetWidths };
}
