"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import DarkSidebarLayout from "./DarkSidebarLayout";

interface LayoutWrapperProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export default function LayoutWrapper({ 
  children, 
  userName, 
  userRole, 
  onLogout 
}: LayoutWrapperProps) {
  const { theme } = useTheme();

  // 如果启用了黑色侧边栏主题，渲染侧边栏布局
  if (theme === "dark-sidebar") {
    return (
      <DarkSidebarLayout 
        userName={userName} 
        userRole={userRole} 
        onLogout={onLogout}
      >
        {children}
      </DarkSidebarLayout>
    );
  }

  // 默认主题 - 直接渲染子组件
  return (
    <>
      {children}
    </>
  );
}
