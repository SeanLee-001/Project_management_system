'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw,
  Search,
  Edit,
  Filter,
} from 'lucide-react';

// 财务管理数据类型
interface PaymentRecord {
  id: string;
  projectId: string;
  projectName: string;
  customerName: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  received: boolean;
  invoiceAmount: number;
  invoiced: boolean;
  status: 'pending' | 'received' | 'overdue';
  dueDate: string;
  actualDate: string | null;
  notes: string;
}

interface InvoiceRow {
  id: string;
  orderId: string;
  projectName: string;
  customerName: string;
  orderNumber: string;
  contractCode: string;
  deliveryDate: string | null;
  category: string;
  ratio: string;
  invoiceNumber: string;
  amount: string;
  invoiceDate: string;
  notes: string;
}

interface TransactionRow {
  id: string;
  orderId: string;
  projectName: string;
  customerName: string;
  orderNumber: string;
  contractCode: string;
  deliveryDate: string | null;
  category: string;
  ratio: string;
  receivableAmount: string;
  receivedAmount: string;
  dueDate: string;
  receivedDate: string;
  status1: string;
  status2: string;
  notes: string;
}

export default function FinancialManagement() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');
  const [loading, setLoading] = useState(false);

  // 模拟数据（总览用）
  const [payments] = useState<PaymentRecord[]>([
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
      amount: 200000,
      received: false,
      invoiceAmount: 0,
      invoiced: false,
      status: 'overdue',
      dueDate: '2026-05-20',
      actualDate: null,
      notes: '合同总额10%验收款',
    },
    {
      id: '4',
      projectId: 'p4',
      projectName: 'WMS 仓储管理系统',
      customerName: '京东物流',
      type: 'expense',
      category: '软件开发',
      amount: 150000,
      received: false,
      invoiceAmount: 150000,
      invoiced: true,
      status: 'pending',
      dueDate: '2026-08-01',
      actualDate: null,
      notes: '外包开发费用',
    },
    {
      id: '5',
      projectId: 'p5',
      projectName: 'OA 协同办公',
      customerName: '中国平安',
      type: 'income',
      category: '预付款',
      amount: 180000,
      received: true,
      invoiceAmount: 180000,
      invoiced: true,
      status: 'received',
      dueDate: '2026-04-15',
      actualDate: '2026-04-10',
      notes: '合同总额40%预付款',
    },
    {
      id: '6',
      projectId: 'p6',
      projectName: 'SCM 供应链',
      customerName: '富士康',
      type: 'income',
      category: '质保款',
      amount: 120000,
      received: false,
      invoiceAmount: 0,
      invoiced: false,
      status: 'pending',
      dueDate: '2026-12-01',
      actualDate: null,
      notes: '项目验收后12个月质保金',
    },
  ]);

  // 发票管理状态
  const [invoiceRows, setInvoiceRows] = useState<InvoiceRow[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceKeyword, setInvoiceKeyword] = useState('');
  const [editingInvoiceRow, setEditingInvoiceRow] = useState<InvoiceRow | null>(null);
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advCustomer, setAdvCustomer] = useState('');
  const [advOrderNumber, setAdvOrderNumber] = useState('');
  const [advContractCode, setAdvContractCode] = useState('');
  const [advDeliveryDate, setAdvDeliveryDate] = useState('');
  const [advInvoiceDate, setAdvInvoiceDate] = useState('');
  const [advInvoiceStatus, setAdvInvoiceStatus] = useState('');

  // 交易明细状态
  const [transactionRows, setTransactionRows] = useState<TransactionRow[]>([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionKeyword, setTransactionKeyword] = useState('');
  const [showTxnAdvancedSearch, setShowTxnAdvancedSearch] = useState(false);
  const [txnAdvCustomer, setTxnAdvCustomer] = useState('');
  const [txnAdvOrderNumber, setTxnAdvOrderNumber] = useState('');
  const [txnAdvContractCode, setTxnAdvContractCode] = useState('');
  const [txnAdvDeliveryDate, setTxnAdvDeliveryDate] = useState('');
  const [txnAdvDueDate, setTxnAdvDueDate] = useState('');
  const [editingTxnRow, setEditingTxnRow] = useState<TransactionRow | null>(null);
  const [showTxnEditModal, setShowTxnEditModal] = useState(false);
  const [txnForm, setTxnForm] = useState({ receivedAmount: '', dueDate: '', receivedDate: '', status1: '', notes: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = !searchTerm || p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || p.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || p.type === filterType;
      return matchSearch && matchType;
    });
  }, [payments, searchTerm, filterType]);

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

  // 统计卡片数据
  const stats = useMemo(() => {
    const totalReceivable = transactionRows.reduce((sum, r) => sum + (parseFloat(r.receivableAmount) || 0), 0);
    const totalReceived = transactionRows.reduce((sum, r) => sum + (parseFloat(r.receivedAmount) || 0), 0);
    const totalInvoiceAmount = invoiceRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const totalInvoiced = invoiceRows
      .filter(r => r.invoiceNumber)
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const totalUninvoiced = totalInvoiceAmount - totalInvoiced;
    const overdueCount = transactionRows.filter(r => r.status2 && r.status2.includes('延期')).length;
    const collectionRate = totalReceivable > 0 ? ((totalReceived / totalReceivable) * 100).toFixed(1) : '0.0';
    const invoiceRate = totalInvoiceAmount > 0 ? ((totalInvoiced / totalInvoiceAmount) * 100).toFixed(1) : '0.0';

    return {
      totalReceivable, totalReceived, totalInvoiceAmount,
      totalInvoiced, totalUninvoiced, overdueCount,
      collectionRate, invoiceRate
    };
  }, [transactionRows, invoiceRows]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch { return dateStr; }
  };

  // 从订单加载发票数据
  const fetchInvoices = useCallback(async (refresh = false) => {
    setInvoiceLoading(true);
    try {
      const params = new URLSearchParams();
      if (invoiceKeyword) params.set('keyword', invoiceKeyword);
      if (advCustomer) params.set('customerName', advCustomer);
      if (advOrderNumber) params.set('orderNumber', advOrderNumber);
      if (advContractCode) params.set('contractCode', advContractCode);
      if (advDeliveryDate) params.set('deliveryDate', advDeliveryDate);
      if (advInvoiceDate) params.set('invoiceDate', advInvoiceDate);
      if (advInvoiceStatus) params.set('invoiceStatus', advInvoiceStatus);
      if (refresh) params.set('refresh', 'true');
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setInvoiceRows(json.data);
      }
    } catch (err) {
      console.error('加载发票数据失败:', err);
    } finally {
      setInvoiceLoading(false);
    }
  }, [invoiceKeyword, advCustomer, advOrderNumber, advContractCode, advDeliveryDate, advInvoiceDate, advInvoiceStatus]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchInvoices(), 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const handleEditInvoiceRow = (row: InvoiceRow) => {
    setEditingInvoiceRow({ ...row });
    setShowInvoiceEditModal(true);
  };

  const handleSaveInvoiceRow = async () => {
    if (!editingInvoiceRow) return;
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingInvoiceRow),
      });
      setInvoiceRows(prev => prev.map(r =>
        r.id === editingInvoiceRow.id ? editingInvoiceRow : r
      ));
    } catch (err) {
      console.error('保存发票失败:', err);
    }
    setShowInvoiceEditModal(false);
    setEditingInvoiceRow(null);
  };

  // 从订单加载交易数据
  const fetchTransactions = useCallback(async () => {
    setTransactionLoading(true);
    try {
      const params = new URLSearchParams();
      if (transactionKeyword) params.set('keyword', transactionKeyword);
      if (txnAdvCustomer) params.set('customerName', txnAdvCustomer);
      if (txnAdvOrderNumber) params.set('orderNumber', txnAdvOrderNumber);
      if (txnAdvContractCode) params.set('contractCode', txnAdvContractCode);
      if (txnAdvDeliveryDate) params.set('deliveryDate', txnAdvDeliveryDate);
      if (txnAdvDueDate) params.set('dueDate', txnAdvDueDate);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTransactionRows(json.data);
      }
    } catch (err) {
      console.error('加载交易数据失败:', err);
    } finally {
      setTransactionLoading(false);
    }
  }, [transactionKeyword, txnAdvCustomer, txnAdvOrderNumber, txnAdvContractCode, txnAdvDeliveryDate, txnAdvDueDate]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchTransactions(), 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleEditTxnRow = (row: TransactionRow) => {
    setEditingTxnRow(row);
    setTxnForm({
      receivedAmount: row.receivedAmount || '',
      dueDate: row.dueDate || '',
      receivedDate: row.receivedDate || '',
      status1: row.status1 || '',
      notes: row.notes || '',
    });
    setShowTxnEditModal(true);
  };

  const handleSaveTxnRow = async () => {
    if (!editingTxnRow) return;
    const updated: TransactionRow = {
      ...editingTxnRow,
      receivedAmount: txnForm.receivedAmount,
      dueDate: txnForm.dueDate,
      receivedDate: txnForm.receivedDate,
      status1: txnForm.status1,
      notes: txnForm.notes,
    };

    const receivedAmount = parseFloat(txnForm.receivedAmount) || 0;
    const receivableAmount = parseFloat(updated.receivableAmount) || 0;
    if (!txnForm.receivedAmount) {
      updated.status1 = '';
      updated.status2 = '待收款';
    } else {
      if (receivedAmount >= receivableAmount) {
        updated.status1 = txnForm.status1 || '收款完成';
        updated.status2 = '收款完成';
      } else {
        updated.status1 = txnForm.status1 || '部分收款';
        updated.status2 = '部分收款';
      }
      if (txnForm.receivedDate) {
        if (txnForm.receivedDate > txnForm.dueDate) {
          updated.status2 += ' 延期收款';
        } else {
          updated.status2 += ' 按期收款';
        }
      }
    }

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setTransactionRows(prev => prev.map(r =>
        r.id === editingTxnRow.id ? updated : r
      ));
    } catch (err) {
      console.error('保存交易失败:', err);
    }
    setShowTxnEditModal(false);
    setEditingTxnRow(null);
  };

  const getTypeIcon = (type: PaymentRecord['type']) => {
    return type === 'income' ? (
      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-amber-400" />
    );
  };

  return (
    <div className="w-full h-full bg-white text-gray-900 p-6 overflow-auto">
      {/* 顶部标题栏 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">财务管理</h1>
            <p className="text-sm text-gray-400 mt-1">项目收支与资金流向实时监控</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            >
              <option value="week">本周</option>
              <option value="month">本月</option>
              <option value="quarter">本季度</option>
              <option value="year">本年度</option>
            </select>
            <button className="h-9 px-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 hover:border-orange-500 hover:text-orange-400 transition-all flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出报表
            </button>
            <button
              onClick={handleRefresh}
              className={`h-9 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all flex items-center gap-2 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新数据
            </button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'overview', label: '数据统计', icon: BarChart3 },
          { key: 'transactions', label: '交易明细', icon: FileText },
          { key: 'invoices', label: '发票管理', icon: CreditCard },
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
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-gray-700">应收账款</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatCurrency(stats.totalReceivable)}
                </span>
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3 h-3" />
                  {stats.overdueCount} 笔逾期
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm text-gray-700">已收款</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatCurrency(stats.totalReceived)}
                </span>
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  收款率 {stats.collectionRate}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-700">已开票金额</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatCurrency(stats.totalInvoiced)}
                </span>
                <span className="text-xs text-purple-400 flex items-center gap-1">
                  开票率 {stats.invoiceRate}%
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm text-gray-700">待开票金额</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatCurrency(stats.totalUninvoiced)}
                </span>
                <span className="text-xs text-gray-600">
                  {stats.totalInvoiceAmount > 0 ? `${invoiceRows.filter(r => !r.invoiceNumber).length} 笔待开` : '暂无数据'}
                </span>
              </div>
            </div>
          </div>

          {/* 收款分类统计 */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-900">收款分类统计</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  {transactionRows.length} 条
                </span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">付款类别</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">应收账款</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">已收款</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">收款率</th>
                  <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">收款完成</th>
                  <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">延期笔数</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const categories = ['预付款', '到货款', '验收款', '质保款'];
                  return categories.map((cat, idx) => {
                    const catRows = transactionRows.filter(r => r.category && r.category.startsWith(cat));
                    const receivable = catRows.reduce((sum, r) => sum + (parseFloat(r.receivableAmount) || 0), 0);
                    const received = catRows.reduce((sum, r) => sum + (parseFloat(r.receivedAmount) || 0), 0);
                    const rate = receivable > 0 ? ((received / receivable) * 100).toFixed(1) : '0.0';
                    const completed = catRows.filter(r => r.status1 === '收款完成').length;
                    const overdue = catRows.filter(r => r.status2 && r.status2.includes('延期')).length;
                    return (
                      <tr key={cat} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="px-4 py-3 text-base font-medium text-gray-900">{cat}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-gray-900">{formatCurrency(receivable)}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-emerald-400">{formatCurrency(received)}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-gray-700">{rate}%</td>
                        <td className="px-4 py-3 text-center text-base text-gray-700">{completed}/{catRows.length}</td>
                        <td className="px-4 py-3 text-center">
                          {overdue > 0 ? <span className="text-base text-red-400 font-medium">{overdue}</span> : <span className="text-base text-gray-400">0</span>}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* 开票分类统计 */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-900">开票分类统计</h3>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                  {invoiceRows.length} 条
                </span>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">发票类别</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">开票金额</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">已开票金额</th>
                  <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">开票率</th>
                  <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">已开票</th>
                  <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">待开票</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const categories = ['预付款', '到货款', '验收款', '质保款'];
                  return categories.map((cat, idx) => {
                    const catRows = invoiceRows.filter(r => r.category && r.category.startsWith(cat));
                    const totalAmount = catRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                    const invoicedRows = catRows.filter(r => r.invoiceNumber);
                    const invoicedAmount = invoicedRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                    const rate = totalAmount > 0 ? ((invoicedAmount / totalAmount) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={cat} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <td className="px-4 py-3 text-base font-medium text-gray-900">{cat}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-gray-900">{formatCurrency(totalAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-purple-400">{formatCurrency(invoicedAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-base text-gray-700">{rate}%</td>
                        <td className="px-4 py-3 text-center text-base text-gray-700">{invoicedRows.length}</td>
                        <td className="px-4 py-3 text-center text-base text-gray-700">{catRows.length - invoicedRows.length}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* 高级查询栏 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invoiceKeyword}
                  onChange={(e) => setInvoiceKeyword(e.target.value)}
                  placeholder="按客户、订单号、合同号等组合模糊查询..."
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${showAdvancedSearch ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-200 text-gray-600 hover:text-gray-700'}`}
              >
                <Filter className="w-4 h-4" />
                高级
              </button>
              <button
                onClick={() => fetchInvoices(true)}
                disabled={invoiceLoading}
                className={`h-9 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium flex items-center gap-2 ${invoiceLoading ? 'opacity-70' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 ${invoiceLoading ? 'animate-spin' : ''}`} />
                查询
              </button>
            </div>

            {showAdvancedSearch && (
              <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">客户名称</label>
                    <input
                      type="text"
                      value={advCustomer}
                      onChange={(e) => setAdvCustomer(e.target.value)}
                      placeholder="模糊匹配客户名称..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">订单号</label>
                    <input
                      type="text"
                      value={advOrderNumber}
                      onChange={(e) => setAdvOrderNumber(e.target.value)}
                      placeholder="模糊匹配订单号..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">合同号</label>
                    <input
                      type="text"
                      value={advContractCode}
                      onChange={(e) => setAdvContractCode(e.target.value)}
                      placeholder="模糊匹配合同号..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">交付日期</label>
                    <input
                      type="date"
                      value={advDeliveryDate}
                      onChange={(e) => setAdvDeliveryDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">开票日期</label>
                    <input
                      type="date"
                      value={advInvoiceDate}
                      onChange={(e) => setAdvInvoiceDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">开票状态</label>
                    <select
                      value={advInvoiceStatus}
                      onChange={(e) => setAdvInvoiceStatus(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500"
                    >
                      <option value="">全部</option>
                      <option value="completed">已完成</option>
                      <option value="pending">待开票</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      setAdvCustomer('');
                      setAdvOrderNumber('');
                      setAdvContractCode('');
                      setAdvDeliveryDate('');
                      setAdvInvoiceDate('');
                      setAdvInvoiceStatus('');
                    }}
                    className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs hover:text-gray-900 transition-colors"
                  >
                    清空筛选
                  </button>
                  <span className="text-xs text-gray-500">
                    各条件组合生效，留空表示不筛选
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-900">发票管理</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                  {invoiceRows.length} 条
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  完成
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  待开票
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3 w-12">序号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">项目名称/客户</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">订单号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">合同号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">交付日期</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">类别</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">发票号</th>
                    <th className="text-right text-sm font-semibold text-gray-900 px-4 py-3">金额</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">开票日期</th>
                    <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">状态</th>
                    <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">操作</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center">
                        {invoiceLoading ? (
                          <div className="flex items-center justify-center gap-2 text-gray-700">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-base">加载中...</span>
                          </div>
                        ) : (
                          <span className="text-base text-gray-600">暂无发票数据</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    invoiceRows.map((row, idx) => {
                      const hasInvoice = !!row.invoiceNumber;
                      return (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                          }`}
                        >
                          <td className="px-4 py-3 text-center text-base text-gray-600">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="text-base text-gray-900">{row.projectName}</div>
                            <div className="text-base text-gray-600">{row.customerName}</div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleEditInvoiceRow(row)}
                              className="text-base text-orange-400 hover:text-orange-300 hover:underline font-mono cursor-pointer"
                            >
                              {row.orderNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-base text-gray-700">{row.contractCode || '-'}</td>
                          <td className="px-4 py-3 text-base text-gray-700">
                            {row.deliveryDate ? formatDate(row.deliveryDate) : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-base text-gray-700">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-base text-orange-400">
                            {hasInvoice ? row.invoiceNumber : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-base text-gray-900">
                            {row.amount ? formatCurrency(parseFloat(row.amount) || 0) : '-'}
                          </td>
                          <td className="px-4 py-3 text-base text-gray-700">
                            {row.invoiceDate ? formatDate(row.invoiceDate) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasInvoice ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-base font-medium bg-emerald-500/20 text-emerald-400">
                                完成
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-base font-medium bg-slate-500/20 text-gray-700">
                                待开票
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleEditInvoiceRow(row)}
                              className="h-7 px-3 rounded-md border border-gray-200 text-base text-gray-600 hover:text-orange-400 hover:border-orange-500/50 transition-all"
                            >
                              编辑
                            </button>
                          </td>
                          <td className="px-4 py-3 text-base text-gray-400 max-w-[120px] truncate">
                            {row.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* 高级查询栏 */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={transactionKeyword}
                  onChange={(e) => setTransactionKeyword(e.target.value)}
                  placeholder="按客户、订单号、合同号等组合模糊查询..."
                  className="w-full h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                />
              </div>
              <button
                onClick={() => setShowTxnAdvancedSearch(!showTxnAdvancedSearch)}
                className={`h-9 px-3 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${showTxnAdvancedSearch ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-gray-200 text-gray-600 hover:text-gray-700'}`}
              >
                <Filter className="w-4 h-4" />
                高级
              </button>
              <button
                onClick={() => fetchTransactions()}
                disabled={transactionLoading}
                className={`h-9 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium flex items-center gap-2 ${transactionLoading ? 'opacity-70' : ''}`}
              >
                <RefreshCw className={`w-4 h-4 ${transactionLoading ? 'animate-spin' : ''}`} />
                查询
              </button>
            </div>

            {showTxnAdvancedSearch && (
              <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">客户名称</label>
                    <input
                      type="text"
                      value={txnAdvCustomer}
                      onChange={(e) => setTxnAdvCustomer(e.target.value)}
                      placeholder="模糊匹配客户名称..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">订单号</label>
                    <input
                      type="text"
                      value={txnAdvOrderNumber}
                      onChange={(e) => setTxnAdvOrderNumber(e.target.value)}
                      placeholder="模糊匹配订单号..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">合同号</label>
                    <input
                      type="text"
                      value={txnAdvContractCode}
                      onChange={(e) => setTxnAdvContractCode(e.target.value)}
                      placeholder="模糊匹配合同号..."
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">交付日期</label>
                    <input
                      type="date"
                      value={txnAdvDeliveryDate}
                      onChange={(e) => setTxnAdvDeliveryDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">到期日期</label>
                    <input
                      type="date"
                      value={txnAdvDueDate}
                      onChange={(e) => setTxnAdvDueDate(e.target.value)}
                      className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => {
                      setTxnAdvCustomer('');
                      setTxnAdvOrderNumber('');
                      setTxnAdvContractCode('');
                      setTxnAdvDeliveryDate('');
                      setTxnAdvDueDate('');
                    }}
                    className="h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs hover:text-gray-900 transition-colors"
                  >
                    清空筛选
                  </button>
                  <span className="text-xs text-gray-500">
                    各条件组合生效，留空表示不筛选
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-gray-900">全部交易记录</h3>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                  {transactionRows.length} 条
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  收款完成
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  部分收款
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  待收款
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-center text-sm font-semibold text-gray-900 px-3 py-3 w-12">序号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">项目名称/客户</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">订单号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">合同号</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">交付日期</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">类别</th>
                    <th className="text-right text-sm font-semibold text-gray-900 px-3 py-3">应收/实收（金额）</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">到期/实收</th>
                    <th className="text-center text-sm font-semibold text-gray-900 px-3 py-3">状态1</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">状态2</th>
                    <th className="text-center text-sm font-semibold text-gray-900 px-3 py-3">操作</th>
                    <th className="text-left text-sm font-semibold text-gray-900 px-3 py-3">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.length === 0 && !transactionLoading ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-gray-400 text-base">
                        暂无交易数据，请确认订单管理中已配置付款条件
                      </td>
                    </tr>
                  ) : (
                    transactionRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        }`}
                      >
                        <td className="px-3 py-3 text-center text-base text-gray-600">{idx + 1}</td>
                        <td className="px-3 py-3">
                          <div className="text-base text-gray-900">{row.projectName}</div>
                          <div className="text-base text-gray-600">{row.customerName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleEditTxnRow(row)}
                            className="text-base text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                          >
                            {row.orderNumber}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-base text-gray-700">{row.contractCode}</td>
                        <td className="px-3 py-3 text-base text-gray-700">{row.deliveryDate || '-'}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-base text-gray-700">
                            {row.category}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-base text-gray-900">
                          {row.receivableAmount ? formatCurrency(parseFloat(row.receivableAmount) || 0) : '-'}
                          {' / '}
                          <span className={!row.receivedAmount ? 'text-blue-400' : ''}>
                            {row.receivedAmount ? formatCurrency(parseFloat(row.receivedAmount) || 0) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-base text-gray-700">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span>{row.dueDate ? formatDate(row.dueDate) : '-'}</span>
                          </div>
                          {row.receivedDate && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-400">{formatDate(row.receivedDate)}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-base font-medium ${
                            row.status1 === '收款完成' ? 'bg-emerald-500/20 text-emerald-400' :
                            row.status1 === '部分收款' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {row.status1 || '待收款'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-base">
                          {(() => {
                            const parts = row.status2.split(' ');
                            return (
                              <div className="space-y-0.5">
                                {parts.map((part, i) => {
                                  let color = 'text-gray-700';
                                  if (part === '收款完成' || part === '按期收款') color = 'text-emerald-400';
                                  else if (part === '部分收款' || part === '延期收款') color = 'text-red-400';
                                  else if (part === '待收款') color = 'text-blue-400';
                                  return <div key={i} className={color}>{part}</div>;
                                })}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => handleEditTxnRow(row)}
                            className="h-7 px-3 rounded-md border border-gray-200 flex items-center gap-1 text-base text-gray-600 hover:text-amber-400 hover:border-amber-400/50 transition-all"
                          >
                            <Edit className="w-3 h-3" />
                            编辑
                          </button>
                        </td>
                        <td className="px-3 py-3 text-base text-gray-400 max-w-[120px] truncate" title={row.notes}>
                          {row.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== 编辑交易弹窗 ========== */}
      {showTxnEditModal && editingTxnRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">编辑交易信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">项目名称 / 客户</label>
                <input type="text" value={`${editingTxnRow.projectName} / ${editingTxnRow.customerName}`} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">订单号</label>
                <input type="text" value={editingTxnRow.orderNumber} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">合同号</label>
                <input type="text" value={editingTxnRow.contractCode} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">类别</label>
                <input type="text" value={editingTxnRow.category} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">应收金额 (自动加载)</label>
                <input type="text" value={editingTxnRow.receivableAmount || '-'} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">实收金额</label>
                <input type="number" value={txnForm.receivedAmount} onChange={(e) => setTxnForm(prev => ({ ...prev, receivedAmount: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">到期日期</label>
                <input type="date" value={txnForm.dueDate} onChange={(e) => setTxnForm(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">实收日期</label>
                <input type="date" value={txnForm.receivedDate} onChange={(e) => setTxnForm(prev => ({ ...prev, receivedDate: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500 [color-scheme:light]" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">状态1</label>
                <select value={txnForm.status1} onChange={(e) => setTxnForm(prev => ({ ...prev, status1: e.target.value }))} className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500">
                  <option value="">待收款</option>
                  <option value="收款完成">收款完成</option>
                  <option value="部分收款">部分收款</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">备注</label>
                <textarea value={txnForm.notes} onChange={(e) => setTxnForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowTxnEditModal(false); setEditingTxnRow(null); }} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition-colors">取消</button>
              <button onClick={handleSaveTxnRow} className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-lg shadow-orange-500/20">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 编辑发票弹窗 ========== */}
      {showInvoiceEditModal && editingInvoiceRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">编辑发票信息</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">项目名称</label>
                  <input type="text" value={editingInvoiceRow.projectName} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">客户名称</label>
                  <input type="text" value={editingInvoiceRow.customerName} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">订单号</label>
                  <input type="text" value={editingInvoiceRow.orderNumber} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">合同号</label>
                  <input type="text" value={editingInvoiceRow.contractCode || '-'} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">类别</label>
                  <input type="text" value={editingInvoiceRow.category} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">金额 (自动加载)</label>
                  <input type="text" value={editingInvoiceRow.amount} disabled className="w-full h-9 rounded-lg border border-gray-200 bg-white/50 px-3 text-sm text-gray-400 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">发票号 <span className="text-orange-400">*手动输入</span></label>
                  <input
                    type="text"
                    value={editingInvoiceRow.invoiceNumber}
                    onChange={(e) => setEditingInvoiceRow(prev => prev ? { ...prev, invoiceNumber: e.target.value } : null)}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500"
                    placeholder="如: INV-2026-001"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">开票日期 <span className="text-orange-400">*手动输入</span></label>
                  <input
                    type="date"
                    value={editingInvoiceRow.invoiceDate}
                    onChange={(e) => setEditingInvoiceRow(prev => prev ? { ...prev, invoiceDate: e.target.value } : null)}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-orange-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">备注 <span className="text-orange-400">*手动输入</span></label>
                <textarea
                  value={editingInvoiceRow.notes}
                  onChange={(e) => setEditingInvoiceRow(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-500 resize-none"
                  placeholder="输入备注信息..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowInvoiceEditModal(false); setEditingInvoiceRow(null); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveInvoiceRow}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium shadow-lg shadow-orange-500/20"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
