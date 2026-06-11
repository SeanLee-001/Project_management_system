import { useEffect, useRef } from "react";

interface UseAutoLogoutOptions {
  /** 超时时间（毫秒），默认15分钟 */
  timeout?: number;
  /** 超时后的回调函数，例如登出并跳转 */
  onTimeout: () => void;
  /** 是否启用自动登出 */
  enabled?: boolean;
}

export function useAutoLogout({
  timeout = 30 * 60 * 1000, // 默认30分钟
  onTimeout,
  enabled = true,
}: UseAutoLogoutOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());

  // 重置计时器
  const resetTimer = () => {
    if (!enabled) return;

    // 清除之前的计时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 记录最后活动时间
    lastActivityRef.current = new Date();

    // 设置新的计时器
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeout);
  };

  useEffect(() => {
    if (!enabled) return;

    // 初始化计时器
    resetTimer();

    // 监听用户活动事件
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    // 添加事件监听器
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeout, onTimeout, enabled]);

  return {
    resetTimer,
    getLastActivityTime: () => lastActivityRef.current,
  };
}
