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
interface ContractDashboardData {
  total: number;
  active: number;
  expired: number;
  terminated: number;
  draft: number;
  totalAmount: number;
  activeAmount: number;
  expiredAmount: number;
  terminatedAmount: number;
  newContracts: number;
  monthlyStats: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = "blue", subtitle }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
    gray: "from-gray-500 to-gray-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`text-4xl p-3 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} bg-opacity-20`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function ContractDashboard() {
  const [data, setData] = useState<ContractDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // 返回合同管理的处理函数
  const handleBackToContractManagement = () => {
    // 触发一个自定义事件，通知父组件切换到合同管理
    window.dispatchEvent(new CustomEvent('navigateToContractManagement'));
  };

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/stats?days=${days}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        console.error("获取合同统计数据失败:", result.error);
      }
    } catch (error) {
      console.error("获取合同统计数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    if (amount === 0) return "¥0.00";
    return `¥${amount.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  // 准备饼图数据
  const pieData = [
    { name: "生效中", value: data.active, amount: data.activeAmount },
    { name: "已过期", value: data.expired, amount: data.expiredAmount },
    { name: "已终止", value: data.terminated, amount: data.terminatedAmount },
    { name: "草稿", value: data.draft, amount: 0 },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">合同数据统计</h2>
        <div className="flex flex-wrap items-center gap-3">
          {/* 统计天数选择 */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
            <option value={180}>最近180天</option>
            <option value={365}>最近一年</option>
          </select>
          {/* 返回合同管理按钮 */}
          <button
            onClick={handleBackToContractManagement}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回合同管理
          </button>
        </div>
      </div>

      {/* 详细统计信息 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">详细统计信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">合同总金额</div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {formatAmount(data.totalAmount)}
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <div className="text-sm text-green-600 dark:text-green-400 mb-1">生效中合同金额</div>
            <div className="text-xl font-bold text-green-900 dark:text-green-100">
              {formatAmount(data.activeAmount)}
            </div>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">已过期合同金额</div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
              {formatAmount(data.expiredAmount)}
            </div>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <div className="text-sm text-red-600 dark:text-red-400 mb-1">已终止合同金额</div>
            <div className="text-xl font-bold text-red-900 dark:text-red-100">
              {formatAmount(data.terminatedAmount)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">平均合同金额</div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {data.total > 0 ? formatAmount(data.totalAmount / data.total) : formatAmount(0)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">活跃率</div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {data.total > 0 ? `${((data.active / data.total) * 100).toFixed(1)}%` : "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* 统计卡片 - 第一行：合同数量统计 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="合同总数"
          value={data.total}
          icon="📋"
          color="blue"
          subtitle={`最近${days}天新增 ${data.newContracts}`}
        />
        <StatCard
          title="生效中"
          value={data.active}
          icon="✅"
          color="green"
          subtitle={formatAmount(data.activeAmount)}
        />
        <StatCard
          title="已过期"
          value={data.expired}
          icon="⚠️"
          color="yellow"
          subtitle={formatAmount(data.expiredAmount)}
        />
        <StatCard
          title="已终止"
          value={data.terminated}
          icon="❌"
          color="red"
          subtitle={formatAmount(data.terminatedAmount)}
        />
        <StatCard
          title="草稿"
          value={data.draft}
          icon="📝"
          color="gray"
        />
      </div>

      {/* 统计卡片 - 第二行：重要提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <StatCard
          title={`新增合同（最近${days}天）`}
          value={data.newContracts}
          icon="🆕"
          color="green"
          subtitle={`占总数的 ${data.total > 0 ? ((data.newContracts / data.total) * 100).toFixed(1) : 0}%`}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 合同状态分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">合同状态分布</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value || 0} 个`, name || '']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              暂无数据
            </div>
          )}
        </div>

        {/* 月度合同趋势 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">月度合同趋势</h3>
          {data.monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value, name) => [
                    name === "合同数量" ? `${value || 0} 个` : formatAmount(Number(value) || 0),
                    name || ''
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="合同数量" />
                <Bar yAxisId="right" dataKey="amount" fill="#10b981" name="合同金额" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              暂无数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
