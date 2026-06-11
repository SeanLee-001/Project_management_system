"use client";

import { useEffect, useState } from "react";

/**
 * 全局水印组件
 * 内容：用户：工号 全名 日期
 * 浅灰色字体，45度斜角，低密度
 * 防止截图泄密
 * 支持用户切换实时更新
 */
export default function GlobalWatermark() {
  const [userInfo, setUserInfo] = useState<{
    username: string;
    fullName: string;
    employeeId: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // 获取用户信息
  const fetchUserInfo = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserInfo({
          username: user.username || "",
          fullName: user.fullName || user.name || "",
          employeeId: user.employeeId || user.username || "",
        });
      } catch (e) {
        console.error("解析用户信息失败:", e);
        setUserInfo(null);
      }
    } else {
      setUserInfo(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUserInfo();

    // 监听 localStorage 变化（监听其他标签页或同标签页的用户切换）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        fetchUserInfo();
      }
    };

    // 监听自定义事件（用于同标签页内的用户切换）
    const handleUserChange = () => {
      fetchUserInfo();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("userChanged", handleUserChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userChanged", handleUserChange);
    };
  }, []);

  // 定期检查用户是否已登出（刷新水印）
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      const userStr = localStorage.getItem("user");
      if (!userStr && userInfo !== null) {
        // 用户已登出
        setUserInfo(null);
      } else if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const currentId = user.employeeId || user.username || "";
          if (userInfo && (user.employeeId || user.username) !== userInfo.employeeId) {
            // 用户已切换
            fetchUserInfo();
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mounted, userInfo]);

  if (!mounted || !userInfo) {
    return null;
  }

  const currentDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const watermarkText = `用户：${userInfo.employeeId} ${userInfo.fullName} ${currentDate}`;

  return (
    <>
      {/* 全局水印层 */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
        aria-hidden="true"
        style={{
          background: "transparent",
        }}
      >
        {/* 水印文字 - Canvas绘制 */}
        <canvas
          className="absolute inset-0 w-full h-full"
          ref={(canvas) => {
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            // 设置Canvas尺寸
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // 保存当前状态
            ctx.save();

            // 移动到中心点并旋转45度
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((-45 * Math.PI) / 180);

            // 水印文字样式 - 浅灰色
            const fontSize = 16;
            ctx.font = `500 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "rgba(160, 160, 160, 0.15)";

            // 计算水印间距 - 低密度
            const textWidth = ctx.measureText(watermarkText).width;
            const spacingX = textWidth + 200;
            const spacingY = 150;

            // 绘制水印
            const startX = -canvas.width * 1.5;
            const startY = -canvas.height * 1.5;
            const endX = canvas.width * 2;
            const endY = canvas.height * 2;

            for (let y = startY; y < endY; y += spacingY) {
              for (let x = startX; x < endX; x += spacingX) {
                ctx.fillText(watermarkText, x, y);
              }
            }

            ctx.restore();
          }}
        />
      </div>
    </>
  );
}

/**
 * 触发用户切换事件（供登录/登出逻辑调用）
 */
export function notifyUserChanged() {
  window.dispatchEvent(new Event("userChanged"));
}
