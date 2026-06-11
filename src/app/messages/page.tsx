"use client";

import { useState, useEffect } from "react";
import MessageCenter from "@/components/MessageCenter";

export default function MessagesPage() {
  const [userId, setUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    // 从session或localStorage获取当前用户ID和角色
    // 这里简化处理，实际需要从认证信息中获取
    const savedUserId = localStorage.getItem("current-user-id");
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setUserId(userData.id);
      setUserRole(userData.role);
    } else if (savedUserId) {
      setUserId(savedUserId);
    }
  }, []);

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            请先登录
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6">
        <MessageCenter userId={userId} userRole={userRole} />
      </div>
    </div>
  );
}
