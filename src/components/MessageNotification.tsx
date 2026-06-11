"use client";

import { useState, useEffect } from "react";

interface MessageNotificationProps {
  userId: string;
  onClick?: () => void;
}

export default function MessageNotification({
  userId,
  onClick,
}: MessageNotificationProps) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsOpen(!isOpen);
  };
  const [previewMessages, setPreviewMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchUnreadCount();
    // 每30秒轮询一次未读消息数量
    const interval = setInterval(fetchUnreadCount, 30000);

    // 监听消息已读事件，刷新未读消息数量
    const handleMessageRead = () => {
      fetchUnreadCount();
    };

    window.addEventListener('messages-read', handleMessageRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('messages-read', handleMessageRead);
    };
  }, [userId]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`/api/messages/unread-count?userId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setUnreadCount(json.data.count);
      }
    } catch (error) {
      console.error("获取未读消息数量失败:", error);
    }
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="消息中心"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
