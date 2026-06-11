"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/storage/database/shared/schema";
import SoftwareUpload from "@/components/SoftwareUpload";
import { UserRole } from "@/storage/database/shared/schema";

export default function SoftwareReleasePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkLoginStatus = () => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUser(userData);

      // 检查是否是系统管理员或部门经理
      const isAdmin = [
        UserRole.SYSTEM_ADMIN,
        UserRole.DEPARTMENT_MANAGER,
      ].includes(userData.role as any);

      if (!isAdmin) {
        alert("只有系统管理员或部门经理才能访问此页面");
        router.push("/app");
        return;
      }
    } else {
      router.push("/login");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                软件发布管理
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                上传项目管理系统桌面客户端安装包
              </p>
            </div>
            <button
              onClick={() => router.push("/admin")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              返回后台管理
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <SoftwareUpload userId={currentUser.id} />
        </div>
      </main>
    </div>
  );
}
