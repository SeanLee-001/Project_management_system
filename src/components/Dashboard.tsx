"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 统计数据类型
interface DashboardData {
  filterLabel: string;
  project: {
    total: number;
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
    overdue: number;
    new: number;
  };
  task: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    high: number;
    medium: number;
    low: number;
  };
  customer: {
    total: number;
    active: number;
    inactive: number;
    terminal: number;
    agent: number;
  };
  contract: {
    total: number;
    active: number;
    expired: number;
    terminated: number;
  };
  order: {
    total: number;
    normal: number;
    paused: number;
    cancelled: number;
  };
  product: {
    total: number;
    active: number;
    inactive: number;
  };
  user: {
    total: number;
    active: number;
    inactive: number;
    pendingApproval: number;
  };
  trends: {
    dailyProjects: Array<{ date: string; projects: string }>;
    taskCompletion: Array<{ date: string; completed: string }>;
  };
  memberRoles: Array<{ role: string; count: string }>;
  recent: {
    projects: any[];
    tasks: any[];
  };
}

// 角色显示名称映射
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  system_admin: "系统管理员",
  project_manager: "项目经理",
  mechanical_engineer: "机械工程师",
  electrical_engineer: "电气工程师",
  visual_engineer: "视觉工程师",
  software_engineer: "软件工程师",
  project_management: "项目管理",
  production_planning: "生产计划",
  quality_management: "质量管理",
  procurement_management: "采购管理",
  department_manager: "部门经理",
  field_supervisor: "现场负责人",
  project_member: "项目成员",
  business: "商务",
  safety_officer: "安全员",
};

