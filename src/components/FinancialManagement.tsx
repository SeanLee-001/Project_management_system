'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Search,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';

// 财务管理数据类型
interface PaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  customerName: string;
  type: 'income' | 'expense'; // 收入/支出
  category: string; // 预付款/到货款/验收款/质保金/其他
  amount: number;
  received: boolean;
  invoiceAmount: number;
  invoiced: boolean;
  status: 'pending' | 'received' | 'overdue';
  dueDate: string;
  actualDate: string | null;
  notes: string;
}

interface BudgetItem {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  projectId: string;
  customerName: string;
  amount: number;
  type: 'income' | 'expense';
  issuedDate: string;
  dueDate: string;
  paid: boolean;
  paidDate: string | null;
}

export default function FinancialManagement() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices' | 'budget'>('overview');
  const [loading, setLoading] = useState(false);

  // 模拟数据
  const [payments, setPayments] = useState<PaymentRecord[]>([
    {
      id: '1',
      projectId: 'p1',
      projectName: 'ERP 管理系统',
      customerName: '华为技术',
      type: 'income',
      category: '预付款',
      amount: 300000,
      received: true,
      invoiceAmount: 300000,
      invoiced: true,
      status: 'received',
      dueDate: '2026-06-01',
      actualDate: '2026-06-01',
      notes: '合同总额30%预付款',
    },
    {
      id: '2',
      projectId: 'p2',
      projectName: 'CRM 客户管理系统',
      customerName: '比亚迪',
      type: 'income',
      category: '到货款',
      amount: 500000,
      received: false,
      invoiceAmount: 500000,
      invoiced: true,
      status: 'pending',
      dueDate: '2026-07-15',
      actualDate: null,
      notes: '合同总额60%到货款',
    },
    {
      id: '3',
      projectId: 'p3',
      projectName: 'MES 生产执行系统',
      customerName: '宁德时代',
      type: 'income',
      category: '验收款',
      amount: 80000,
      received: false,
      invoiceAmount: 80000,
      invoiced: false,
      status: 'overdue',
      dueDate: '2026-06-10',
      actualDate: null,
      notes: '验收延迟',
    },
    {
      id: '4',
      projectId: 'p1',
      projectName: 'ERP 管理系统',
      customerName: '华为技术',
      type: 'expense',
      category: '采购支出',
      amount: 120000,
      received: true,
      invoiceAmount: 120000,
      invoiced: true,
      status: 'received',
      dueDate: '2026-05-20',
      actualDate: '2026-05-20',
      notes: '服务器采购',
    },
    {
      id: '5',
      projectId: 'p2',
      projectName: 'CRM 客户管理系统',
      customerName: '比亚迪',
      type: 'income',
      category: '质保金',
      amount: 100000,
      received: false,
      invoiceAmount: 0,
      invoiced: false,
      status: 'pending',
      dueDate: '2026-12-01',
      actualDate: null,
      notes: '项目验收后12个月质保金',
    },
  ]);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([
    {
      id: 'inv1',
      invoiceNumber: 'INV-2026-0601',
      projectId: 'p1',
      customerName: '华为技术',
      amount: 300000,
      type: 'income',
      issuedDate: '2026-06-01',
      dueDate: '2026-06-30',
      paid: true,
      paidDate: '2026-06-01',
    },
    {
      id: 'inv2',
      invoiceNumber: 'INV-2026-0615',
      projectId: 'p2',
      customerName: '比亚迪',
      amount: 500000,
      type: 'income',
      issuedDate: '2026-07-15',
      dueDate: '2026-08-15',
      paid: false,
      paidDate: null,
    },
    {
      id: 'inv3',
      invoiceNumber: 'EXP-2026-0520',
      projectId: 'p1',
      customerName: '戴尔中国',
      amount: 120000,
      type: 'expense',
      issuedDate: '2026-05-20',
      dueDate: '2026-06-20',
      paid: true,
      paidDate: '2026-05-20',
    },
  ]);

  // 统计卡片数据（动态计算）
  const stats = useMemo(() => {
    const totalReceivable = payments
      .filter(p => p.type === 'income' && !p.received)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPayable = payments
      .filter(p => p.type === 'expense' && !p.received)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalReceived = payments
      .filter(p => p.type === 'income' && p.received)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = payments
      .filter(p => p.type === 'expense' && p.received)
      .reduce((sum, p) => sum + p.amount, 0);

    const netProfit = totalReceived - totalPaid;
    const overdueCount = payments.filter(p => p.status === 'overdue').length;

    return {
      totalReceivable,
      totalPayable,
      totalReceived,
      totalPaid,
      netProfit,
      overdueCount,
    };
  }, [payments]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: PaymentRecord['status']) => {
    const styles = {
      received: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels = {
      received: '已收款',
      pending: '待收款',
      overdue: '已逾期',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTypeIcon = (type: PaymentRecord['type']) => {
    return type === 'income' ? (
      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-amber-400" />
    );
  };

  return (
    <div className="w-full h-full bg-[#0a0e1a] text-slate-200 p-6 overflow-auto">
      {/* 顶部标题栏 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">财务资金看板</h1>
            <p className="text-sm text-slate-500 mt-1">项目收支与资金流向实时监控</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="h-9 rounded-lg border border-slate-700 bg-[#111827] px-3 text-sm text-slate-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            >
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="quarter">本季度</option>
              <option value="year">本年度</option>
            </select>
            <button className="h-9 px-4 rounded-lg border border-slate-700 bg-[#111827] text-sm text-slate-300 hover:border-orange-500 hover:text-orange-400 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出报表
            </button>
            <button className="h-9 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-1 mb-6 bg-[#111827] rounded-lg p-1 w-fit">
        {[
          { key: 'overview', label: '总览', icon: BarChart3 },
          { key: 'transactions', label: '交易明细', icon: FileText },
          { key: 'invoices', label: '发票管理', icon: CreditCard },
          { key: 'budget', label: '预算概览', icon: Wallet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`h-9 px-4 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI 卡片行 */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-slate-400">应收账款</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(stats.totalReceivable)}
                </span>
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  {stats.overdueCount} 笔逾期
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-400">已收款</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(stats.totalReceived)}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12.5%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm text-slate-400">应付账款</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-white font-mono">
                  {formatCurrency(stats.totalPayable)}
                </span>
                <span className="text-xs text-slate-500">待付金额</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-slate-400">净利润</span>
              </div>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-bold font-mono ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(stats.netProfit)}
                </span>
                <span className={`text-xs flex items-center gap-1 ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  当前周期
                </span>
              </div>
            </div>
          </div>

          {/* 交易明细表格 */}
          <div className="rounded-xl border border-slate-700/50 bg-[#111827] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">近期交易明细</h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                  {payments.length} 条
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索项目..."
                    className="h-8 w-48 rounded-lg border border-slate-700 bg-[#0a0e1a] pl-9 pr-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-orange-500"
                  />
                </div>
                <button className="h-8 px-3 rounded-lg border border-slate-700 bg-[#0a0e1a] text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  筛选
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">类型</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">项目/客户</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">类别</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">金额</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">到期日期</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className={`border-b border-slate-700/20 hover:bg-[#1e293b]/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0d1220]' : 'bg-[#111827]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(payment.type)}
                        <span className={`text-xs font-medium ${payment.type === 'income' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {payment.type === 'income' ? '收入' : '支出'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-200">{payment.projectName}</div>
                      <div className="text-xs text-slate-500">{payment.customerName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-300">
                        {payment.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        {formatDate(payment.dueDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-7 w-7 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-400/50 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="h-7 w-7 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-amber-400 hover:border-amber-400/50 transition-all">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700/50 bg-[#111827] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">发票管理</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  {invoices.length} 张
                </span>
              </div>
              <button className="h-8 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-medium shadow-lg shadow-orange-500/20 flex items-center gap-2">
                + 新增发票
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">发票号</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">项目/客户</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">类型</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">金额</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">开票日期</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">到期日期</th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, idx) => (
                  <tr
                    key={invoice.id}
                    className={`border-b border-slate-700/20 hover:bg-[#1e293b]/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-[#0d1220]' : 'bg-[#111827]'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm text-orange-400">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-200">{invoice.customerName}</div>
                      <div className="text-xs text-slate-500">{invoice.projectId === 'p1' ? 'ERP 管理系统' : invoice.customerName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        invoice.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {invoice.type === 'income' ? '进项' : '销项'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-white">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(invoice.issuedDate)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(invoice.dueDate)}</td>
                    <td className="px-4 py-3 text-center">
                      {invoice.paid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                          已付款
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                          待付款
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="h-7 w-7 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-blue-400 hover:border-blue-400/50 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="h-7 w-7 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-red-400 hover:border-red-400/50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700/50 bg-[#111827] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-white">项目预算执行概览</h3>
              <select className="h-8 rounded-lg border border-slate-700 bg-[#0a0e1a] px-3 text-xs text-slate-300 outline-none">
                <option>全部项目</option>
                <option>ERP 管理系统</option>
                <option>CRM 客户管理系统</option>
              </select>
            </div>
            <div className="space-y-4">
              {[
                { project: 'ERP 管理系统', budgeted: 1000000, actual: 720000 },
                { project: 'CRM 客户管理系统', budgeted: 800000, actual: 450000 },
                { project: 'MES 生产执行系统', budgeted: 2000000, actual: 1850000 },
              ].map((item) => {
                const percent = Math.round((item.actual / item.budgeted) * 100);
                const isOverBudget = percent > 100;
                return (
                  <div key={item.project} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300 font-medium">{item.project}</span>
                      <span className={`font-mono ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(item.actual)} / {formatCurrency(item.budgeted)} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverBudget
                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                            : 'bg-gradient-to-r from-orange-500 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="rounded-xl border border-slate-700/50 bg-[#111827] overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">全部交易记录</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">类型</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">项目</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">类别</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">金额</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">状态</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">到期/实收</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">备注</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, idx) => (
                <tr
                  key={payment.id}
                  className={`border-b border-slate-700/20 hover:bg-[#1e293b]/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-[#0d1220]' : 'bg-[#111827]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(payment.type)}
                      <span className={`text-xs font-medium ${payment.type === 'income' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {payment.type === 'income' ? '收入' : '支出'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-200">{payment.projectName}</div>
                    <div className="text-xs text-slate-500">{payment.customerName}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs text-slate-300">
                      {payment.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-white">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-600" />
                      <span>应到: {formatDate(payment.dueDate)}</span>
                    </div>
                    {payment.actualDate && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-400">实收: {formatDate(payment.actualDate)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{payment.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
