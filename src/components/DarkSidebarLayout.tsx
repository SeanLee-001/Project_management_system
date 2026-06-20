"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  FileText,
  Package,
  Shield,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  DollarSign,
  Newspaper,
} from "lucide-react";

interface DarkSidebarLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

const menuItems = [
  { href: "/app", icon: LayoutDashboard, label: "工作台", color: "from-blue-400 to-blue-600" },
  { href: "/app?tab=projects", icon: FolderKanban, label: "项目管理", color: "from-purple-400 to-purple-600" },
  { href: "/app?tab=tasks", icon: CheckSquare, label: "任务管理", color: "from-green-400 to-green-600" },
  { href: "/app?tab=customers", icon: Users, label: "客户管理", color: "from-pink-400 to-pink-600" },
  { href: "/app?tab=contracts", icon: FileText, label: "合同管理", color: "from-yellow-400 to-yellow-600" },
  { href: "/app?tab=orders", icon: Package, label: "订单管理", color: "from-indigo-400 to-indigo-600" },
  { href: "/app?tab=products", icon: Package, label: "产品管理", color: "from-red-400 to-red-600" },
  { href: "/app?tab=approvals", icon: Shield, label: "项目审批", color: "from-teal-400 to-teal-600" },
  { href: "/app?tab=financial_management", icon: DollarSign, label: "财务管理", color: "from-amber-400 to-amber-600" },
  { href: "/news", icon: Newspaper, label: "行业新闻", color: "from-sky-400 to-sky-600" },
  { href: "/login-logs", icon: History, label: "登录日志", color: "from-orange-400 to-orange-600" },
  { href: "/admin", icon: Settings, label: "系统管理", color: "from-cyan-400 to-cyan-600" },
];

const mobileBottomItems = [
  { href: "/app", icon: LayoutDashboard, label: "工作台" },
  { href: "/app?tab=projects", icon: FolderKanban, label: "项目" },
  { href: "/app?tab=tasks", icon: CheckSquare, label: "任务" },
  { href: "/news", icon: Newspaper, label: "新闻" },
  { href: "/admin", icon: Settings, label: "管理" },
];

