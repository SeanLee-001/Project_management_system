"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAlertStyle, DEFAULT_ALERT_STYLE } from "@/lib/alertStyles";

type AlertType = "info" | "success" | "warning" | "error";

interface AlertDialogProps {
  message: string;
  type?: AlertType;
  onClose: () => void;
  styleId?: string; // 风格ID，默认为"default"
}

// 全局风格状态管理器
let globalAlertStyle = DEFAULT_ALERT_STYLE;
let styleListeners: ((style: string) => void)[] = [];

// 通知所有监听器风格变化
const notifyStyleChange = (newStyle: string) => {
  globalAlertStyle = newStyle;
  styleListeners.forEach(listener => listener(newStyle));
};

// 订阅风格变化
const subscribeToStyleChange = (listener: (style: string) => void) => {
  styleListeners.push(listener);
  return () => {
    styleListeners = styleListeners.filter(l => l !== listener);
  };
};

// 导出获取当前风格的函数
export const getCurrentAlertStyle = () => globalAlertStyle;

// Hook for fetching system alert style from settings
export function useSystemAlertStyle() {
  const [alertStyle, setAlertStyle] = useState<string>(globalAlertStyle);

  useEffect(() => {
    const fetchAlertStyle = async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const json = await res.json();
        if (json.success && json.data.alertStyle) {
          setAlertStyle(json.data.alertStyle);
          notifyStyleChange(json.data.alertStyle);
        }
      } catch (error) {
        console.error("Error fetching alert style:", error);
      }
    };

    // 初始获取
    fetchAlertStyle();

    // 订阅全局风格变化
    const unsubscribe = subscribeToStyleChange(setAlertStyle);
    return unsubscribe;
  }, []);

  return alertStyle;
}

export function useAlertDialog(styleId?: string) {
  const systemAlertStyle = useSystemAlertStyle();
  const [alert, setAlert] = useState<{
    message: string;
    type: AlertType;
  } | null>(null);

  // 计算当前使用的风格ID
  const currentStyleId = useMemo(() => styleId || systemAlertStyle, [styleId, systemAlertStyle]);

  const showAlert = useCallback((message: string, type: AlertType = "info") => {
    setAlert({ message, type });
  }, []);

  const closeAlert = useCallback(() => {
    setAlert(null);
  }, []);

  const info = useCallback((message: string) => showAlert(message, "info"), [showAlert]);
  const success = useCallback((message: string) => showAlert(message, "success"), [showAlert]);
  const warning = useCallback((message: string) => showAlert(message, "warning"), [showAlert]);
  const error = useCallback((message: string) => showAlert(message, "error"), [showAlert]);

  return {
    alert,
    showAlert,
    closeAlert,
    info,
    success,
    warning,
    error,
    styleId: currentStyleId,
  };
}

export default function AlertDialogComponent({
  message,
  type = "info",
  onClose,
  styleId = DEFAULT_ALERT_STYLE
}: AlertDialogProps) {
  // 获取风格配置
  const style = getAlertStyle(styleId);
  const { config, typeStyles } = style;
  const currentTypeStyle = typeStyles[type];

  // 播放警告音
  useEffect(() => {
    if (message && (type === "warning" || type === "error")) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = type === "warning" ? 800 : 400;
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        console.error("播放警告音失败:", error);
      }
    }
  }, [message, type]);

  const getAlertIcon = () => {
    const icons: Record<AlertType, React.ReactNode> = {
      info: (
        <svg className={`${config.iconClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      success: (
        <svg className={`${config.iconClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      warning: (
        <svg className={`${config.iconClass} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      error: (
        <svg className={`${config.iconClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[type];
  };

  const getTypeTitle = () => {
    const titles: Record<AlertType, string> = {
      info: "提示",
      success: "成功",
      warning: "警告",
      error: "错误",
    };
    return titles[type];
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${config.overlayClass}`} onClick={onClose}>
      <div
        className={`${config.containerClass} ${config.borderRadius} ${config.shadow} ${config.animation} border ${currentTypeStyle.borderColor} ${currentTypeStyle.bgColor} w-full max-w-md mx-4 transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${config.iconClass} flex items-center justify-center`}>
              {getAlertIcon()}
            </div>
            <div className="ml-4 flex-1">
              <h3 className={`text-lg font-medium ${currentTypeStyle.titleColor}`}>
                {getTypeTitle()}
              </h3>
              <div className={`mt-2 ${config.messageClass}`}>
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 pb-4 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 ${currentTypeStyle.bgColor} border ${currentTypeStyle.borderColor} rounded-md text-sm font-medium hover:opacity-80 transition-opacity ${config.messageClass}`}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

// 简单的Alert组件（不依赖hook，直接使用全局风格）
export function SimpleAlert({
  message,
  type = "info",
  onClose
}: AlertDialogProps) {
  // 总是使用全局风格
  const [styleId, setStyleId] = useState(globalAlertStyle);

  useEffect(() => {
    // 同步全局风格
    setStyleId(globalAlertStyle);

    // 订阅变化
    const unsubscribe = subscribeToStyleChange(setStyleId);
    return unsubscribe;
  }, []);

  return <AlertDialogComponent message={message} type={type} onClose={onClose} styleId={styleId} />;
}
