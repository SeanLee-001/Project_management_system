"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/storage/database/shared/schema";
import { UserRole } from "@/storage/database/shared/schema";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查登录状态
    const user = localStorage.getItem("user");
    if (!user) {
      // 未登录，跳转到登录页，携带重定向参数
      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push("/login?redirect=" + encodeURIComponent(redirect));
      } else {
        router.push("/login?redirect=/app");
      }
      return;
    }

    const userData: User = JSON.parse(user);

    // 检查是否指定了跳转目标
    const redirect = searchParams.get("redirect");
    if (redirect) {
      router.push(redirect);
      return;
    }

    // 根据用户角色和当前路由决定跳转
    const currentPath = window.location.pathname;

    // 如果已经在 /app 或 /admin 路径，不需要跳转
    if (currentPath === "/app" || currentPath === "/admin") {
      setIsLoading(false);
      return;
    }

    // 判断是否是管理员角色
    const adminRoles = [
      UserRole.SYSTEM_ADMIN,
      UserRole.DEPARTMENT_MANAGER,
      UserRole.PROJECT_MANAGER
    ] as const;

    // 默认跳转到应用端
    router.push("/app");
  }, [router, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
