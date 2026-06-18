"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Search, RefreshCw, Download, Eye, Edit3, X, Check, RotateCcw } from "lucide-react";

interface InvoiceRow {
  id: string;
  orderId: string;
  orderNumber: string;
  contractCode: string;
  projectName: string;
  customerName: string;
  customerCode: string;
  deliveryDate: string | null;
  category: string;
  categoryKey: string;
  invoiceNumber: string;
  amount: string;
  invoiceDate: string | null;
  status: string;
  remarks: string;
  ratio: string;
  received: boolean;
  receivedDate: string | null;
}

interface EditingCell {
  rowId: string;
  field: "invoiceNumber" | "invoiceDate" | "remarks";
}

export default function InvoiceManagement() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const pageSize = 20;
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invoices");
      const json = await res.json();
      if (json.success) {
        setRows(json.data);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    let result = rows;
    if (keyword.trim()) {
      const kw = keyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.projectName.toLowerCase().includes(kw) ||
          r.customerName.toLowerCase().includes(kw) ||
          r.orderNumber.toLowerCase().includes(kw) ||
          r.contractCode.toLowerCase().includes(kw) ||
          r.invoiceNumber.toLowerCase().includes(kw)
      );
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    setFilteredRows(result);
    setCurrentPage(1);
  }, [rows, keyword, statusFilter]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const pagedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 计算行合并信息：相同 orderId 的行合并"项目名称/客户、订单号、合同号、交付日期"
  const rowMergeInfo = useMemo(() => {
    const info: { rowSpan: number; isFirst: boolean; groupIndex: number; rowIndex: number }[] = [];
    let i = 0;
    let groupIdx = 0;
    while (i < pagedRows.length) {
      const orderId = pagedRows[i].orderId;
      let span = 1;
      while (i + span < pagedRows.length && pagedRows[i + span].orderId === orderId) {
        span++;
      }
      for (let j = 0; j < span; j++) {
        info.push({ rowSpan: span, isFirst: j === 0, groupIndex: groupIdx, rowIndex: j });
      }
      groupIdx++;
      i += span;
    }
    return info;
  }, [pagedRows]);

  const startCellEdit = (row: InvoiceRow, field: EditingCell["field"]) => {
    setEditingCell({ rowId: row.id, field });
    if (field === "invoiceNumber") setEditValue(row.invoiceNumber);
    else if (field === "invoiceDate") setEditValue(row.invoiceDate || "");
    else if (field === "remarks") setEditValue(row.remarks || "");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveCell = async (row: InvoiceRow) => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const body: any = {
        orderId: row.orderId,
        categoryKey: row.categoryKey,
      };
      if (editingCell.field === "invoiceNumber") body.invoiceNumber = editValue;
      if (editingCell.field === "invoiceDate") body.invoiceDate = editValue;
      if (editingCell.field === "remarks") body.remarks = editValue;

      const res = await fetch("/api/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setRows((prev) =>
          prev.map((r) => {
            if (r.id === row.id) {
              const updated = { ...r };
              if (editingCell.field === "invoiceNumber") {
                updated.invoiceNumber = editValue;
                updated.status = editValue ? "完成" : "待开票";
              }
              if (editingCell.field === "invoiceDate") updated.invoiceDate = editValue || null;
              if (editingCell.field === "remarks") updated.remarks = editValue;
              return updated;
            }
            return r;
          })
        );
      } else {
        alert(json.error || "保存失败");
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("保存失败");
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: InvoiceRow) => {
    if (e.key === "Enter") saveCell(row);
    if (e.key === "Escape") setEditingCell(null);
  };

  const handleExport = () => {
    const csvHeaders = [
      "序号", "项目名称/客户", "订单号", "合同号", "交付日期",
      "类别", "发票号", "金额", "开票日期", "状态", "备注"
    ];
    const csvRows = filteredRows.map((r, i) => [
      i + 1,
      `${r.projectName} / ${r.customerName}`,
      r.orderNumber,
      r.contractCode,
      r.deliveryDate || "",
      r.category,
      r.invoiceNumber,
      r.amount,
      r.invoiceDate || "",
      r.status,
      r.remarks,
    ]);
    const csv = [csvHeaders, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `发票管理_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedCount = rows.filter((r) => r.status === "完成").length;
  const pendingCount = rows.filter((r) => r.status === "待开票").length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">发票管理</h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
            {rows.length} 条
          </span>
          <span className="text-xs text-slate-500">
            完成 <span className="text-green-400 font-medium">{completedCount}</span> 条
          </span>
          <span className="text-xs text-slate-500">
            待开票 <span className="text-slate-300 font-medium">{pendingCount}</span> 条
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="h-8 px-3 rounded-lg bg-slate-700/50 text-slate-300 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
            title="刷新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            刷新数据
          </button>
          <button
            onClick={handleExport}
            className="h-8 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            导出数据
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="输入关键字模糊查询"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300"
        >
          <option value="">全部状态</option>
          <option value="完成">完成</option>
          <option value="待开票">待开票</option>
        </select>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-9 px-3 rounded-lg text-xs font-medium transition-colors ${
            showAdvanced
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-slate-700/50 text-slate-400 border border-slate-700 hover:bg-slate-700"
          }`}
        >
          高级查询
        </button>
      </div>

      {/* Advanced Search */}
      {showAdvanced && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs text-slate-500">
            可以按客户、订单号、合同号、交付日期、开票日期等组合模糊查询（高级查询功能待实现）
          </p>
        </div>
      )}

      {/* Rule Instructions */}
      <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 text-xs text-slate-400 space-y-1">
        <p>a. 自动判断原则：发票号有数据，显示"完成"（绿色字体），发票号无数据，显示"待开票"（黑色字体）</p>
        <p>b. 自动加载数据均取自"订单管理"</p>
        <p>c. 每次用户登录后自动刷新一次数据，如果用户发现数据有更新，点"刷新数据"自动重新加载数据</p>
        <p>d. 类别：根据"订单管理"，自动拉取收款和开票信息付款条件数据生成，如果付款比率为0%，则去掉该行</p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/50 bg-[#111827] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/30 bg-[#0d1220]">
                <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3 w-12">序号</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[140px]">项目名称/客户</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[100px]">订单号</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[100px]">合同号</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[90px]">交付日期</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[70px]">类别</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[140px]">发票号</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-3 py-3 min-w-[90px]">金额</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[100px]">开票日期</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-3 py-3 w-16">状态</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-3 py-3 min-w-[120px]">备注</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500 text-sm">
                    加载中...
                  </td>
                </tr>
              ) : pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500 text-sm">
                    暂无发票数据
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => {
                  const mergeInfo = rowMergeInfo[idx];
                  const isMergedGroup = mergeInfo.rowSpan > 1;
                  const groupEven = mergeInfo.groupIndex % 2 === 0;
                  const renderMergeCell = mergeInfo.isFirst;

                  return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-700/20 hover:bg-[#1e293b]/50 transition-colors ${
                      groupEven ? "bg-[#0d1220]" : "bg-[#111827]"
                    }`}
                  >
                    {/* 序号 - 合并 */}
                    <td className="text-center text-xs text-slate-500 px-3 py-2.5 align-top">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    {/* 项目名称/客户 - 合并 */}
                    {renderMergeCell ? (
                      <td
                        rowSpan={mergeInfo.rowSpan}
                        className="px-3 py-2.5 align-top border-r border-slate-700/30"
                      >
                        <div className="text-sm text-slate-200 truncate max-w-[140px]">{row.projectName}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[140px]">{row.customerName}</div>
                      </td>
                    ) : null}
                    {/* 订单号 - 合并 */}
                    {renderMergeCell ? (
                      <td
                        rowSpan={mergeInfo.rowSpan}
                        className="px-3 py-2.5 align-top text-xs text-slate-300 font-mono border-r border-slate-700/30"
                      >
                        {row.orderNumber || "-"}
                      </td>
                    ) : null}
                    {/* 合同号 - 合并 */}
                    {renderMergeCell ? (
                      <td
                        rowSpan={mergeInfo.rowSpan}
                        className="px-3 py-2.5 align-top text-xs text-slate-300 font-mono border-r border-slate-700/30"
                      >
                        {row.contractCode || "-"}
                      </td>
                    ) : null}
                    {/* 交付日期 - 合并 */}
                    {renderMergeCell ? (
                      <td
                        rowSpan={mergeInfo.rowSpan}
                        className="px-3 py-2.5 align-top text-xs text-slate-400 border-r border-slate-700/30"
                      >
                        {row.deliveryDate || "-"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                        {row.category}
                        {row.ratio ? ` ${parseFloat(row.ratio)}%` : ""}
                      </span>
                    </td>
                    {/* Invoice Number - Editable */}
                    <td className="px-3 py-2.5">
                      {editingCell?.rowId === row.id && editingCell?.field === "invoiceNumber" ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, row)}
                            className="w-full h-7 px-2 rounded bg-slate-700 border border-blue-500/50 text-xs text-slate-200 focus:outline-none"
                          />
                          <button onClick={() => saveCell(row)} disabled={saving} className="p-0.5 text-green-400 hover:text-green-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-0.5 text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span
                            className={`text-xs cursor-pointer ${
                              row.invoiceNumber ? "text-orange-400 font-mono" : "text-slate-600"
                            }`}
                            onClick={() => startCellEdit(row, "invoiceNumber")}
                          >
                            {row.invoiceNumber || "点击输入"}
                          </span>
                          <button
                            onClick={() => startCellEdit(row, "invoiceNumber")}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-slate-400 transition-opacity"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-200 font-mono">
                      {row.amount ? `¥${Number(row.amount).toLocaleString()}` : "-"}
                    </td>
                    {/* Invoice Date - Editable */}
                    <td className="px-3 py-2.5">
                      {editingCell?.rowId === row.id && editingCell?.field === "invoiceDate" ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, row)}
                            className="w-full h-7 px-2 rounded bg-slate-700 border border-blue-500/50 text-xs text-slate-200 focus:outline-none [color-scheme:dark]"
                          />
                          <button onClick={() => saveCell(row)} disabled={saving} className="p-0.5 text-green-400 hover:text-green-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-0.5 text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span
                            className={`text-xs cursor-pointer ${row.invoiceDate ? "text-slate-300" : "text-slate-600"}`}
                            onClick={() => startCellEdit(row, "invoiceDate")}
                          >
                            {row.invoiceDate || "点击选择"}
                          </span>
                          <button
                            onClick={() => startCellEdit(row, "invoiceDate")}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-slate-400 transition-opacity"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`text-xs font-medium ${
                          row.status === "完成" ? "text-green-400" : "text-slate-400"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    {/* Remarks - Editable */}
                    <td className="px-3 py-2.5">
                      {editingCell?.rowId === row.id && editingCell?.field === "remarks" ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={inputRef}
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, row)}
                            className="w-full h-7 px-2 rounded bg-slate-700 border border-blue-500/50 text-xs text-slate-200 focus:outline-none"
                          />
                          <button onClick={() => saveCell(row)} disabled={saving} className="p-0.5 text-green-400 hover:text-green-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingCell(null)} className="p-0.5 text-slate-500 hover:text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span
                            className={`text-xs cursor-pointer truncate max-w-[100px] ${row.remarks ? "text-slate-400" : "text-slate-600"}`}
                            onClick={() => startCellEdit(row, "remarks")}
                          >
                            {row.remarks || "点击输入"}
                          </span>
                          <button
                            onClick={() => startCellEdit(row, "remarks")}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-slate-400 transition-opacity"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/30">
            <span className="text-xs text-slate-500">
              共 {filteredRows.length} 条，第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
              >
                首页
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
              >
                上一页
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded text-xs ${
                      currentPage === pageNum
                        ? "bg-blue-500/20 text-blue-400 font-medium"
                        : "text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
              >
                下一页
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
              >
                末页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
