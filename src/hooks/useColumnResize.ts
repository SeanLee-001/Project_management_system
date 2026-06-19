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
}

function buildDefaultWidths(columns: ColumnWidthConfig[]): Record<string, number> {
  const widths: Record<string, number> = {};
  columns.forEach((c) => {
    widths[c.key] = c.width;
  });
  return widths;
}

export function useColumnResize({ storageKey, columns }: UseColumnResizeOptions) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    buildDefaultWidths(columns)
  );

  const [hydrated, setHydrated] = useState(false);
  const [resizingKey, setResizingKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setColumnWidths((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
    setHydrated(true);
  }, [storageKey]);

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
      const th = (e.target as HTMLElement).closest("th");
      const startWidth = th ? th.offsetWidth : (columnWidths[key] || columns.find((c) => c.key === key)?.width || 100);
      resizingRef.current = { key, startX, startWidth };
      setResizingKey(key);
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
        setResizingKey(null);
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
    (key: string): React.CSSProperties => {
      const width = columnWidths[key];
      if (width) return { width: `${width}px`, minWidth: `${width}px` };
      const col = columns.find((c) => c.key === key);
      if (col) return { width: `${col.width}px`, minWidth: `${col.width}px` };
      return {};
    },
    [columnWidths, columns]
  );

  const getResizeHandleProps = useCallback(
    (key: string) => ({
      onMouseDown: handleMouseDown(key),
    }),
    [handleMouseDown]
  );

  const resetWidths = useCallback(() => {
    const defaults = buildDefaultWidths(columns);
    setColumnWidths(defaults);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [columns, storageKey]);

  const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0);

  return { columnWidths, getColumnStyle, getResizeHandleProps, resetWidths, hydrated, resizingKey, totalWidth };
}
