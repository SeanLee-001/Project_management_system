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
interface OrderDashboardData {
  total: number;
  normal: number;
  paused: number;
  cancelled: number;
  overdue: number;
  new: number;
}

interface DashboardData {
  order: OrderDashboardData;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = "blue" }) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    yellow: "from-yellow-500 to-yellow-600",
    red: "from-red-500 to-red-600",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`text-4xl p-3 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} bg-opacity-20`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function OrderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  // 返回订单看板的处理函数
  const handleBackToOrdersBoard = () => {
    // 触发一个自定义事件，通知父组件切换到订单看板
    window.dispatchEvent(new CustomEvent('navigateToOrdersBoard'));
  };

  useEffect(() => {
    fetchStats();
  }, [days]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?days=${days}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        console.error("获取统计数据失败:", result.error);
      }
    } catch (error) {
      console.error("获取统计数据失败:", error);
    } finally {
      setLoading(false);
    }
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
    { name: "正常", value: data.order.normal },
    { name: "暂停", value: data.order.paused },
    { name: "取消", value: data.order.cancelled },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">订单数据统计</h2>
        <div className="flex items-center gap-3">
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
          {/* 返回订单看板按钮 */}
          <button
            onClick={handleBackToOrdersBoard}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回订单看板
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 订单总数 */}
        <StatCard
          title="订单总数"
          value={data.order.total}
          icon="📋"
          color="blue"
        />
        {/* 正常订单 */}
        <StatCard
          title="正常订单"
          value={data.order.normal}
          icon="✅"
          color="green"
        />
        {/* 暂停订单 */}
        <StatCard
          title="暂停订单"
          value={data.order.paused}
          icon="⏸️"
          color="yellow"
        />
        {/* 取消订单 */}
        <StatCard
          title="取消订单"
          value={data.order.cancelled}
          icon="❌"
          color="red"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 订单状态分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">订单状态分布</h3>
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 订单统计明细 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">订单统计明细</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">订单总数</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.order.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">正常订单</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{data.order.normal}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">暂停订单</span>
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{data.order.paused}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">取消订单</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{data.order.cancelled}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300 font-medium">正常率</span>
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {data.order.total > 0
                    ? ((data.order.normal / data.order.total) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