// 饼图颜色
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"days" | "month" | "year">("days");
  const [days, setDays] = useState(30);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchStats();
  }, [filterType, days, month, year]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("filterType", filterType);
      
      if (filterType === "days") {
        params.append("days", days.toString());
      } else if (filterType === "month") {
        params.append("month", month.toString());
        params.append("year", year.toString());
      } else if (filterType === "year") {
        params.append("year", year.toString());
      }
      
      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "获取数据失败");
      }
    } catch (err) {
      setError("网络请求失败");
      console.error("Fetch stats error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error || "加载数据失败"}</div>
      </div>
    );
  }

  // 准备项目状态饼图数据
  const projectStatusData = [
    { name: "进行中", value: data.project.active },
    { name: "已完成", value: data.project.completed },
    { name: "已暂停", value: data.project.paused },
    { name: "已取消", value: data.project.cancelled },
  ].filter((item) => item.value > 0);

  // 准备任务状态饼图数据
  const taskStatusData = [
    { name: "待办", value: data.task.todo },
    { name: "进行中", value: data.task.inProgress },
    { name: "已完成", value: data.task.completed },
  ].filter((item) => item.value > 0);

  // 准备任务优先级数据
  const taskPriorityData = [
    { name: "高", value: data.task.high },
    { name: "中", value: data.task.medium },
    { name: "低", value: data.task.low },
  ].filter((item) => item.value > 0);

  // 准备项目趋势数据
  const projectTrendData = data.trends.dailyProjects.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
    count: Number(item.projects),
  }));

  // 准备任务完成趋势数据
  const taskCompletionData = data.trends.taskCompletion.map((item) => ({
    date: new Date(item.date).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
    count: Number(item.completed),
  }));

  // 准备成员角色数据
  const memberRoleData = data.memberRoles.map((item) => ({
    name: ROLE_DISPLAY_NAMES[item.role] || item.role,
    count: Number(item.count),
  }));

  // 返回项目看板的处理函数
  const handleBackToProjectBoard = () => {
    // 触发一个自定义事件，通知父组件切换到项目看板
    window.dispatchEvent(new CustomEvent('navigateToProjectBoard'));
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">数据统计</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* 时间筛选器 */}
          <div className="flex items-center gap-2">
            {/* 筛选类型选择 */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "days" | "month" | "year")}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="days">最近XX天</option>
              <option value="month">XX月度</option>
              <option value="year">XX年度</option>
            </select>

            {/* 根据筛选类型显示相应的输入控件 */}
            {filterType === "days" && (
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value={7}>最近7天</option>
                <option value={30}>最近30天</option>
                <option value={90}>最近90天</option>
                <option value={180}>最近180天</option>
                <option value={365}>最近一年</option>
              </select>
            )}

            {filterType === "month" && (
              <div className="flex items-center gap-2">
                <select
                  value={year.toString()}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y.toString()}>{y}年</option>;
                  })}
                </select>
                <select
                  value={month.toString()}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>{i + 1}月</option>
                  ))}
                </select>
              </div>
            )}

            {filterType === "year" && (
              <select
                value={year.toString()}
                onChange={(e) => setYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - i;
                  return <option key={y} value={y.toString()}>{y}年</option>;
                })}
              </select>
            )}
          </div>
          {/* 返回项目看板按钮 */}
          <button
            onClick={handleBackToProjectBoard}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回项目看板
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 项目卡片 */}
        <StatCard
          title="项目总数"
          value={data.project.total}
          icon="📊"
          subtitle={`进行中: ${data.project.active} | 已完成: ${data.project.completed}`}
          highlight={data.project.overdue > 0}
          highlightText={`延期: ${data.project.overdue}`}
        />
        {/* 任务卡片 */}
        <StatCard
          title="任务总数"
          value={data.task.total}
          icon="✓"
          subtitle={`待办: ${data.task.todo} | 进行中: ${data.task.inProgress}`}
        />
        {/* 客户卡片 */}
        <StatCard
          title="客户总数"
          value={data.customer.total}
          icon="👥"
          subtitle={`合作中: ${data.customer.active} | 停止合作: ${data.customer.inactive}`}
        />
        {/* 订单卡片 */}
        <StatCard
          title="订单总数"
          value={data.order.total}
          icon="📦"
          subtitle={`正常: ${data.order.normal} | 暂停: ${data.order.paused} | 取消: ${data.order.cancelled}`}
        />
        {/* 合同卡片 */}
        <StatCard
          title="合同总数"
          value={data.contract.total}
          icon="📄"
          subtitle={`有效: ${data.contract.active} | 过期: ${data.contract.expired}`}
        />
        {/* 产品卡片 */}
        <StatCard
          title="产品总数"
          value={data.product.total}
          icon="🎯"
          subtitle={`启用: ${data.product.active} | 停用: ${data.product.inactive}`}
        />
        {/* 用户卡片 */}
        <StatCard
          title="用户总数"
          value={data.user.total}
          icon="👤"
          subtitle={`活跃: ${data.user.active} | 待审核: ${data.user.pendingApproval}`}
          highlight={data.user.pendingApproval > 0}
          highlightText={`待审核: ${data.user.pendingApproval}`}
        />
        {/* 新建项目卡片 */}
        <StatCard
          title={`${data.filterLabel}新项目`}
          value={data.project.new}
          icon="🆕"
          subtitle={`${data.filterLabel}新增项目`}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目状态分布 */}
        <ChartCard title="项目状态分布">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {projectStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 任务状态分布 */}
        <ChartCard title="任务状态分布">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {taskStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 项目趋势 */}
        <ChartCard title={`${data.filterLabel}新建项目趋势`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="新建项目数" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 任务完成趋势 */}
        <ChartCard title={`${data.filterLabel}任务完成趋势`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                name="完成任务数"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 任务优先级分布 */}
        <ChartCard title="任务优先级分布">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={taskPriorityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {taskPriorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 成员角色分布 */}
        <ChartCard title="成员角色分布">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberRoleData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* 近期数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近期项目 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            近期项目（最新5个）
          </h3>
          <div className="space-y-3">
            {data.recent.projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {project.projectCode || "-"} | {project.customerName || "-"}
                  </div>
                </div>
                <StatusBadge status={project.status} />
              </div>
            ))}
            {data.recent.projects.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                暂无项目数据
              </div>
            )}
          </div>
        </div>

        {/* 近期任务 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            待办任务（最新5个）
          </h3>
          <div className="space-y-3">
            {data.recent.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {task.assignee || "-"} | {task.taskCode || "-"}
                  </div>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
            ))}
            {data.recent.tasks.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                暂无待办任务
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({
  title,
  value,
  icon,
  subtitle,
  highlight,
  highlightText,
}: {
  title: string;
  value: number;
  icon: string;
  subtitle: string;
  highlight?: boolean;
  highlightText?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {subtitle}
          </p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
      {highlight && highlightText && (
        <div className="mt-3">
          <span className="text-xs font-medium text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 px-2 py-1 rounded-full">
            {highlightText}
          </span>
        </div>
      )}
    </div>
  );
}

// 图表卡片组件
function ChartCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

// 状态标签组件
function StatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { text: string; className: string }> = {
    active: { text: "进行中", className: "bg-blue-100 text-blue-800" },
    completed: { text: "已完成", className: "bg-green-100 text-green-800" },
    paused: { text: "已暂停", className: "bg-yellow-100 text-yellow-800" },
    cancelled: { text: "已取消", className: "bg-red-100 text-red-800" },
  };
  const { text, className } = statusMap[status] || { text: status, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {text}
    </span>
  );
}

// 优先级标签组件
function PriorityBadge({ priority }: { priority: string }) {
  const priorityMap: Record<string, { text: string; className: string }> = {
    high: { text: "高", className: "bg-red-100 text-red-800" },
    medium: { text: "中", className: "bg-yellow-100 text-yellow-800" },
    low: { text: "低", className: "bg-green-100 text-green-800" },
  };
  const { text, className } = priorityMap[priority] || { text: priority, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {text}
    </span>
  );
}
