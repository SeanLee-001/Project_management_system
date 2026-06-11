"use client";

import { useState } from "react";
import { alertStyles, getAlertStyle, DEFAULT_ALERT_STYLE, type AlertStyle } from "@/lib/alertStyles";
import AlertDialogComponent from "./AlertDialog";

interface AlertStyleSelectorProps {
  currentStyleId: string;
  onStyleChange: (styleId: string) => void;
}

export default function AlertStyleSelector({ currentStyleId, onStyleChange }: AlertStyleSelectorProps) {
  const [previewAlert, setPreviewAlert] = useState<{
    show: boolean;
    styleId: string;
    type: "info" | "success" | "warning" | "error";
  }>({
    show: false,
    styleId: "",
    type: "info",
  });

  const handlePreview = (styleId: string) => {
    setPreviewAlert({
      show: true,
      styleId,
      type: "info",
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="mb-3">
          <h3 className="text-base font-semibold mb-1">系统提示风格</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            选择您喜欢的系统提示对话框风格
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {Object.values(alertStyles).map((style) => (
            <div
              key={style.id}
              className={`
                relative p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all
                ${currentStyleId === style.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                }
              `}
              onClick={() => onStyleChange(style.id)}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg sm:text-xl">{style.preview}</span>
                  {currentStyleId === style.id && (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {style.name}
                </h4>
                <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mb-2 flex-grow">
                  {style.description}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(style.id);
                  }}
                  className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  预览效果
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 预览对话框 */}
      {previewAlert.show && (
        <AlertDialogComponent
          message="这是预览效果！您可以选择这个风格。"
          type={previewAlert.type}
          styleId={previewAlert.styleId}
          onClose={() => setPreviewAlert({ ...previewAlert, show: false })}
        />
      )}
    </>
  );
}