export default function DarkSidebarLayout({
  children,
  userName,
  userRole,
  onLogout,
}: DarkSidebarLayoutProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const sidebarRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 桌面端默认折叠状态
  useEffect(() => {
    if (isDesktop) {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
    }
  }, [isDesktop]);

  // 移动端/平板端默认收起侧边栏
  useEffect(() => {
    if (isMobile || isTablet) {
      setIsCollapsed(true);
    }
  }, [isMobile, isTablet]);

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app" || pathname === "/";
    }
    if (href.includes("?")) {
      const base = href.split("?")[0];
      if (pathname === base) {
        const tab = new URLSearchParams(href.split("?")[1]).get("tab");
        const currentTab = new URLSearchParams(
          typeof window !== "undefined" ? window.location.search : ""
        ).get("tab");
        if (!currentTab) return false;
        return currentTab === tab;
      }
    }
    return pathname?.startsWith(href.split("?")[0]);
  };

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
  };

  // 移动端侧边栏滑动触摸处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      // 从左边缘右滑 > 50px 打开侧边栏
      if (!isMobileOpen && touchStartX.current < 30 && diff > 50) {
        setIsMobileOpen(true);
      }
      // 在侧边栏上左滑 > 50px 关闭侧边栏
      if (isMobileOpen && diff < -50) {
        setIsMobileOpen(false);
      }
    },
    [isMobileOpen]
  );

  const handleCloseMobile = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsMobileOpen(false);
      setIsAnimating(false);
    }, 180);
  };

  if (theme === "dark-sidebar") {
    const sidebarContent = (
      <>
        {/* Logo */}
        <div className="relative h-20 px-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-900 to-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
          <div className="relative flex items-center justify-between h-full">
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    项目管理系统
                  </h1>
                  <p className="text-xs text-gray-400">{currentTime.toLocaleDateString("zh-CN")}</p>
                </div>
              </div>
            )}
            {/* 移动端关闭按钮 */}
            {isMobile && (
              <button
                onClick={handleCloseMobile}
                className="p-2 rounded-lg hover:bg-white/10 transition-all touch-target"
                aria-label="关闭菜单"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
            {/* 桌面端折叠按钮 */}
            {!isMobile && (
              <button
                onClick={toggleCollapsed}
                className="hidden lg:block p-2 rounded-lg hover:bg-white/10 transition-all touch-target"
                aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* 用户信息 */}
        {(!isCollapsed || isMobile) && (
          <div className="p-4 border-b border-gray-700/50">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm p-4 border border-gray-600/30">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                  {userName?.charAt(0) || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{userName || "用户"}</p>
                  <p className="text-xs text-gray-400 truncate">{userRole || "未登录"}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <ul className="space-y-1.5 px-3">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => isMobile && handleCloseMobile()}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group overflow-hidden touch-target ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {active && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-20`} />
                    )}
                    <div
                      className={`relative flex-shrink-0 ${
                        active ? "text-white" : "text-gray-400 group-hover:text-white"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    {(!isCollapsed || isMobile) && (
                      <span className="relative text-sm font-medium">{item.label}</span>
                    )}
                    {(!isCollapsed || isMobile) && active && (
                      <div className="relative ml-auto">
                        <div className="w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50" />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部操作区 */}
        <div className="p-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
          {(!isMobile || isMobileOpen) && (
            <>
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-300 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:text-white transition-all touch-target ${
                  isCollapsed && !isMobile ? "justify-center" : ""
                }`}
              >
                <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-white to-gray-300 shadow-lg flex-shrink-0">
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gray-800 to-black" />
                </div>
                {(!isCollapsed || isMobile) && (
                  <span className="text-sm font-medium">切换到默认主题</span>
                )}
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className={`mt-2 w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 transition-all touch-target ${
                    isCollapsed && !isMobile ? "justify-center" : ""
                  }`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  {(!isCollapsed || isMobile) && <span className="text-sm font-medium">退出登录</span>}
                </button>
              )}
            </>
          )}
        </div>
      </>
    );

    return (
      <div
        className="min-h-screen bg-gray-100 dark:bg-gray-900"
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
      >
        {/* 移动端遮罩 */}
        {isMobileOpen && isMobile && (
          <div
            className={`fixed inset-0 bg-black/50 z-40 backdrop-blur-sm ${
              isAnimating ? "mobile-overlay-exit" : "mobile-overlay-enter"
            }`}
            onClick={handleCloseMobile}
          />
        )}

        {/* 侧边栏 */}
        <aside
          ref={sidebarRef}
          className={`fixed top-0 left-0 z-50 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white transition-all duration-300 ease-in-out shadow-2xl ${
            isCollapsed && !isMobile ? "w-20" : "w-64"
          } ${isMobile ? (isMobileOpen ? "mobile-drawer-enter translate-x-0" : "-translate-x-full") : "lg:translate-x-0"} ${
            isAnimating ? "mobile-drawer-exit" : ""
          }`}
        >
          {sidebarContent}
        </aside>

        {/* 主内容区 */}
        <div
          className={`transition-all duration-300 ${
            !isMobile ? (isCollapsed ? "lg:ml-20" : "lg:ml-64") : ""
          } ${isMobile ? "pb-16" : ""}`}
        >
          {/* 顶部导航栏 */}
          <header className="sticky top-0 z-30 h-16 md:h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50">
            <div className="flex items-center justify-between h-full px-4 md:px-6">
              {/* 移动端菜单 + 面包屑 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileOpen(true)}
                  className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-target"
                  aria-label="打开菜单"
                >
                  <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                {!isMobile && (
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">
                    {menuItems.find((m) => isActive(m.href))?.label || "工作台"}
                  </h2>
                )}
              </div>

              {/* 搜索框 - 平板和桌面端 */}
              <div className="hidden md:flex items-center flex-1 max-w-xl mx-6">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索项目、任务、客户..."
                    className="w-full pl-12 pr-4 py-2.5 md:py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-600 transition-all outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400 text-sm"
                  />
                </div>
              </div>

              {/* 右侧 */}
              <div className="flex items-center gap-2 md:gap-4">
                <button className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-target">
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-700" />
                </button>
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 border border-blue-200 dark:border-gray-500">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-lg" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isMobile ? "暗色" : "黑色侧边栏模式"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* 页面内容 */}
          <main className="p-4 md:p-6 lg:p-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border border-gray-100 dark:border-gray-700 overflow-hidden">
              {children}
            </div>
          </main>
        </div>

        {/* 移动端底部导航栏 */}
        {isMobile && (
          <nav className="mobile-bottom-nav lg:hidden" role="navigation" aria-label="底部导航">
            {mobileBottomItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-bottom-nav-item ${active ? "active" : ""}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
