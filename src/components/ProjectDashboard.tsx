"use client";

import { useState, useEffect } from "react";
import { Project, Task, User } from "@/storage/database/shared/schema";

type Status = "active" | "completed" | "paused";

interface ProjectDashboardProps {
  projects: Project[];
  users: User[];
  onProjectClick: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onUpdateStatus: (id: string, status: Status) => void;
  onDeleteProject: (id: string) => void;
  onAdvancedSearch?: (params: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    customerName?: string;
    status?: string;
  }) => void;
  onResetSearch?: () => void;
}

export default function ProjectDashboard({
  projects,
  users,
  onProjectClick,
  onEditProject,
  onUpdateStatus,
  onDeleteProject,
  onAdvancedSearch,
  onResetSearch,
}: ProjectDashboardProps) {
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed" | "paused">("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  // 项目表格列宽状态
  const [projectColumnWidths, setProjectColumnWidths] = useState({
    icon: 60,
    projectCode: 120,
    name: 200,
    description: 250,
    status: 100,
    owner: 120,
    startDate: 120,
    endDate: 120,
    actions: 150,
  });

  // 项目表格排序状态
  const [projectSortField, setProjectSortField] = useState<keyof Project | "projectCode">("name");
  const [projectSortOrder, setProjectSortOrder] = useState<"asc" | "desc">("asc");

  // 高级查询状态
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchCustomerName, setSearchCustomerName] = useState("");
  const [searchStatus, setSearchStatus] = useState<Status | "">("");

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("dashboard-page-size", pageSize.toString());
  }, [pageSize]);
  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find((u) => u.id === userId);
    return user?.fullName || user?.username || "-";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("zh-CN");
  };

  // 计算延期天数
  const getOverdueDays = (project: Project) => {
    // 如果项目已完成，不算延期
    if (project.status === "completed") return null;

    // 如果没有结束日期，不算延期
    if (!project.endDate) return null;

    const endDate = project.endDate instanceof Date ? project.endDate : new Date(project.endDate);
    const today = new Date();

    // 设置时间为0点，只比较日期
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // 如果结束日期小于当前日期，计算延期天数
    if (endDate < today) {
      const diffTime = today.getTime() - endDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "active":
        return "border-l-4 border-l-blue-500";
      case "completed":
        return "border-l-4 border-l-green-500";
      case "paused":
        return "border-l-4 border-l-yellow-500";
      default:
        return "border-l-4 border-l-gray-500";
    }
  };

  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const pausedProjects = projects.filter((p) => p.status === "paused");

  // 根据过滤状态筛选项目
  const filteredProjects = filterStatus === "all"
    ? projects
    : projects.filter((p) => p.status === filterStatus);

  // 过滤状态改变时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  // 项目排序处理
  const handleProjectSort = (field: keyof Project | "projectCode") => {
    if (projectSortField === field) {
      // 如果点击的是当前排序字段，切换排序方向
      setProjectSortOrder(projectSortOrder === "asc" ? "desc" : "asc");
    } else {
      // 如果点击的是新字段，设置新字段并升序排序
      setProjectSortField(field);
      setProjectSortOrder("asc");
    }
  };

  // 获取排序后的项目列表
  const getSortedProjects = () => {
    const sorted = [...filteredProjects];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (projectSortField === "projectCode") {
        aValue = (a as any).projectCode || "";
        bValue = (b as any).projectCode || "";
      } else if (projectSortField === "ownerId") {
        aValue = a.ownerId || "";
        bValue = b.ownerId || "";
      } else {
        aValue = a[projectSortField];
        bValue = b[projectSortField];
      }

      // 处理 null 和 undefined
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // 比较逻辑
      if (typeof aValue === "string" && typeof bValue === "string") {
        const compareResult = aValue.localeCompare(bValue, "zh-CN");
        return projectSortOrder === "asc" ? compareResult : -compareResult;
      } else {
        if (aValue < bValue) return projectSortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return projectSortOrder === "asc" ? 1 : -1;
        return 0;
      }
    });
    return sorted;
  };

  // 列宽调整处理
  const handleColumnResize = (column: keyof typeof projectColumnWidths, deltaX: number) => {
    setProjectColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(60, prev[column] + deltaX), // 最小宽度60px
    }));
  };

  // 高级查询处理函数
  const handleAdvancedSearch = () => {
    if (!onAdvancedSearch) return;

    const params: any = {};

    if (searchKeyword) params.keyword = searchKeyword;
    if (searchYear) params.year = parseInt(searchYear, 10);
    if (searchMonth) params.month = parseInt(searchMonth, 10);
    if (searchStartDate) params.startDate = searchStartDate;
    if (searchEndDate) params.endDate = searchEndDate;
    if (searchCustomerName) params.customerName = searchCustomerName;
    if (searchStatus) params.status = searchStatus;

    onAdvancedSearch(params);
  };

  // 重置高级查询
  const handleResetSearch = () => {
    setSearchKeyword("");
    setSearchYear("");
    setSearchMonth("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchCustomerName("");
    setSearchStatus("");
    if (onResetSearch) {
      onResetSearch();
    }
  };

  const renderProjectCard = (project: Project) => (
    <div
      key={project.id}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-all hover:shadow-md cursor-pointer ${getStatusBorder(
        project.status
      )}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {project.iconUrl ? (
            <img
              src={project.iconUrl}
              alt={project.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {project.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getUserName(project.ownerId)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              project.status
            )}`}
          >
            {project.status === "active"
              ? "进行中"
              : project.status === "completed"
              ? "已完成"
              : "已暂停"}
          </span>
          {getOverdueDays(project) && (
            <div className="text-red-600 dark:text-red-400 font-bold text-base">
              延期{getOverdueDays(project)}天
            </div>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
        {project.startDate && (
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>开始: {formatDate(project.startDate)}</span>
          </div>
        )}
        {project.endDate && (
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>结束: {formatDate(project.endDate)}</span>
          </div>
        )}
        {getOverdueDays(project) && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-lg">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>延期{getOverdueDays(project)}天</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProjectClick(project);
          }}
          className="flex-1 rounded-md bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          详情
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditProject(project);
          }}
          className="rounded-md bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          编辑
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteProject(project.id);
          }}
          className="rounded-md bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
        >
          删除
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">项目总数</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {projects.length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">已完成</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {completedProjects.length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">已暂停</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pausedProjects.length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-yellow-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">进行中</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeProjects.length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-indigo-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 高级查询区域 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索项目名称或描述..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAdvancedSearch();
              }
            }}
          />
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            {showAdvancedSearch ? "收起" : "高级查询"}
          </button>
        </div>

        {/* 高级查询面板 */}
        {showAdvancedSearch && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 年度查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">年度</label>
                <select
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">全部年度</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>

              {/* 月度查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">月度</label>
                <select
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  disabled={!searchYear}
                >
                  <option value="">全部月度</option>
                  <option value="1">1月</option>
                  <option value="2">2月</option>
                  <option value="3">3月</option>
                  <option value="4">4月</option>
                  <option value="5">5月</option>
                  <option value="6">6月</option>
                  <option value="7">7月</option>
                  <option value="8">8月</option>
                  <option value="9">9月</option>
                  <option value="10">10月</option>
                  <option value="11">11月</option>
                  <option value="12">12月</option>
                </select>
              </div>

              {/* 日期范围查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">开始日期</label>
                <input
                  type="date"
                  value={searchStartDate}
                  onChange={(e) => setSearchStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">结束日期</label>
                <input
                  type="date"
                  value={searchEndDate}
                  onChange={(e) => setSearchEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 客户查询 */}
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">客户名称</label>
                <input
                  type="text"
                  value={searchCustomerName}
                  onChange={(e) => setSearchCustomerName(e.target.value)}
                  placeholder="输入客户名称，在项目名称或描述中搜索..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 项目状态查询 */}
              <div className="lg:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">项目状态</label>
                <select
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value as Status | "")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">全部状态</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="paused">已暂停</option>
                </select>
              </div>
            </div>

            {/* 查询按钮 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAdvancedSearch}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                查询
              </button>
              <button
                onClick={handleResetSearch}
                className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
              >
                重置
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 控制按钮组 */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          {/* 状态过滤按钮组 */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === "all"
                  ? "bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === "active"
                  ? "bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              进行中
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === "completed"
                  ? "bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              已完成
            </button>
            <button
              onClick={() => setFilterStatus("paused")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === "paused"
                  ? "bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              已暂停
            </button>
          </div>

          {/* 视图切换按钮组 */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              表格
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "card"
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              卡片
            </button>
          </div>
        </div>
      </div>

      {/* 项目内容区域 */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {filterStatus === "all" ? "暂无项目" : `暂无${filterStatus === "active" ? "进行中" : filterStatus === "completed" ? "已完成" : "已暂停"}的项目`}
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {filterStatus === "all" ? "请创建新项目开始使用" : "请切换其他状态"}
          </p>
        </div>
      ) : viewMode === "table" ? (
        // 表格视图
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: "fixed", minWidth: "100%" }}>
            <thead>
              <tr className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-b-2 border-red-300 dark:border-red-700">
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                  style={{ width: projectColumnWidths.icon }}
                >
                  图标
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.projectCode }}
                  onClick={() => handleProjectSort("projectCode")}
                >
                  <div className="flex items-center gap-1">
                    <span>项目编号</span>
                    {projectSortField === "projectCode" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.projectCode;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("projectCode", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.name }}
                  onClick={() => handleProjectSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span>项目名称</span>
                    {projectSortField === "name" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.name;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("name", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.description }}
                  onClick={() => handleProjectSort("description")}
                >
                  <div className="flex items-center gap-1">
                    <span>描述</span>
                    {projectSortField === "description" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.description;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("description", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.status }}
                  onClick={() => handleProjectSort("status")}
                >
                  <div className="flex items-center gap-1">
                    <span>状态</span>
                    {projectSortField === "status" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.status;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("status", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.owner }}
                  onClick={() => handleProjectSort("ownerId")}
                >
                  <div className="flex items-center gap-1">
                    <span>负责人</span>
                    {projectSortField === "ownerId" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.owner;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("owner", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.startDate }}
                  onClick={() => handleProjectSort("startDate")}
                >
                  <div className="flex items-center gap-1">
                    <span>开始日期</span>
                    {projectSortField === "startDate" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.startDate;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("startDate", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 select-none relative"
                  style={{ width: projectColumnWidths.endDate }}
                  onClick={() => handleProjectSort("endDate")}
                >
                  <div className="flex items-center gap-1">
                    <span>结束日期</span>
                    {projectSortField === "endDate" && (
                      <span className="text-gray-600 dark:text-gray-400">
                        {projectSortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                    style={{ width: "4px" }}
                    onMouseDown={(e) => {
                      const startX = e.clientX;
                      const startWidth = projectColumnWidths.endDate;
                      const onMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        handleColumnResize("endDate", deltaX);
                      };
                      const onMouseUp = () => {
                        document.removeEventListener("mousemove", onMouseMove);
                        document.removeEventListener("mouseup", onMouseUp);
                      };
                      document.addEventListener("mousemove", onMouseMove);
                      document.addEventListener("mouseup", onMouseUp);
                    }}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                  style={{ width: projectColumnWidths.actions }}
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedProjects().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((project) => (
                <tr key={project.id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    {project.iconUrl ? (
                      <img src={project.iconUrl} alt={project.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                    {(project as any).projectCode || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{project.name}</span>
                      {getOverdueDays(project) && (
                        <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                          延期{getOverdueDays(project)}天
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 max-w-xs truncate">{project.description || "-"}</td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex flex-col gap-1">
                      <select
                        value={project.status}
                        onChange={(e) => onUpdateStatus(project.id, e.target.value as Status)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(project.status)}`}
                      >
                        <option value="active">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="paused">已暂停</option>
                      </select>
                      {getOverdueDays(project) && (
                        <div className="text-red-600 dark:text-red-400 font-bold text-base">
                          延期{getOverdueDays(project)}天
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{getUserName(project.ownerId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">{formatDate(project.startDate)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    <div>
                      <div>{formatDate(project.endDate)}</div>
                      {getOverdueDays(project) && (
                        <div className="text-red-600 dark:text-red-400 font-bold text-lg mt-1">
                          延期{getOverdueDays(project)}天
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 border border-gray-200 dark:border-gray-600">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onProjectClick(project)}
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => onEditProject(project)}
                        className="rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => onDeleteProject(project.id)}
                        className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      ) : (
        // 卡片视图 - 网格布局
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((project) => renderProjectCard(project))}
          </div>

          {/* 分页控件 */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">每页显示：</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">共 {filteredProjects.length} 条记录</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  首页
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentPage} / {Math.ceil(filteredProjects.length / pageSize) || 1} 页
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(filteredProjects.length / pageSize) || 1, prev + 1))}
                  disabled={currentPage >= Math.ceil(filteredProjects.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  下一页
                </button>
                <button
                  onClick={() => setCurrentPage(Math.ceil(filteredProjects.length / pageSize) || 1)}
                  disabled={currentPage >= Math.ceil(filteredProjects.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
