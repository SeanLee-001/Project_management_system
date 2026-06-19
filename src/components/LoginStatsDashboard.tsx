"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import { formatDuration } from "@/lib/userAgentParser";

interface LoginStats {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalLogins: number;
    sensitiveCount: number;
    avgLoginDuration: number;
    uniqueUsers: number;
  };
  loginStatsByDate: { date: string; count: number }[];
  loginStatsByMonth: { month: string; count: number }[];
  sensitiveOperationStats: { type: string; count: number }[];
  activeUsers: { userId: string; username: string; fullName: string | null; loginCount: number }[];
  loginMethodStats: { method: string; count: number }[];
  deviceTypeStats: { deviceType: string; count: number }[];
  browserStats: { browser: string; count: number }[];
  loginHourDistribution: { hour: number; count: number }[];
}

interface LoginLog {
  id: string;
  userId: string;
  username: string;
  employeeNumber: string | null;
  fullName: string | null;
  loginTime: string;
  logoutTime: string | null;
  loginDuration: number | null;
  ipAddress: string;
  previousIpAddress: string | null;
  userAgent: string;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  loginMethod: string;
  loginStatus: string;
  isSensitiveOperation: boolean;
  sensitiveOperationType: string | null;
  errorMessage: string | null;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

const SENSITIVE_OPERATION_LABELS: Record<string, string> = {
  ip_changed: "IP地址变更",
  password_changed: "密码修改",
  mac_bound: "MAC地址绑定",
};

const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: "密码登录",
  mac: "MAC地址登录",
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
  desktop: "桌面端",
  mobile: "移动端",
  tablet: "平板",
};

export default function LoginStatsDashboard() {
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "custom">("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [showSensitiveOnly, setShowSensitiveOnly] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const pageSize = 20;

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case "day":
        // 今日：从今天00:00:00到今天23:59:59
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "week":
        // 最近7天：从7天前的00:00:00到今天23:59:59
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "month":
        // 最近30天：从30天前的00:00:00到今天23:59:59
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    return { start, end };
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        groupBy: viewMode,
      });

      const res = await fetch(`/api/login-logs/stats?${params}`, {
        credentials: "include",
      });
      const json = await res.json();

      if (json.success) {
        setStats(json.data);
      }
    } catch (error) {
      console.error("Error fetching login stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        page: logsPage.toString(),
        pageSize: pageSize.toString(),
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      });

      if (showSensitiveOnly) {
        params.set("isSensitiveOperation", "true");
      }

      const res = await fetch(`/api/login-logs?${params}`, {
        credentials: "include",
      });
      const json = await res.json();

      if (json.success) {
        setLogs(json.data.logs);
        setLogsTotal(json.data.total);
      }
    } catch (error) {
      console.error("Error fetching login logs:", error);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      });

      if (showSensitiveOnly) {
        params.set("isSensitiveOperation", "true");
      }

      const res = await fetch(`/api/login-logs/export?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("导出失败");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `登录日志_${start.toISOString().split("T")[0]}_${end.toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting login logs:", error);
      alert("导出失败，请稍后重试");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [dateRange, customStartDate, customEndDate, viewMode, showSensitiveOnly, logsPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加载统计数据中...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-600 dark:text-gray-400">暂无数据</p>
      </div>
    );
  }

  // 统一数据格式，将 month 字段映射为 date 字段
  const chartData = viewMode === "day" 
    ? stats.loginStatsByDate 
    : stats.loginStatsByMonth.map(item => ({ date: item.month, count: item.count }));
  const xKey = "date";

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">时间范围：</span>
            <div className="flex gap-1">
              {(["day", "week", "month", "custom"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    dateRange === range
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {range === "day" ? "今日" : range === "week" ? "本周" : range === "month" ? "本月" : "自定义"}
                </button>
              ))}
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">统计粒度：</span>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === "day"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                按日
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === "month"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                按月
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSensitiveOnly}
              onChange={(e) => {
                setShowSensitiveOnly(e.target.checked);
                setLogsPage(1);
              }}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">仅显示敏感操作</span>
          </label>

          <div className="flex-1" />

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>导出中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>导出Excel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">总登录次数</p>
              <p className="text-3xl font-bold mt-1">{stats.summary.totalLogins.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">敏感操作</p>
              <p className="text-3xl font-bold mt-1">{stats.summary.sensitiveCount.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">活跃用户</p>
              <p className="text-3xl font-bold mt-1">{stats.summary.uniqueUsers.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">平均登录时长</p>
              <p className="text-3xl font-bold mt-1">{formatDuration(stats.summary.avgLoginDuration)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 登录趋势图 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">登录趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.9)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: "#3B82F6", strokeWidth: 2 }}
                  name="登录次数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 登录时段分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">登录时段分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.loginHourDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.9)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value) => [value ?? 0, "登录次数"]}
                  labelFormatter={(label) => `${label}:00`}
                />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 敏感操作统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">敏感操作统计</h3>
          <div className="h-64">
            {stats.sensitiveOperationStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.sensitiveOperationStats.map((item) => ({
                      name: SENSITIVE_OPERATION_LABELS[item.type] || item.type,
                      value: item.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {stats.sensitiveOperationStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                暂无敏感操作记录
              </div>
            )}
          </div>
        </div>

        {/* 登录方式统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">登录方式统计</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.loginMethodStats.map((item) => ({
                name: LOGIN_METHOD_LABELS[item.method] || item.method,
                count: item.count,
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17, 24, 39, 0.9)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 设备类型统计 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">设备类型分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.deviceTypeStats.map((item) => ({
                    name: DEVICE_TYPE_LABELS[item.deviceType] || item.deviceType || "未知",
                    value: item.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {stats.deviceTypeStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 活跃用户排行 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">活跃用户排行 Top 10</h3>
          <div className="space-y-3">
            {stats.activeUsers.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index < 3 ? "bg-amber-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.fullName || user.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{user.loginCount} 次</span>
              </div>
            ))}
            {stats.activeUsers.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">暂无数据</p>
            )}
          </div>
        </div>
      </div>

      {/* 登录日志列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">登录日志明细</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">序号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">工号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">登录时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">登录IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">登录终端</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">登录方式</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">登录时长</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">敏感操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log, idx) => (
                <tr key={log.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  log.isSensitiveOperation ? "bg-amber-50 dark:bg-amber-900/10" : ""
                }`}>
                  <td className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{log.fullName || log.username}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{log.username}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.employeeNumber || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(log.loginTime).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white font-mono">{log.ipAddress}</p>
                      {log.previousIpAddress && log.previousIpAddress !== log.ipAddress && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          上次: {log.previousIpAddress}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white">{log.browser || "-"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{log.os || "-"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      log.loginMethod === "mac"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    }`}>
                      {LOGIN_METHOD_LABELS[log.loginMethod] || log.loginMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.loginDuration ? formatDuration(log.loginDuration) : "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {log.isSensitiveOperation ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {SENSITIVE_OPERATION_LABELS[log.sensitiveOperationType || ""] || log.sensitiveOperationType}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                     暂无登录日志
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分页 */}
        {logsTotal > pageSize && (
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {logsTotal} 条记录
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                disabled={logsPage === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                第 {logsPage} / {Math.ceil(logsTotal / pageSize)} 页
              </span>
              <button
                onClick={() => setLogsPage((p) => Math.min(Math.ceil(logsTotal / pageSize), p + 1))}
                disabled={logsPage >= Math.ceil(logsTotal / pageSize)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
