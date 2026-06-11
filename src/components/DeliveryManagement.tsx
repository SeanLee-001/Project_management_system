"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
// @ts-ignore - jsbarcode 没有类型声明
let JsBarcode: typeof import("jsbarcode").default;
async function loadJsBarcode() {
  if (!JsBarcode) {
    const mod = await import("jsbarcode");
    JsBarcode = mod.default;
  }
  return JsBarcode;
}
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";

// ========== 类型定义 ==========
interface Supplier {
  id: string;
  name: string;
  englishName?: string;
  shortName?: string;
  contact?: string;
  phone?: string;
  logo?: string;
  createTime?: string;
}

interface Company {
  id: string;
  name: string;
  customerCode?: string;
  customerName?: string;
  address?: string;
  contact?: string;
  phone?: string;
  createTime?: string;
  updateTime?: string;
}

interface Product {
  id: string;
  materialCode: string; // 物料编码
  projectName: string; // 项目名称
  specification?: string; // 规格型号
  description?: string; // 产品描述
  status?: string;
  unit?: string;
}

interface DeliveryNote {
  id: string;
  noteNumber: string;
  supplierId: string;
  supplierName?: string;
  supplierEnglishName?: string;
  supplierLogo?: string;
  companyId: string;
  companyName?: string;
  receiver?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  deliveryDate: string;
  items: DeliveryNoteItem[];
  status: "pending" | "in_transit" | "delivered" | "completed" | "cancelled";
  remarks?: string;
  receipt?: { name: string; url: string; type: string; uploadedAt: string }[];
  createTime?: string;
}

interface DeliveryNoteItem {
  productId: string;
  productName: string;
  productCode: string;
  specification?: string;
  quantity: number;
  unit?: string;
  remarks?: string;
}

interface MaterialLabel {
  id: string;
  labelCode: string;
  productId: string;
  productCode: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  purchaseOrder?: string;
  quantity?: string;
  unit?: string;
  receiveDate?: string;
  companyName?: string;
  createTime?: string;
  updateTime?: string;
}

// ========== 发货/配送数据模型 ==========
interface ShipmentOrder {
  id: string;
  shipmentNumber: string;       // 发货单号（= 送货单号，用于扫码查询）
  deliveryNoteId: string;       // 关联送货单ID
  deliveryNoteNumber: string;   // 送货单号
  supplierName?: string;
  companyName?: string;
  status: "pending_ship" | "shipped" | "in_distribution" | "delivered" | "completed" | "cancelled";
  shipTime?: string;            // 发货时间
  shipOperator?: string;        // 发货员
  receipt?: { name: string; url: string; type: string; uploadedAt: string }[];  // 回单
  cancelReason?: string;        // 取消原因
  failureHistory?: { time: string; reason: string; type: string }[];  // 失败记录
  createTime?: string;
}

interface DistributionOrder {
  id: string;
  distributionNumber: string;   // 配送单号
  shipmentId: string;           // 关联发货单ID
  shipmentNumber: string;       // 发货单号（= 送货单号，用于扫码查询）
  deliveryNoteId: string;       // 关联送货单ID
  supplierName?: string;
  companyName?: string;
  deliveryAddress?: string;
  receiver?: string;
  receiverPhone?: string;
  distributionType: "logistics" | "express" | "company";  // 物流/快递/公司配送
  // 物流配送字段
  logisticsCompany?: string;    // 物流公司名称
  logisticsNumber?: string;     // 物流单号
  logisticsDriverName?: string; // 司机姓名
  logisticsDriverId?: string;   // 司机身份证号
  logisticsDriverPhone?: string;// 司机手机号
  // 快递字段
  expressCompany?: string;      // 快递公司名称
  expressNumber?: string;       // 快递单号
  // 公司配送字段
  companyDriverName?: string;   // 司机姓名
  companyDriverId?: string;     // 司机身份证号
  companyDriverPhone?: string;  // 司机手机号
  status: "pending_distribute" | "in_distribution" | "delivered" | "failed";
  distributeTime?: string;      // 开始配送时间
  completeTime?: string;        // 完成时间
  distributor?: string;         // 配送员
  failReason?: string;          // 失败原因
  receipt?: { name: string; url: string; type: string; uploadedAt: string }[];  // 回单
  cancelReason?: string;        // 取消原因
  failureHistory?: { time: string; reason: string; type: string }[];  // 失败记录
  createTime?: string;
}

// 送货单预览内容组件
function DeliveryNoteContent({ note, suppliers: suppliersProp, companies: companiesProp }: { note: DeliveryNote | null; suppliers?: Supplier[]; companies?: Company[] }) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (barcodeRef.current && note?.noteNumber) {
      loadJsBarcode().then(JB => {
        if (barcodeRef.current) {
          JB(barcodeRef.current, note.noteNumber, {
            width: 1.5,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 5,
          });
        }
      });
    }
  }, [note?.noteNumber]);
  
  if (!note) return null;

  const statusMap: Record<string, string> = {
    pending: "待发货",
    in_transit: "配送中",
    delivered: "已送达",
    completed: "已完成",
    cancelled: "已取消",
  };

  const supplier = suppliersProp?.find((s) => s.id === note.supplierId);
  const supplierName = supplier?.name || note.supplierName || "";
  const supplierEnglishName = supplier?.englishName || "";
  const supplierInitial = supplierName ? supplierName.charAt(0) : "W";
  const supplierLogo = supplier?.logo || "";
  const company = companiesProp?.find((c) => c.id === note.companyId);
  const companyName = note.companyName || company?.name || company?.customerName || "";
  
  return (
    <div style={{ border: "2px solid #333", padding: "20px", fontFamily: "'Microsoft YaHei', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #333", paddingBottom: "15px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {supplierLogo ? (
            <img src={supplierLogo} alt="Logo" style={{ width: "50px", height: "50px", objectFit: "contain", borderRadius: "6px" }} />
          ) : (
            <div style={{ width: "50px", height: "50px", background: "linear-gradient(135deg, #1a3a5c, #2d5a8e)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "14px" }}>{supplierInitial}</div>
          )}
          <div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1a3a5c" }}>{supplierName}</div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>{supplierEnglishName}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <svg ref={barcodeRef} className="delivery-barcode"></svg>
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", margin: "15px 0", letterSpacing: "10px" }}>送 货 单</div>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0" }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", width: "90px", fontWeight: "bold" }}>收货公司</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>{companyName}</td>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", width: "90px", fontWeight: "bold" }}>收货地址</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>{note.deliveryAddress || "-"}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", fontWeight: "bold" }}>收货人</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>{note.receiver || "-"}</td>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", fontWeight: "bold" }}>收货电话</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>{note.contactPhone || "-"}</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", fontWeight: "bold" }}>送货日期</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>{note.deliveryDate}</td>
            <td style={{ border: "1px solid #333", padding: "8px", background: "#f5f5f5", fontWeight: "bold" }}>备注</td>
            <td style={{ border: "1px solid #333", padding: "8px" }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", margin: "10px 0" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "center", width: "50px" }}>序号</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "left" }}>物料编码</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "left" }}>物料名称</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "left" }}>规格</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "center", width: "60px" }}>数量</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "center", width: "50px" }}>单位</th>
            <th style={{ border: "1px solid #333", padding: "8px", background: "#f0f0f0", textAlign: "left" }}>备注</th>
          </tr>
        </thead>
        <tbody>
          {note.items.map((item, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid #333", padding: "8px", textAlign: "center" }}>{index + 1}</td>
              <td style={{ border: "1px solid #333", padding: "8px", fontFamily: "monospace" }}>{item.productCode}</td>
              <td style={{ border: "1px solid #333", padding: "8px" }}>{item.productName}</td>
              <td style={{ border: "1px solid #333", padding: "8px" }}>{item.specification || ""}</td>
              <td style={{ border: "1px solid #333", padding: "8px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ border: "1px solid #333", padding: "8px", textAlign: "center" }}>{item.unit || "个"}</td>
              <td style={{ border: "1px solid #333", padding: "8px" }}>{item.remarks || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note.remarks && (
        <div style={{ marginTop: "20px" }}>
          <strong>备注:</strong> {note.remarks}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
        <div style={{ textAlign: "center", width: "150px" }}>
          <div style={{ marginBottom: "60px" }}>送货人签名:</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "5px" }}></div>
        </div>
        <div style={{ textAlign: "center", width: "150px" }}>
          <div style={{ marginBottom: "60px" }}>收货人签名:</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "5px" }}></div>
        </div>
        <div style={{ textAlign: "center", width: "150px" }}>
          <div style={{ marginBottom: "60px" }}>仓管签名:</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: "5px" }}></div>
        </div>
      </div>
    </div>
  );
}

type ActiveTab = "dashboard" | "delivery" | "shipment" | "distribution" | "label" | "basic";
type BasicSubTab = "supplier" | "company";

const STORAGE_KEYS = {
  suppliers: "delivery_suppliers",
  companies: "delivery_companies",
  deliveryNotes: "delivery_notes",
  materialLabels: "delivery_labels",
  shipmentOrders: "delivery_shipment_orders",
  distributionOrders: "delivery_distribution_orders",
};

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter++;
  return `${prefix}${Date.now()}${idCounter}`;
}

function formatDate(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleString("zh-CN") : new Date().toLocaleString("zh-CN");
}

function escapeHtml(str?: string): string {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
}

// ========== 送货看板组件 ==========
const STATUS_MAP: Record<string, string> = {
  pending: "待发货",
  in_transit: "配送中",
  delivered: "已送达",
  completed: "已完成",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  in_transit: "#3b82f6",
  delivered: "#8b5cf6",
  completed: "#10b981",
  cancelled: "#6b7280",
};

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

interface DashboardProps {
  deliveryNotes: DeliveryNote[];
  materialLabels: MaterialLabel[];
  suppliers: Supplier[];
  companies: Company[];
  shipments: ShipmentOrder[];
  distributions: DistributionOrder[];
}

function DeliveryDashboard({ deliveryNotes, materialLabels, suppliers, companies, shipments, distributions }: DashboardProps) {
  // ========== 统计指标 ==========
  const stats = useMemo(() => {
    const total = deliveryNotes.length;
    const totalItems = deliveryNotes.reduce((sum, n) => sum + n.items.length, 0);
    const totalQuantity = deliveryNotes.reduce(
      (sum, n) => sum + n.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0), 0
    );
    const byStatus: Record<string, number> = {};
    deliveryNotes.forEach((n) => {
      byStatus[n.status] = (byStatus[n.status] || 0) + 1;
    });
    const pendingCount = byStatus["pending"] || 0;
    const inTransitCount = byStatus["in_transit"] || 0;
    const deliveredCount = byStatus["delivered"] || 0;
    const completedCount = byStatus["completed"] || 0;
    const cancelledCount = byStatus["cancelled"] || 0;
    return { total, totalItems, totalQuantity, byStatus, pendingCount, inTransitCount, deliveredCount, completedCount, cancelledCount };
  }, [deliveryNotes]);

  // ========== 状态分布（饼图） ==========
  const statusPieData = useMemo(() => {
    return Object.entries(stats.byStatus).map(([key, value]) => ({
      name: STATUS_MAP[key] || key,
      value,
      color: STATUS_COLORS[key] || "#6b7280",
    }));
  }, [stats.byStatus]);

  // ========== 近7天送货趋势 ==========
  const recentTrend = useMemo(() => {
    const days: { date: string; label: string; count: number; items: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayNotes = deliveryNotes.filter((n) => n.deliveryDate === dateStr);
      days.push({
        date: dateStr,
        label,
        count: dayNotes.length,
        items: dayNotes.reduce((s, n) => s + n.items.length, 0),
      });
    }
    return days;
  }, [deliveryNotes]);

  // ========== 近30天送货趋势 ==========
  const monthlyTrend = useMemo(() => {
    const days: { date: string; label: string; count: number; quantity: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayNotes = deliveryNotes.filter((n) => n.deliveryDate === dateStr);
      days.push({
        date: dateStr,
        label,
        count: dayNotes.length,
        quantity: dayNotes.reduce((s, n) => s + n.items.reduce((si, it) => si + (Number(it.quantity) || 0), 0), 0),
      });
    }
    return days;
  }, [deliveryNotes]);

  // ========== 供应商送货排行 ==========
  const supplierRank = useMemo(() => {
    const map: Record<string, { name: string; count: number; quantity: number }> = {};
    deliveryNotes.forEach((n) => {
      const sName = n.supplierName || "未知";
      if (!map[n.supplierId]) {
        map[n.supplierId] = { name: sName, count: 0, quantity: 0 };
      }
      map[n.supplierId].count += 1;
      map[n.supplierId].quantity += n.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [deliveryNotes]);

  // ========== 收货公司送货排行 ==========
  const companyRank = useMemo(() => {
    const map: Record<string, { name: string; count: number; quantity: number }> = {};
    deliveryNotes.forEach((n) => {
      const cName = n.companyName || "未知";
      if (!map[n.companyId]) {
        map[n.companyId] = { name: cName, count: 0, quantity: 0 };
      }
      map[n.companyId].count += 1;
      map[n.companyId].quantity += n.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [deliveryNotes]);

  // ========== 物料标签统计 ==========
  const labelStats = useMemo(() => {
    const total = materialLabels.length;
    const bySupplier: Record<string, { name: string; count: number }> = {};
    materialLabels.forEach((l) => {
      if (!bySupplier[l.supplierId]) {
        bySupplier[l.supplierId] = { name: l.supplierName || "未知", count: 0 };
      }
      bySupplier[l.supplierId].count += 1;
    });
    const supplierData = Object.values(bySupplier).sort((a, b) => b.count - a.count).slice(0, 6);
    return { total, supplierData };
  }, [materialLabels]);

  // ========== 本月 vs 上月 ==========
  const monthCompare = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;
    
    const thisMonthNotes = deliveryNotes.filter((n) => n.deliveryDate.startsWith(thisMonth));
    const lastMonthNotes = deliveryNotes.filter((n) => n.deliveryDate.startsWith(lastMonth));

    const thisCount = thisMonthNotes.length;
    const lastCount = lastMonthNotes.length;
    const thisQty = thisMonthNotes.reduce((s, n) => s + n.items.reduce((si, i) => si + (Number(i.quantity) || 0), 0), 0);
    const lastQty = lastMonthNotes.reduce((s, n) => s + n.items.reduce((si, i) => si + (Number(i.quantity) || 0), 0), 0);

    return {
      thisMonth: { count: thisCount, quantity: thisQty },
      lastMonth: { count: lastCount, quantity: lastQty },
      countChange: lastCount > 0 ? (((thisCount - lastCount) / lastCount) * 100).toFixed(1) : thisCount > 0 ? "100" : "0",
      quantityChange: lastQty > 0 ? (((thisQty - lastQty) / lastQty) * 100).toFixed(1) : thisQty > 0 ? "100" : "0",
    };
  }, [deliveryNotes]);

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="送货单总数" value={stats.total} icon="📋" sub={`本月 ${monthCompare.thisMonth.count} 单`} />
        <StatCard title="送货总项次" value={stats.totalItems} icon="📦" sub={`物料标签 ${labelStats.total} 张`} />
        <StatCard title="送货总数量" value={stats.totalQuantity} icon="🔢" sub={`环比 ${Number(monthCompare.quantityChange) >= 0 ? "+" : ""}${monthCompare.quantityChange}%`} />
        <StatCard title="待处理" value={stats.pendingCount + stats.inTransitCount} icon="⏳" sub={`待发货${stats.pendingCount} / 配送中${stats.inTransitCount}`} highlight />
      </div>

      {/* 月度对比 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">本月送货单</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">{monthCompare.thisMonth.count}</span>
            <span className={`text-sm ${Number(monthCompare.countChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {Number(monthCompare.countChange) >= 0 ? "↑" : "↓"} {Math.abs(Number(monthCompare.countChange))}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">上月 {monthCompare.lastMonth.count} 单</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">本月送货数量</div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">{monthCompare.thisMonth.quantity}</span>
            <span className={`text-sm ${Number(monthCompare.quantityChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {Number(monthCompare.quantityChange) >= 0 ? "↑" : "↓"} {Math.abs(Number(monthCompare.quantityChange))}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">上月 {monthCompare.lastMonth.quantity}</div>
        </div>
      </div>

      {/* 图表区域 - 第一行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 状态分布饼图 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">送货单状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusPieData.map((s) => (
              <span key={s.name} className="flex items-center gap-1 text-xs">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.color }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

        {/* 近7天趋势 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">近7天送货趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="送货单数" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="items" name="物料项次" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 近30天送货数量趋势 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">近30天送货数量趋势</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="quantity" name="送货数量" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 物料标签按供应商分布 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">物料标签按供应商分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={labelStats.supplierData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="count" label={({ name, value }: { name?: string; value?: number }) => `${name || ""} ${value || ""}`}>
                  {labelStats.supplierData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 排行榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 供应商排行 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">供应商送货排行</h3>
          {supplierRank.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {supplierRank.map((s, i) => {
                const maxCount = supplierRank[0]?.count || 1;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${i < 3 ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm w-24 truncate" title={s.name}>{s.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(s.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{s.count} 单</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 收货公司排行 */}
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">收货公司送货排行</h3>
          {companyRank.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {companyRank.map((c, i) => {
                const maxCount = companyRank[0]?.count || 1;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium ${i < 3 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm w-24 truncate" title={c.name}>{c.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">{c.count} 单</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 最近送货单列表 */}
      <div className="border rounded-lg p-4">
      {/* 延期预警 */}
      {(() => {
        const delayedNotes = deliveryNotes.filter(n => {
          if (n.status === "pending" || n.status === "cancelled") return false;
          const ship = shipments.find(s => s.deliveryNoteId === n.id);
          const dist = distributions.find(d => d.deliveryNoteId === n.id);
          let maxDelay = 0;
          let delayType = "";
          if (ship && ship.shipTime) {
            const deliveryDeadline = new Date(n.deliveryDate + "T24:00:00");
            const shipTime = new Date(ship.shipTime);
            const diff = (shipTime.getTime() - deliveryDeadline.getTime()) / (1000 * 60 * 60);
            if (diff > 12 && diff - 12 > maxDelay) { maxDelay = diff - 12; delayType = "发货"; }
          }
          if (dist && dist.distributeTime) {
            const deliveryDeadline = new Date(n.deliveryDate + "T24:00:00");
            const distTime = new Date(dist.distributeTime);
            const diff = (distTime.getTime() - deliveryDeadline.getTime()) / (1000 * 60 * 60);
            if (diff > 24 && diff - 24 > maxDelay) { maxDelay = diff - 24; delayType = "配送"; }
          }
          return maxDelay > 0;
        });
        if (delayedNotes.length === 0) return null;
        return (
          <div className="border rounded-lg p-4 border-red-200 bg-red-50/30">
            <h3 className="text-sm font-semibold mb-3 text-red-700">延期预警 ({delayedNotes.length} 单)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {delayedNotes.map(n => {
                const ship = shipments.find(s => s.deliveryNoteId === n.id);
                const dist = distributions.find(d => d.deliveryNoteId === n.id);
                let shipDelay = 0; let distDelay = 0;
                if (ship?.shipTime) {
                  const dl = new Date(n.deliveryDate + "T24:00:00");
                  const diff = (new Date(ship.shipTime).getTime() - dl.getTime()) / (1000*60*60);
                  if (diff > 12) shipDelay = diff - 12;
                }
                if (dist?.distributeTime) {
                  const dl = new Date(n.deliveryDate + "T24:00:00");
                  const diff = (new Date(dist.distributeTime).getTime() - dl.getTime()) / (1000*60*60);
                  if (diff > 24) distDelay = diff - 24;
                }
                return (
                  <div key={n.id} className="flex items-center gap-3 text-sm bg-white rounded px-3 py-2 border">
                    <span className="font-mono text-xs font-medium">{n.noteNumber}</span>
                    <span className="text-muted-foreground">{n.supplierName || "-"} → {n.companyName || "-"}</span>
                    {shipDelay > 0 && <span className="text-amber-600 text-xs">发货延期 {shipDelay.toFixed(1)}h</span>}
                    {distDelay > 0 && <span className="text-red-600 text-xs">配送延期 {distDelay.toFixed(1)}h</span>}
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ background: STATUS_COLORS[n.status] + "20", color: STATUS_COLORS[n.status] }}>{STATUS_MAP[n.status]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 配送方式统计 + 延期统计图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">配送方式统计</h3>
          {distributions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无配送数据</p>
          ) : (() => {
            const modeMap: Record<string, number> = {};
            distributions.forEach(d => { modeMap[d.distributionType] = (modeMap[d.distributionType] || 0) + 1; });
            const modeLabels: Record<string, string> = { logistics: "物流配送", express: "快递", company: "公司配送" };
            const pieData = Object.entries(modeMap).map(([k, v]) => ({ name: modeLabels[k] || k, value: v, fill: k === "logistics" ? "#3b82f6" : k === "express" ? "#10b981" : "#f59e0b" }));
            return (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                      {pieData.map((entry, index) => (<Cell key={`cm-${index}`} fill={entry.fill} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">送货/配送延期统计</h3>
          {(() => {
            const shipDelayed = deliveryNotes.filter(n => {
              const ship = shipments.find(s => s.deliveryNoteId === n.id);
              if (!ship?.shipTime) return false;
              const dl = new Date(n.deliveryDate + "T24:00:00");
              return (new Date(ship.shipTime).getTime() - dl.getTime()) / (1000*60*60) > 12;
            }).length;
            const distDelayed = deliveryNotes.filter(n => {
              const dist = distributions.find(d => d.deliveryNoteId === n.id);
              if (!dist?.distributeTime) return false;
              const dl = new Date(n.deliveryDate + "T24:00:00");
              return (new Date(dist.distributeTime).getTime() - dl.getTime()) / (1000*60*60) > 24;
            }).length;
            const barData = [
              { name: "按时发货", value: deliveryNotes.length - shipDelayed, fill: "#10b981" },
              { name: "发货延期", value: shipDelayed, fill: "#f59e0b" },
              { name: "按时配送", value: deliveryNotes.length - distDelayed, fill: "#3b82f6" },
              { name: "配送延期", value: distDelayed, fill: "#ef4444" },
            ];
            return (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {barData.map((entry, index) => (<Cell key={`dbar-${index}`} fill={entry.fill} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      </div>

        <h3 className="text-sm font-semibold mb-3">最近送货记录</h3>
        {deliveryNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">暂无送货记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">送货单号</th>
                  <th className="text-left py-2 px-3 font-medium">供应商</th>
                  <th className="text-left py-2 px-3 font-medium">收货公司</th>
                  <th className="text-center py-2 px-3 font-medium">项次</th>
                  <th className="text-center py-2 px-3 font-medium">数量</th>
                  <th className="text-center py-2 px-3 font-medium">状态</th>
                  <th className="text-left py-2 px-3 font-medium">送货日期</th>
                </tr>
              </thead>
              <tbody>
                {deliveryNotes
                  .slice()
                  .sort((a, b) => (b.createTime || "").localeCompare(a.createTime || ""))
                  .slice(0, 10)
                  .map((note) => (
                    <tr key={note.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-xs">{note.noteNumber}</td>
                      <td className="py-2 px-3">{note.supplierName || "-"}</td>
                      <td className="py-2 px-3">{note.companyName || "-"}</td>
                      <td className="py-2 px-3 text-center">{note.items.length}</td>
                      <td className="py-2 px-3 text-center">{note.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: STATUS_COLORS[note.status] + "20", color: STATUS_COLORS[note.status] }}>
                          {STATUS_MAP[note.status] || note.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">{note.deliveryDate}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// 统计卡片组件
function StatCard({ title, value, icon, sub, highlight }: { title: string; value: number; icon: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? "border-amber-300 bg-amber-50/50" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

// ========== 主组件 ==========
interface DeliveryManagementProps {
  currentUserName?: string;
  currentUserRole?: string;
}

export default function DeliveryManagement({ currentUserName = "", currentUserRole = "" }: DeliveryManagementProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ActiveTab>("delivery");
  const [basicSubTab, setBasicSubTab] = useState<BasicSubTab>("supplier");
  
  // 子模块权限检查 - admin拥有所有权限，其他用户需要配置
  const isAdmin = currentUserRole === "system_admin" || currentUserRole === "SYSTEM_ADMIN";
  const hasSubPermission = (subModule: string): boolean => {
    if (isAdmin) return true;
    // 非admin用户默认只能查看，后台权限管理可细粒度控制
    return true; // 目前先开放所有子模块，后续可通过权限API细控
  };
  
  // 基础数据 - 供应商和收货公司（送货管理内部维护）
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  // 收货公司数据从客户管理API获取
  const [customers, setCustomers] = useState<Company[]>([]);
  // 基础资料编辑模态框
  const [basicEditModal, setBasicEditModal] = useState<{ type: "supplier" | "company"; item?: Supplier | Company } | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [labelPreview, setLabelPreview] = useState<MaterialLabel | null>(null);
  const [deliveryPreview, setDeliveryPreview] = useState<DeliveryNote | null>(null);
  // 产品数据从产品管理API获取
  const [externalProducts, setExternalProducts] = useState<Product[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [materialLabels, setMaterialLabels] = useState<MaterialLabel[]>([]);
  // 物料标签编辑状态
  const [labelEditModal, setLabelEditModal] = useState<MaterialLabel | null>(null);
  // 新增物料标签状态
  const [newLabelModal, setNewLabelModal] = useState(false);
  const [newLabelForm, setNewLabelForm] = useState({ labelCode: "", supplierId: "", supplierName: "", productCode: "", productName: "", quantity: "1", unit: "个", purchaseOrder: "", receiveDate: new Date().toISOString().split("T")[0], companyName: "" });
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<Array<{ id: string; materialCode: string; projectName: string; specification?: string; unit?: string }>>([]);
  // 标签生成下拉菜单状态
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  // 新增标签 - 产品搜索关键字
  const [labelProductSearch, setLabelProductSearch] = useState("");
  // 预览模态框
  const [previewModal, setPreviewModal] = useState<{ type: "label" | "delivery"; data?: MaterialLabel | DeliveryNote } | null>(null);

  // ========== 发货/配送状态 ==========
  const [shipmentOrders, setShipmentOrders] = useState<ShipmentOrder[]>([]);
  const [distributionOrders, setDistributionOrders] = useState<DistributionOrder[]>([]);
  // 发货模块 - 搜索与操作
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [shipmentConfirmId, setShipmentConfirmId] = useState<string | null>(null);
  const [showShipmentAdvSearch, setShowShipmentAdvSearch] = useState(false);
  const [shipmentAdvSearch, setShipmentAdvSearch] = useState({ shipmentNumber: "", deliveryNoteNumber: "", supplierName: "", companyName: "", status: "", shipDate: "" });
  const [cancelShipmentId, setCancelShipmentId] = useState<string | null>(null);
  const [cancelShipmentReason, setCancelShipmentReason] = useState("");
  const [uploadReceiptShipmentId, setUploadReceiptShipmentId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [expandedShipmentId, setExpandedShipmentId] = useState<string | null>(null);
  // 配送模块 - 搜索与操作
  const [distributionSearch, setDistributionSearch] = useState("");
  const [showDistAdvSearch, setShowDistAdvSearch] = useState(false);
  const [distAdvSearch, setDistAdvSearch] = useState({ distributionNumber: "", shipmentNumber: "", companyName: "", status: "", distributionType: "", supplierName: "", distributeDate: "" });
  const [cancelDistId, setCancelDistId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; title: string; reason: string } | null>(null);
  const [cancelDistReason, setCancelDistReason] = useState("");
  const [expandedDistId, setExpandedDistId] = useState<string | null>(null);
  const [showDistModeForId, setShowDistModeForId] = useState<string | null>(null); // 配送操作步骤控制
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const [distributeModal, setDistributeModal] = useState<{ shipmentNumber: string; type: "logistics" | "express" | "company" } | null>(null);
  const [distributeForm, setDistributeForm] = useState({
    logisticsCompany: "", logisticsNumber: "", logisticsDriverName: "", logisticsDriverId: "", logisticsDriverPhone: "",
    expressCompany: "", expressNumber: "",
    companyDriverName: "", companyDriverId: "", companyDriverPhone: "",
  });
  const [completeConfirmId, setCompleteConfirmId] = useState<string | null>(null);
  const [failConfirmId, setFailConfirmId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");
  // 收货公司本地编辑数据（收货人、收货电话、收货地址用于送货单，不同步到客户管理）
  const [companyLocalData, setCompanyLocalData] = useState<Record<string, { contact?: string; phone?: string; address?: string }>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("companyLocalData");
        return saved ? JSON.parse(saved) : {};
      } catch { return {}; }
    }
    return {};
  });

  // 保存companyLocalData到localStorage
  const updateCompanyLocalData = (updater: (prev: Record<string, { contact?: string; phone?: string; address?: string }>) => Record<string, { contact?: string; phone?: string; address?: string }>) => {
    setCompanyLocalData((prev) => {
      const newData = updater(prev);
      try { localStorage.setItem("companyLocalData", JSON.stringify(newData)); } catch {}
      return newData;
    });
  };
  
  // 编辑状态 - 送货单编辑
  const [deliveryEditModal, setDeliveryEditModal] = useState<DeliveryNote | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // 送货单筛选
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("all");
  const [showDeliveryAdvSearch, setShowDeliveryAdvSearch] = useState(false);
  const [deliveryAdvSearch, setDeliveryAdvSearch] = useState({ noteNumber: "", supplierName: "", companyName: "", deliveryDate: "", status: "all" });
  
  // 打印相关
  const printRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const s = localStorage.getItem(STORAGE_KEYS.suppliers);
        const c = localStorage.getItem(STORAGE_KEYS.companies);
        const d = localStorage.getItem(STORAGE_KEYS.deliveryNotes);
        const l = localStorage.getItem(STORAGE_KEYS.materialLabels);
        
        setSuppliers(s ? JSON.parse(s) : []);
        setCompanies(c ? JSON.parse(c) : []);
        setDeliveryNotes(d ? JSON.parse(d) : []);
        // 加载物料标签时去重（防止历史重复ID）
        const loadedLabels: MaterialLabel[] = l ? JSON.parse(l) : [];
        const seenIds = new Set<string>();
        const uniqueLabels = loadedLabels.filter((label: MaterialLabel) => {
          if (seenIds.has(label.id)) return false;
          seenIds.add(label.id);
          return true;
        });
        setMaterialLabels(uniqueLabels);
        // 加载发货单和配送单
        const sh = localStorage.getItem(STORAGE_KEYS.shipmentOrders);
        const di = localStorage.getItem(STORAGE_KEYS.distributionOrders);
        setShipmentOrders(sh ? JSON.parse(sh) : []);
        setDistributionOrders(di ? JSON.parse(di) : []);

        // 从产品管理API获取产品数据
        try {
          const response = await fetch("/api/products");
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              // 将API产品数据转换为送货管理需要的格式
              const apiProducts: Product[] = result.data.map((p: Record<string, unknown>) => ({
                id: p.id as string,
                materialCode: (p.materialCode as string) || "",
                projectName: (p.projectName as string) || "",
                specification: (p.specification as string) || "",
                description: (p.description as string) || "",
                unit: (p.unit as string) || "个",
                status: (p.status as string) || "active",
              }));
              setExternalProducts(apiProducts);
            }
          }
        } catch (err) {
          console.error("Failed to load products from API", err);
        }

        // 从客户管理API获取收货公司数据
        try {
          const custResponse = await fetch("/api/customers?status=active");
          if (custResponse.ok) {
            const custResult = await custResponse.json();
            if (custResult.success && custResult.data) {
              const custData: Company[] = custResult.data.map((c: Record<string, unknown>) => ({
                id: c.id as string,
                name: (c.customerName as string) || "",
                customerName: (c.customerName as string) || "",
                customerCode: (c.customerCode as string) || "",
                address: (c.address as string) || "",
                contact: (c.contact as string) || "",
                phone: (c.phone as string) || "",
                createTime: (c.createdAt as string) || "",
              }));
              setCustomers(custData);
              // 同步更新companies状态，确保送货单等模块可以获取收货公司数据
              setCompanies(custData);
            }
          }
        } catch (err) {
          console.error("Failed to load customers from API", err);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    loadData();
  }, []);

  // 保存数据
  const saveData = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
      localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(companies));
      localStorage.setItem(STORAGE_KEYS.deliveryNotes, JSON.stringify(deliveryNotes));
      localStorage.setItem(STORAGE_KEYS.materialLabels, JSON.stringify(materialLabels));
      localStorage.setItem(STORAGE_KEYS.shipmentOrders, JSON.stringify(shipmentOrders));
      localStorage.setItem(STORAGE_KEYS.distributionOrders, JSON.stringify(distributionOrders));
    } catch (e) {
      console.error("Failed to save data", e);
    }
  }, [suppliers, companies, deliveryNotes, materialLabels, shipmentOrders, distributionOrders]);

  useEffect(() => {
    if (suppliers.length > 0 || companies.length > 0 || deliveryNotes.length > 0 || materialLabels.length > 0) {
      saveData();
    }
  }, [suppliers, companies, deliveryNotes, materialLabels, saveData]);

  // 显示消息
  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // ========== 基础资料管理 ==========
  // 供应商管理
  const handleAddSupplier = () => {
    const newSupplier: Supplier = {
      id: generateId("SUP"),
      name: "",
      englishName: "",
      shortName: "",
      contact: "",
      phone: "",
      createTime: formatDate(),
    };
    setSuppliers((prev) => [...prev, newSupplier]);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    const name = prompt("请输入供应商名称:", supplier.name);
    if (name !== null && name.trim()) {
      const englishName = prompt("请输入英文名称:", supplier.englishName || "");
      const shortName = prompt("请输入缩写:", supplier.shortName || "");
      const contact = prompt("请输入联系人:", supplier.contact || "");
      const phone = prompt("请输入电话:", supplier.phone || "");
      
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === supplier.id
            ? { ...s, name: name.trim(), englishName: englishName?.trim() || "", shortName: shortName?.trim() || "", contact: contact?.trim() || "", phone: phone?.trim() || "" }
            : s
        )
      );
      showMessage("保存成功", "success");
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm("确定要删除这个供应商吗?")) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      showMessage("删除成功", "success");
    }
  };

  // 收货公司管理
  const handleAddCompany = () => {
    const newCompany: Company = {
      id: generateId("COM"),
      name: "",
      address: "",
      contact: "",
      phone: "",
      createTime: formatDate(),
    };
    setCompanies((prev) => [...prev, newCompany]);
  };

  const handleEditCompany = (company: Company) => {
    const name = prompt("请输入公司名称:", company.name);
    if (name !== null && name.trim()) {
      const address = prompt("请输入地址:", company.address || "");
      const contact = prompt("请输入联系人:", company.contact || "");
      const phone = prompt("请输入电话:", company.phone || "");
      
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === company.id
            ? { ...c, name: name.trim(), address: address?.trim() || "", contact: contact?.trim() || "", phone: phone?.trim() || "" }
            : c
        )
      );
      showMessage("保存成功", "success");
    }
  };

  const handleDeleteCompany = (id: string) => {
    if (confirm("确定要删除这个收货公司吗?")) {
      setCompanies((prev) => prev.filter((c) => c.id !== id));
      showMessage("删除成功", "success");
    }
  };

  // ========== 送货单管理 ==========
  const handleAddDeliveryNote = () => {
    if (suppliers.length === 0) {
      showMessage("请先添加供应商", "error");
      return;
    }
    if (companies.length === 0) {
      showMessage("请先添加收货公司", "error");
      return;
    }
    if (externalProducts.length === 0) {
      showMessage("产品管理中暂无产品，请先在产品管理中添加", "error");
      return;
    }
    
    const firstSupplier = suppliers[0];
    const firstCompany = companies[0];
    const firstCompanyLocal = companyLocalData[firstCompany?.id || ""];
    const newNote: DeliveryNote = {
      id: generateId("DN"),
      noteNumber: `DN${Date.now()}`,
      supplierId: firstSupplier?.id || "",
      supplierName: firstSupplier?.name || "",
      companyId: firstCompany?.id || "",
      companyName: firstCompany?.name || firstCompany?.customerName || "",
      deliveryDate: new Date().toISOString().split("T")[0],
      items: [],
      status: "pending",
      createTime: formatDate(),
      receiver: firstCompanyLocal?.contact || firstCompany?.contact || "",
      contactPhone: firstCompanyLocal?.phone || firstCompany?.phone || "",
      deliveryAddress: firstCompanyLocal?.address || firstCompany?.address || "",
    };
    setDeliveryEditModal(newNote);
  };

  const handleEditDeliveryNote = (note: DeliveryNote) => {
    if (note.status === "completed") {
      showMessage("已完成的送货单不允许修改", "error");
      return;
    }
    const shipment = shipmentOrders.find(s => s.deliveryNoteId === note.id);
    if (shipment && ["shipped", "in_distribution"].includes(shipment.status)) {
      showMessage("该送货单正在发货/配送中，不允许修改", "error");
      return;
    }
    if (note.status === "in_transit") {
      showMessage("配送中的送货单不允许修改", "error");
      return;
    }
    setDeliveryEditModal({ ...note });
  };

  const handleSaveDeliveryNote = (note: DeliveryNote) => {
    const existingIndex = deliveryNotes.findIndex((n) => n.id === note.id);
    if (existingIndex >= 0) {
      setDeliveryNotes((prev) =>
        prev.map((n, i) => (i === existingIndex ? note : n))
      );
    } else {
      setDeliveryNotes((prev) => [...prev, note]);
      // 新建送货单时自动生成发货单
      autoCreateShipmentOrder(note);
    }
    setDeliveryEditModal(null);
    showMessage("保存成功", "success");
  };

  const handleDeleteDeliveryNote = (id: string) => {
    const note = deliveryNotes.find(n => n.id === id);
    if (!note) return;
    if (note.status === "completed") {
      setDeleteWarning({ id, title: "无法删除送货单", reason: "已完成的送货单不允许删除，送货单流程已结束" });
      return;
    }
    const shipment = shipmentOrders.find(s => s.deliveryNoteId === id);
    if (shipment && ["shipped", "in_distribution"].includes(shipment.status)) {
      const statusText = shipment.status === "shipped" ? "已发货" : "配送中";
      setDeleteWarning({ id, title: "无法删除送货单", reason: `该送货单正在${statusText}流程中，不允许删除。请先取消发货或配送后再操作` });
      return;
    }
    if (note.status === "in_transit") {
      setDeleteWarning({ id, title: "无法删除送货单", reason: "配送中的送货单不允许删除，请先取消配送后再操作" });
      return;
    }
    if (confirm("确定要删除此送货单吗？")) {
      setDeliveryNotes((prev) => prev.filter((n) => n.id !== id));
      showMessage("删除成功", "success");
    }
  };

  // ========== 发货/配送业务逻辑 ==========

  // 送货单保存时，自动生成发货单
  const autoCreateShipmentOrder = (note: DeliveryNote) => {
    const existing = shipmentOrders.find(s => s.deliveryNoteId === note.id);
    if (!existing) {
      const newShipment: ShipmentOrder = {
        id: generateId("SH"),
        shipmentNumber: note.noteNumber,
        deliveryNoteId: note.id,
        deliveryNoteNumber: note.noteNumber,
        supplierName: note.supplierName,
        companyName: note.companyName,
        status: "pending_ship",
        createTime: new Date().toISOString(),
      };
      setShipmentOrders(prev => [...prev, newShipment]);
    }
  };

  // 发货确认
  const handleConfirmShipment = (shipmentId: string) => {
    // 校验送货日期：如果送货日期 > 当前日期+24小时，不允许发货
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (shipment) {
      const note = deliveryNotes.find(n => n.id === shipment.deliveryNoteId);
      if (note) {
        const deliveryDateEnd = new Date(note.deliveryDate + "T24:00:00");
        const nowPlus24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (deliveryDateEnd > nowPlus24h) {
          showMessage("送货日期超过当前时间24小时，不允许发货", "error");
          return;
        }
      }
    }
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "shipped" as const, shipTime: new Date().toISOString(), shipOperator: currentUserName || "未知" };
      }
      return s;
    }));
    // 更新送货单状态
    if (shipment) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === shipment.deliveryNoteId) {
          return { ...n, status: "in_transit" as const };
        }
        return n;
      }));
    }
    setShipmentConfirmId(null);
    showMessage("发货确认成功", "success");
  };

  // 发货完成后自动创建配送单
  const handleShippedAndCreateDistribution = (shipmentId: string) => {
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (!shipment) return;
    // 更新发货单状态
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "shipped" as const, shipTime: new Date().toISOString(), shipOperator: currentUserName || "未知" };
      }
      return s;
    }));
    // 更新送货单状态
    setDeliveryNotes(prev => prev.map(n => {
      if (n.id === shipment.deliveryNoteId) {
        return { ...n, status: "in_transit" as const };
      }
      return n;
    }));
    // 创建配送单
    const note = deliveryNotes.find(n => n.id === shipment.deliveryNoteId);
    const existingDist = distributionOrders.find(d => d.shipmentId === shipmentId);
    if (!existingDist) {
      const newDist: DistributionOrder = {
        id: generateId("DS"),
        distributionNumber: `DS${Date.now()}${Math.floor(Math.random() * 1000)}`,
        shipmentId: shipmentId,
        shipmentNumber: shipment.shipmentNumber,
        deliveryNoteId: shipment.deliveryNoteId,
        supplierName: shipment.supplierName,
        companyName: shipment.companyName,
        deliveryAddress: note?.deliveryAddress,
        receiver: note?.receiver,
        receiverPhone: note?.contactPhone,
        distributionType: "logistics",
        status: "pending_distribute",
        createTime: new Date().toISOString(),
      };
      setDistributionOrders(prev => [...prev, newDist]);
    }
    setShipmentConfirmId(null);
    showMessage("发货确认成功，已自动创建配送单", "success");
  };

  // 配送确认（选择配送方式并填写信息）
  const handleConfirmDistribution = () => {
    if (!distributeModal) return;
    const { shipmentNumber, type } = distributeModal;
    const dist = distributionOrders.find(d => d.shipmentNumber === shipmentNumber && d.status === "pending_distribute");
    if (!dist) return;

    setDistributionOrders(prev => prev.map(d => {
      if (d.id === dist.id) {
        const base = {
          ...d,
          distributionType: type,
          status: "in_distribution" as const,
          distributeTime: new Date().toISOString(),
          distributor: currentUserName || "未知",
        };
        if (type === "logistics") {
          return { ...base, logisticsCompany: distributeForm.logisticsCompany, logisticsNumber: distributeForm.logisticsNumber, logisticsDriverName: distributeForm.logisticsDriverName, logisticsDriverId: distributeForm.logisticsDriverId, logisticsDriverPhone: distributeForm.logisticsDriverPhone };
        } else if (type === "express") {
          return { ...base, expressCompany: distributeForm.expressCompany, expressNumber: distributeForm.expressNumber };
        } else {
          return { ...base, companyDriverName: distributeForm.companyDriverName, companyDriverId: distributeForm.companyDriverId, companyDriverPhone: distributeForm.companyDriverPhone };
        }
      }
      return d;
    }));

    // 更新发货单状态
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === dist.shipmentId) {
        return { ...s, status: "in_distribution" as const };
      }
      return s;
    }));
    // 更新送货单状态
    setDeliveryNotes(prev => prev.map(n => {
      if (n.id === dist.deliveryNoteId) {
        return { ...n, status: "in_transit" as const };
      }
      return n;
    }));

    setDistributeModal(null);
    setDistributeForm({ logisticsCompany: "", logisticsNumber: "", logisticsDriverName: "", logisticsDriverId: "", logisticsDriverPhone: "", expressCompany: "", expressNumber: "", companyDriverName: "", companyDriverId: "", companyDriverPhone: "" });
    showMessage("配送确认成功，状态已更新为配送中", "success");
  };

  // 配送完成
  const handleDistributionComplete = (distId: string) => {
    setDistributionOrders(prev => prev.map(d => {
      if (d.id === distId) {
        return { ...d, status: "delivered" as const, completeTime: new Date().toISOString() };
      }
      return d;
    }));
    // 更新发货单状态
    const dist = distributionOrders.find(d => d.id === distId);
    if (dist) {
      setShipmentOrders(prev => prev.map(s => {
        if (s.id === dist.shipmentId) {
          return { ...s, status: "delivered" as const };
        }
        return s;
      }));
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === dist.deliveryNoteId) {
          return { ...n, status: "delivered" as const };
        }
        return n;
      }));
    }
    setCompleteConfirmId(null);
    showMessage("配送完成，状态已更新为已送达", "success");
  };

  // 配送失败
  const handleDistributionFailed = (distId: string) => {
    setDistributionOrders(prev => prev.map(d => {
      if (d.id === distId) {
        const failureRecord = { time: new Date().toISOString(), reason: failReason || "配送失败", type: "配送失败" };
        return { ...d, status: "failed" as const, failReason: failReason || "配送失败", completeTime: new Date().toISOString(), failureHistory: [...(d.failureHistory || []), failureRecord] };
      }
      return d;
    }));
    const dist = distributionOrders.find(d => d.id === distId);
    if (dist) {
      setShipmentOrders(prev => prev.map(s => {
        if (s.id === dist.shipmentId) {
          const failureRecord = { time: new Date().toISOString(), reason: failReason || "配送失败", type: "配送失败" };
          return { ...s, status: "cancelled" as const, failureHistory: [...(s.failureHistory || []), failureRecord] };
        }
        return s;
      }));
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === dist.deliveryNoteId) {
          return { ...n, status: "cancelled" as const };
        }
        return n;
      }));
    }
    setFailConfirmId(null);
    setFailReason("");
    showMessage("已标记为配送失败", "success");
  };

  // 发货员确认"已送达" → 标记"已完成"
  const handleMarkCompleted = (shipmentId: string) => {
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "completed" as const };
      }
      return s;
    }));
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (shipment) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === shipment.deliveryNoteId) {
          return { ...n, status: "completed" as const };
        }
        return n;
      }));
    }
    showMessage("已标记为已完成", "success");
  };

  // 发货员确认"配送失败" → 标记"取消"
  const handleMarkCancelled = (shipmentId: string) => {
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "cancelled" as const };
      }
      return s;
    }));
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (shipment) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === shipment.deliveryNoteId) {
          return { ...n, status: "cancelled" as const };
        }
        return n;
      }));
    }
    showMessage("已标记为取消", "success");
  };

  // "取消"后重新发起配送
  const handleRedistribute = (shipmentId: string) => {
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (!shipment) return;
    // 更新发货单状态为已发货
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "shipped" as const };
      }
      return s;
    }));
    // 更新送货单状态
    setDeliveryNotes(prev => prev.map(n => {
      if (n.id === shipment.deliveryNoteId) {
        return { ...n, status: "in_transit" as const };
      }
      return n;
    }));
    // 创建新配送单
    const note = deliveryNotes.find(n => n.id === shipment.deliveryNoteId);
    const newDist: DistributionOrder = {
      id: generateId("DS"),
      distributionNumber: `DS${Date.now()}${Math.floor(Math.random() * 1000)}`,
      shipmentId: shipmentId,
      shipmentNumber: shipment.shipmentNumber,
      deliveryNoteId: shipment.deliveryNoteId,
      supplierName: shipment.supplierName,
      companyName: shipment.companyName,
      deliveryAddress: note?.deliveryAddress,
      receiver: note?.receiver,
      receiverPhone: note?.contactPhone,
      distributionType: "logistics",
      status: "pending_distribute",
      createTime: new Date().toISOString(),
    };
    setDistributionOrders(prev => [...prev, newDist]);
    showMessage("已重新发起配送", "success");
  };

  // ========== 取消发货（13） ==========

  const handleCancelShipment = (shipmentId: string) => {
    if (!cancelShipmentReason.trim()) {
      showMessage("请输入取消原因", "error");
      return;
    }
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        const failureRecord = { time: new Date().toISOString(), reason: cancelShipmentReason, type: "取消发货" };
        return { ...s, status: "pending_ship" as const, cancelReason: cancelShipmentReason, shipTime: undefined, failureHistory: [...(s.failureHistory || []), failureRecord] };
      }
      return s;
    }));
    // 删除关联的配送单
    setDistributionOrders(prev => prev.filter(d => d.shipmentId !== shipmentId));
    // 恢复送货单状态
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (shipment) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === shipment.deliveryNoteId) {
          return { ...n, status: "pending" as const };
        }
        return n;
      }));
    }
    setCancelShipmentId(null);
    setCancelShipmentReason("");
    showMessage("已取消发货，发货单退回待发货状态", "success");
  };

  // ========== 取消配送（14） ==========

  const handleCancelDistribution = (distId: string) => {
    if (!cancelDistReason.trim()) {
      showMessage("请输入取消原因", "error");
      return;
    }
    const dist = distributionOrders.find(d => d.id === distId);
    if (!dist) return;
    // 更新配送单状态
    setDistributionOrders(prev => prev.map(d => {
      if (d.id === distId) {
        const failureRecord = { time: new Date().toISOString(), reason: cancelDistReason, type: "取消配送" };
        return { ...d, status: "failed" as const, cancelReason: cancelDistReason, completeTime: new Date().toISOString(), failureHistory: [...(d.failureHistory || []), failureRecord] };
      }
      return d;
    }));
    // 发货单退回到已发货状态，并记录失败
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === dist.shipmentId) {
        const failureRecord = { time: new Date().toISOString(), reason: cancelDistReason, type: "配送取消" };
        return { ...s, status: "shipped" as const, failureHistory: [...(s.failureHistory || []), failureRecord] };
      }
      return s;
    }));
    // 送货单退回到发货中
    if (dist) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === dist.deliveryNoteId) {
          return { ...n, status: "in_transit" as const };
        }
        return n;
      }));
    }
    setCancelDistId(null);
    setCancelDistReason("");
    showMessage("已取消配送，送货单退回到发货环节", "success");
  };

  // ========== 上传回单（5） ==========

  const handleUploadReceipt = () => {
    if (!receiptFile || !uploadReceiptShipmentId) return;
    // 将文件转为 base64 存储（实际生产应上传到对象存储）
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const newReceipt = { name: receiptFile.name, url: base64, type: receiptFile.type, uploadedAt: new Date().toISOString() };
      setShipmentOrders(prev => prev.map(s => {
        if (s.id === uploadReceiptShipmentId) {
          return { ...s, receipt: [...(s.receipt || []), newReceipt] };
        }
        return s;
      }));
      setUploadReceiptShipmentId(null);
      setReceiptFile(null);
      showMessage("回单上传成功", "success");
    };
    reader.readAsDataURL(receiptFile);
  };

  // 发货员确认"已送达"时自动弹出回单上传（5）
  const handleMarkCompletedWithReceipt = (shipmentId: string) => {
    setUploadReceiptShipmentId(shipmentId);
  };

  const handleMarkCompletedConfirm = (shipmentId: string) => {
    // 标记已完成
    setShipmentOrders(prev => prev.map(s => {
      if (s.id === shipmentId) {
        return { ...s, status: "completed" as const };
      }
      return s;
    }));
    const shipment = shipmentOrders.find(s => s.id === shipmentId);
    if (shipment) {
      setDeliveryNotes(prev => prev.map(n => {
        if (n.id === shipment.deliveryNoteId) {
          return { ...n, status: "completed" as const };
        }
        return n;
      }));
    }
    // 如果有回单文件则上传
    if (receiptFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const newReceipt = { name: receiptFile.name, url: base64, type: receiptFile.type, uploadedAt: new Date().toISOString() };
        setShipmentOrders(prev => prev.map(s => {
          if (s.id === shipmentId) {
            return { ...s, receipt: [...(s.receipt || []), newReceipt] };
          }
          return s;
        }));
      };
      reader.readAsDataURL(receiptFile);
    }
    setUploadReceiptShipmentId(null);
    setReceiptFile(null);
    showMessage("已标记为已完成", "success");
  };

  // ========== 导出Excel（7,9） ==========
  const handleExportShipments = () => {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("发货单");
    ws.columns = [
      { header: "发货单号", key: "shipmentNumber", width: 20 },
      { header: "送货单号", key: "deliveryNoteNumber", width: 20 },
      { header: "供应商", key: "supplierName", width: 15 },
      { header: "收货公司", key: "companyName", width: 15 },
      { header: "状态", key: "status", width: 12 },
      { header: "发货时间", key: "shipTime", width: 20 },
      { header: "回单", key: "receipt", width: 10 },
      { header: "取消原因", key: "cancelReason", width: 20 },
    ];
    const statusLabels: Record<string, string> = { pending_ship: "待发货", shipped: "已发货", in_distribution: "配送中", delivered: "已送达", completed: "已完成", cancelled: "已取消" };
    shipmentOrders.forEach(s => {
      ws.addRow({ ...s, status: statusLabels[s.status] || s.status, receipt: s.receipt ? "已上传" : "-", shipTime: s.shipTime ? new Date(s.shipTime).toLocaleString("zh-CN") : "-" });
    });
    workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `发货单_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleExportDistributions = () => {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("配送单");
    ws.columns = [
      { header: "配送单号", key: "distributionNumber", width: 20 },
      { header: "发货单号", key: "shipmentNumber", width: 20 },
      { header: "供应商", key: "supplierName", width: 15 },
      { header: "收货公司", key: "companyName", width: 15 },
      { header: "配送方式", key: "distributionType", width: 12 },
      { header: "状态", key: "status", width: 12 },
      { header: "配送时间", key: "distributeTime", width: 20 },
      { header: "取消原因", key: "cancelReason", width: 20 },
    ];
    const statusLabels: Record<string, string> = { pending_distribute: "待配送", in_distribution: "配送中", delivered: "已送达", failed: "配送失败" };
    const typeLabels: Record<string, string> = { logistics: "物流配送", express: "快递", company: "公司配送" };
    distributionOrders.forEach(d => {
      ws.addRow({ ...d, status: statusLabels[d.status] || d.status, distributionType: typeLabels[d.distributionType] || "-", distributeTime: d.distributeTime ? new Date(d.distributeTime).toLocaleString("zh-CN") : "-" });
    });
    workbook.xlsx.writeBuffer().then((buffer: ArrayBuffer) => {
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `配送单_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleSearchProducts = (query: string) => {
    setProductSearchQuery(query);
    if (query.trim().length === 0) {
      setProductSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = externalProducts.filter(
      (p: { materialCode?: string; projectName?: string; specification?: string }) =>
        (p.materialCode || "").toLowerCase().includes(q) ||
        (p.projectName || "").toLowerCase().includes(q) ||
        (p.specification || "").toLowerCase().includes(q)
    ).slice(0, 10);
    setProductSearchResults(results);
  };

  const handleSelectProductForLabel = (product: { id: string; materialCode: string; projectName: string; specification?: string; unit: string }) => {
    setNewLabelForm(prev => ({
      ...prev,
      productCode: product.materialCode || "",
      productName: product.projectName || "",
      unit: product.unit || "个",
    }));
    setProductSearchQuery("");
    setProductSearchResults([]);
  };

  const handleSaveNewLabel = () => {
    if (!newLabelForm.supplierId || !newLabelForm.productCode) {
      showMessage("请填写供应商和物料编码", "error");
      return;
    }
    const supplier = suppliers.find(s => s.id === newLabelForm.supplierId);
    const company = companies.length > 0 ? companies[0] : null;
    const labelId = `LBL${Date.now()}`;
    const newLabel: MaterialLabel = {
      id: labelId,
      labelCode: labelId,
      supplierId: newLabelForm.supplierId,
      supplierName: supplier?.name || "",
      companyName: company?.name || company?.customerName || "",
      productId: newLabelForm.productCode,
      productCode: newLabelForm.productCode,
      productName: newLabelForm.productName,
      purchaseOrder: newLabelForm.purchaseOrder,
      quantity: newLabelForm.quantity,
      unit: newLabelForm.unit,
      receiveDate: newLabelForm.receiveDate,
      createTime: new Date().toISOString().split("T")[0],
    };
    setMaterialLabels(prev => [...prev, newLabel]);
    setNewLabelModal(false);
    setNewLabelForm({ labelCode: "", supplierId: "", supplierName: "", productCode: "", productName: "", quantity: "1", unit: "个", purchaseOrder: "", receiveDate: new Date().toISOString().split("T")[0], companyName: "" });
    showMessage("物料标签创建成功", "success");
  };

  // ========== 物料标签管理 ==========
  // 为单个送货单生成标签
  const handleGenerateLabelsForNote = (noteId: string) => {
    const note = deliveryNotes.find((n) => n.id === noteId);
    if (!note) {
      showMessage("未找到送货单", "error");
      return;
    }

    const newLabels: MaterialLabel[] = [];
    note.items.forEach((item) => {
      const supplier = suppliers.find((s) => s.id === note.supplierId);
      const customer = customers.find((c) => c.id === note.companyId);
      newLabels.push({
        id: generateId("LB"),
        labelCode: `LB${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        supplierId: note.supplierId,
        supplierName: supplier?.name || "",
        purchaseOrder: note.noteNumber,
        quantity: String(item.quantity),
        unit: item.unit || "个",
        receiveDate: note.deliveryDate,
        companyName: customer?.customerName || note.companyName || "",
        createTime: formatDate(),
      });
    });

    if (newLabels.length === 0) {
      showMessage("该送货单没有产品", "error");
      return;
    }

    setMaterialLabels((prev) => [...prev, ...newLabels]);
    showMessage(`成功为送货单 ${note.noteNumber} 生成 ${newLabels.length} 个标签`, "success");
    setActiveTab("label");
  };

  // 获取未生成标签的送货单
  const getDeliveryNotesWithoutLabels = () => {
    // 显示所有送货单，已生成全部标签的除外
    return deliveryNotes.filter((note) => {
      // 检查该送货单是否所有产品都已有标签
      const allItemsHaveLabels = note.items.every((item) => {
        return materialLabels.some(
          (label) => label.productId === item.productId && label.supplierId === note.supplierId && label.purchaseOrder === note.noteNumber
        );
      });
      return !allItemsHaveLabels && note.items.length > 0;
    });
  };

  const handleGenerateLabelsFromSelectedNote = (noteId: string) => {
    const note = deliveryNotes.find((n) => n.id === noteId);
    if (!note) return;

    const newLabels: MaterialLabel[] = [];
    note.items.forEach((item) => {
      // 检查该产品是否已经有标签（同一送货单+同一供应商+同一产品）
      const alreadyExists = materialLabels.some(
        (label) => label.productId === item.productId && label.supplierId === note.supplierId && label.purchaseOrder === note.noteNumber
      );
      if (alreadyExists) return;

      const supplier = suppliers.find((s) => s.id === note.supplierId);
      const customer = customers.find((c) => c.id === note.companyId);
      newLabels.push({
        id: generateId("LB"),
        labelCode: `LB${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        supplierId: note.supplierId,
        supplierName: supplier?.name || "",
        purchaseOrder: note.noteNumber,
        quantity: String(item.quantity),
        unit: item.unit || "个",
        receiveDate: note.deliveryDate,
        companyName: customer?.customerName || note.companyName || "",
        createTime: formatDate(),
      });
    });

    if (newLabels.length === 0) {
      showMessage("该送货单的所有产品已生成标签", "error");
      return;
    }

    setMaterialLabels((prev) => [...prev, ...newLabels]);
    showMessage(`成功生成 ${newLabels.length} 个标签`, "success");
    setActiveTab("label");
  };

  // 为所有送货单生成标签
  const handleGenerateLabels = () => {
    if (deliveryNotes.length === 0) {
      showMessage("没有可生成标签的送货单", "error");
      return;
    }

    const newLabels: MaterialLabel[] = [];
    deliveryNotes.forEach((note) => {
      const customer = customers.find((c) => c.id === note.companyId);
      note.items.forEach((item) => {
        const supplier = suppliers.find((s) => s.id === note.supplierId);
        newLabels.push({
          id: generateId("LB"),
          labelCode: `LB${Date.now()}${Math.random().toString(36).substr(2, 4)}`,
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          supplierId: note.supplierId,
          supplierName: supplier?.name || "",
          purchaseOrder: note.noteNumber,
          quantity: String(item.quantity),
          unit: item.unit || "个",
          receiveDate: note.deliveryDate,
          companyName: customer?.customerName || note.companyName || "",
          createTime: formatDate(),
        });
      });
    });

    setMaterialLabels((prev) => [...prev, ...newLabels]);
    showMessage(`成功生成 ${newLabels.length} 个标签`, "success");
  };

  // 基础资料保存函数
  const handleSaveBasic = (data: Record<string, string>) => {
    if (basicEditModal?.type === "supplier") {
      if (basicEditModal.item) {
        // 编辑供应商
        setSuppliers((prev) =>
          prev.map((s) => (s.id === basicEditModal.item!.id ? { ...s, ...data, updateTime: new Date().toISOString().slice(0, 10) } : s))
        );
        showMessage("供应商更新成功", "success");
      } else {
        // 新增供应商
        const newSupplier: Supplier = {
          id: `sup_${Date.now()}`,
          ...data,
          createTime: new Date().toISOString().slice(0, 10),
        } as Supplier;
        setSuppliers((prev) => [...prev, newSupplier]);
        showMessage("供应商添加成功", "success");
      }
    } else if (basicEditModal?.type === "company") {
      if (basicEditModal.item) {
        // 编辑收货公司 - 更新customers状态（因为收货公司数据来自客户管理）
        setCustomers((prev) =>
          prev.map((c) => (c.id === basicEditModal.item!.id ? { ...c, ...data, updateTime: new Date().toISOString().slice(0, 10) } : c))
        );
        // 同时更新收货公司本地数据（收货人、收货电话、收货地址）
        updateCompanyLocalData((prev) => ({
          ...prev,
          [basicEditModal.item!.id]: {
            contact: data.contact ?? prev[basicEditModal.item!.id]?.contact ?? "",
            phone: data.phone ?? prev[basicEditModal.item!.id]?.phone ?? "",
            address: data.address ?? prev[basicEditModal.item!.id]?.address ?? "",
          }
        }));
        showMessage("收货公司更新成功", "success");
      } else {
        // 新增收货公司 - 同时添加到companies和customers
        const newCompany: Company = {
          id: `comp_${Date.now()}`,
          ...data,
          createTime: new Date().toISOString().slice(0, 10),
        } as Company;
        setCompanies((prev) => [...prev, newCompany]);
        setCustomers((prev) => [...prev, newCompany]);
        showMessage("收货公司添加成功", "success");
      }
    }
    setBasicEditModal(null);
  };

  // ========== 物料标签打印 (6个标签/A4) ==========
  const handlePrintLabels = (labelIds?: string[]) => {
    const idsToPrint = labelIds || Array.from(selectedLabels);
    const labelsToPrint = materialLabels.filter((l) => idsToPrint.includes(l.id));
    if (labelsToPrint.length === 0) {
      showMessage("请选择要打印的标签", "error");
      return;
    }

    // 分页: 每页6个标签 (2行x3列)
    const LABELS_PER_PAGE = 6;
    const pages: typeof labelsToPrint[] = [];
    for (let i = 0; i < labelsToPrint.length; i += LABELS_PER_PAGE) {
      pages.push(labelsToPrint.slice(i, i + LABELS_PER_PAGE));
    }

    const pagesHtml = pages
      .map((pageLabels) => {
        const labelsHtml = pageLabels
          .map(
            (label) => `
        <div class="label-card" style="border: 2px solid #333; break-inside: avoid; overflow: hidden;">
          <div class="label-company" style="background: #f0f0f0; border-bottom: 2px solid #333; padding: 4px 8px; text-align: center; font-weight: bold; font-size: 13px;">
            ${escapeHtml(label.companyName || '收货公司')}
          </div>
          <div style="padding: 6px 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap; width: 70px;">供应商：</td><td style="padding: 2px 0;">${escapeHtml(label.supplierName)}</td></tr>
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap;">采购订单：</td><td style="padding: 2px 0;">${escapeHtml(label.purchaseOrder || '-')}</td></tr>
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap;">物料编码：</td><td style="padding: 2px 0; font-family: monospace;">${escapeHtml(label.productCode)}</td></tr>
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap;">物料名称：</td><td style="padding: 2px 0;">${escapeHtml(label.productName)}</td></tr>
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap;">数量/单位：</td><td style="padding: 2px 0;">${escapeHtml(String(label.quantity || '-'))}${label.unit ? ' / ' + escapeHtml(label.unit) : ''}</td></tr>
              <tr><td style="padding: 2px 4px 2px 0; font-weight: bold; white-space: nowrap;">来料日期：</td><td style="padding: 2px 0;">${escapeHtml(label.receiveDate || '-')}</td></tr>
            </table>
          </div>
          <div style="border-top: 1px solid #333; padding: 4px 8px; text-align: center;">
            <svg id="barcode-${label.productCode}"></svg>
            <div style="font-size: 10px; font-family: monospace; margin-top: 2px;">${escapeHtml(label.productCode)}</div>
          </div>
        </div>
      `
          )
          .join("");
        return `<div class="page" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px; page-break-inside: avoid;">${labelsHtml}</div>`;
      })
      .join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>物料标签打印</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Microsoft YaHei', sans-serif; }
          .page { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10mm; padding: 10mm; page-break-inside: avoid; }
          .label-card { border: 2px solid #333; break-inside: avoid; overflow: hidden; }
          .label-company { background: #f0f0f0; border-bottom: 2px solid #333; padding: 4px 8px; text-align: center; font-weight: bold; font-size: 13px; }
          @media print {
            @page { size: A4 portrait; margin: 5mm; }
            body { padding: 0; }
            .page { page-break-inside: avoid; break-inside: avoid; }
            .label-card { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      </head>
      <body>
        ${pagesHtml}
        <script>window.onload = function() {
          try {
            document.querySelectorAll('svg[id^="barcode-"]').forEach(function(svg) {
              var code = svg.id.replace('barcode-', '');
              if (code) JsBarcode(svg, code, { format: "CODE128", width: 1.2, height: 35, displayValue: false, margin: 2 });
            });
          } catch(e) {}
          window.print();
        }<\/script>
      </body>
      </html>
    `);
      printWindow.document.close();
    }
  };

  const handleDeleteLabel = (id: string) => {
    if (confirm("确定要删除此标签吗？")) {
      setMaterialLabels((prev) => prev.filter((l) => l.id !== id));
      showMessage("删除成功", "success");
    }
  };

  const handleDeleteAllLabels = () => {
    if (confirm("确定要删除所有标签吗？")) {
      setMaterialLabels([]);
      showMessage("删除成功", "success");
    }
  };

  // ========== 送货单打印 ==========
  const handlePrintDeliveryNote = (note: DeliveryNote) => {
    const statusMap: Record<string, string> = {
      pending: "待发货",
      in_transit: "配送中",
      delivered: "已送达",
      completed: "已完成",
      cancelled: "已取消",
    };

    const itemsHtml = note.items
      .map(
        (item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace;">${escapeHtml(item.productCode)}</td>
        <td>${escapeHtml(item.productName)}</td>
        <td>${escapeHtml(item.specification || "")}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: center;">${item.unit || "个"}</td>
        <td>${escapeHtml(item.remarks || "")}</td>
      </tr>
    `
      )
      .join("");

    const supplier = suppliers.find((s) => s.id === note.supplierId);
    const supplierName = note.supplierName || supplier?.name || "";
    const supplierEnglishName = supplier?.englishName || "";
    const supplierLogo = supplier?.logo || "";
    const supplierInitial = supplierName ? supplierName.charAt(0) : "W";

    const company = companies.find((c) => c.id === note.companyId);
    const companyName = note.companyName || company?.name || company?.customerName || "";

    const logoHtml = supplierLogo
      ? `<img src="${supplierLogo}" style="width:50px;height:50px;object-fit:contain;border-radius:4px;" />`
      : `<div class="company-logo">${supplierInitial}</div>`;

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>送货单 - ${note.noteNumber}</title>
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; max-width: 1100px; margin: 0 auto; }
        .delivery-note { border: 2px solid #333; padding: 20px; }
        .delivery-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 10px; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .company-logo { width: 50px; height: 50px; background: linear-gradient(135deg, #1a3a5c, #2d5a8e); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .company-name { font-size: 18px; font-weight: bold; color: #1a3a5c; }
        .company-english { font-size: 12px; color: #666; margin-top: 2px; }
        .delivery-title { text-align: center; font-size: 24px; font-weight: bold; margin: 15px 0; letter-spacing: 10px; }
        .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .info-table td { border: 1px solid #333; padding: 8px; }
        .info-table td:first-child, .info-table td:nth-child(3) { background: #f5f5f5; width: 90px; font-weight: bold; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .detail-table th, .detail-table td { border: 1px solid #333; padding: 8px; }
        .detail-table th { background: #f0f0f0; text-align: center; }
        .signature-area { display: flex; justify-content: space-between; margin-top: 40px; }
        .signature-box { text-align: center; width: 150px; }
        .signature-box .label { margin-bottom: 60px; }
        @media print {
          body { padding: 0; }
          @page { size: A4 portrait; margin: 1.5cm; }
          .delivery-note { page-break-after: avoid; }
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
    </head>
    <body>
      <div class="delivery-note">
        <div class="delivery-header">
          <div class="header-left">
            ${logoHtml}
            <div>
              <div class="company-name">${escapeHtml(supplierName)}</div>
              <div class="company-english">${escapeHtml(supplierEnglishName)}</div>
            </div>
          </div>
          <div>
            <svg id="barcode-note"></svg>
          </div>
        </div>
        
        <div class="delivery-title">送 货 单</div>

        <table class="info-table">
          <tr>
            <td>收货公司</td>
            <td>${escapeHtml(companyName)}</td>
            <td>收货地址</td>
            <td>${escapeHtml(note.deliveryAddress || "-")}</td>
          </tr>
          <tr>
            <td>收货人</td>
            <td>${escapeHtml(note.receiver || "-")}</td>
            <td>收货电话</td>
            <td>${escapeHtml(note.contactPhone || "-")}</td>
          </tr>
          <tr>
            <td>送货日期</td>
            <td>${escapeHtml(note.deliveryDate)}</td>
            <td>备注</td>
            <td></td>
          </tr>
        </table>

        <table class="detail-table">
          <thead>
            <tr>
              <th style="width: 50px;">序号</th>
              <th>物料编码</th>
              <th>物料名称</th>
              <th>规格</th>
              <th style="width: 60px;">数量</th>
              <th style="width: 50px;">单位</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 20px;">
          <strong>备注:</strong> ${escapeHtml(note.remarks || "")}
        </div>

        <div class="signature-area">
          <div class="signature-box">
            <div class="label">送货人签名:</div>
            <div style="border-top: 1px solid #333; padding-top: 5px;"></div>
          </div>
          <div class="signature-box">
            <div class="label">收货人签名:</div>
            <div style="border-top: 1px solid #333; padding-top: 5px;"></div>
          </div>
          <div class="signature-box">
            <div class="label">仓管签名:</div>
            <div style="border-top: 1px solid #333; padding-top: 5px;"></div>
          </div>
        </div>
      </div>
      <script>window.onload = function() {
        try {
          JsBarcode("#barcode-note", "${note.noteNumber}", { format: "CODE128", width: 1.5, height: 50, displayValue: true, fontSize: 12, margin: 5 });
        } catch(e) {}
        window.print();
      }<\/script>
    </body>
    </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  // 筛选送货单
  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    const matchesSearch =
      deliveryFilter === "" ||
      note.noteNumber.toLowerCase().includes(deliveryFilter.toLowerCase()) ||
      suppliers.find((s) => s.id === note.supplierId)?.name.toLowerCase().includes(deliveryFilter.toLowerCase()) ||
      companies.find((c) => c.id === note.companyId)?.name.toLowerCase().includes(deliveryFilter.toLowerCase());
    
    const matchesStatus = deliveryStatusFilter === "all" || note.status === deliveryStatusFilter;

    // 高级查询
    const adv = deliveryAdvSearch;
    const advNoteNumber = adv.noteNumber === "" || note.noteNumber.toLowerCase().includes(adv.noteNumber.toLowerCase());
    const advSupplier = adv.supplierName === "" || (suppliers.find((s) => s.id === note.supplierId)?.name || "").toLowerCase().includes(adv.supplierName.toLowerCase()) || (note.supplierName || "").toLowerCase().includes(adv.supplierName.toLowerCase());
    const advCompany = adv.companyName === "" || (companies.find((c) => c.id === note.companyId)?.name || "").toLowerCase().includes(adv.companyName.toLowerCase()) || (note.companyName || "").toLowerCase().includes(adv.companyName.toLowerCase());
    const advDate = adv.deliveryDate === "" || note.deliveryDate === adv.deliveryDate;
    const advStatus = adv.status === "all" || note.status === adv.status;
    const matchesAdv = advNoteNumber && advSupplier && advCompany && advDate && advStatus;
    
    return matchesSearch && matchesStatus && matchesAdv;
  });

  // 导出送货单Excel
  const handleExportDeliveryNotes = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("送货单");
      worksheet.columns = [
        { header: "送货单号", key: "noteNumber", width: 18 },
        { header: "供应商", key: "supplierName", width: 16 },
        { header: "收货公司", key: "companyName", width: 16 },
        { header: "送货日期", key: "deliveryDate", width: 12 },
        { header: "物料项次", key: "itemCount", width: 10 },
        { header: "总数量", key: "totalQty", width: 10 },
        { header: "状态", key: "status", width: 10 },
        { header: "创建时间", key: "createdAt", width: 18 },
      ];
      filteredDeliveryNotes.forEach(note => {
        worksheet.addRow({
          noteNumber: note.noteNumber,
          supplierName: note.supplierName || suppliers.find(s => s.id === note.supplierId)?.name || "-",
          companyName: note.companyName || companies.find(c => c.id === note.companyId)?.name || "-",
          deliveryDate: note.deliveryDate,
          itemCount: note.items.length,
          totalQty: note.items.reduce((sum, item) => sum + item.quantity, 0),
          status: STATUS_MAP[note.status] || note.status,
          createdAt: note.createTime ? new Date(note.createTime).toLocaleString() : note.deliveryDate,
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `送货单_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showMessage("导出失败: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  // ========== 渲染 ==========
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* 头部统计 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-lg mb-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-xl font-bold">送货管理系统</h1>
          <div className="flex gap-4 flex-wrap">
            <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <div className="text-sm">供应商</div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
              <div className="text-2xl font-bold">{companies.length}</div>
              <div className="text-sm">收货公司</div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
              <div className="text-2xl font-bold">{deliveryNotes.length}</div>
              <div className="text-sm">送货单</div>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-lg text-center">
              <div className="text-2xl font-bold">{materialLabels.length}</div>
              <div className="text-sm">标签</div>
            </div>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div
          className={`p-3 rounded-lg mb-4 ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 标签页 */}
      <div className="flex border-b-2 border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "dashboard"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          送货看板
        </button>
        <button
          onClick={() => setActiveTab("delivery")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "delivery"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          送货单
        </button>
        <button
          onClick={() => setActiveTab("shipment")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "shipment"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          发货
        </button>
        <button
          onClick={() => setActiveTab("distribution")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "distribution"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          配送
        </button>
        <button
          onClick={() => setActiveTab("label")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "label"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          物料标签
        </button>
        <button
          onClick={() => setActiveTab("basic")}
          className={`px-6 py-3 text-base font-medium rounded-t-lg transition-all ${
            activeTab === "basic"
              ? "bg-indigo-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          基础资料
        </button>
      </div>

      {/* 内容区域 */}
      <div className="bg-white rounded-lg p-5 shadow-sm">
        {/* 送货看板 */}
        {activeTab === "dashboard" && <DeliveryDashboard deliveryNotes={deliveryNotes} materialLabels={materialLabels} suppliers={suppliers} companies={companies} shipments={shipmentOrders} distributions={distributionOrders} />}

        {/* 送货单 */}
        {activeTab === "delivery" && (
          <div>
            <div className="flex gap-4 mb-4 flex-wrap">
              <button
                onClick={handleAddDeliveryNote}
                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                + 新增送货单
              </button>
              <input
                type="text"
                placeholder="搜索送货单号、供应商、公司..."
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 flex-1 min-w-[200px]"
              />
              <select
                value={deliveryStatusFilter}
                onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="all">全部状态</option>
                <option value="pending">待发货</option>
                <option value="in_transit">配送中</option>
                <option value="delivered">已送达</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
              <button onClick={() => setShowDeliveryAdvSearch(!showDeliveryAdvSearch)} className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                高级查询
              </button>
              <button onClick={handleExportDeliveryNotes} className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                导出Excel
              </button>
            </div>
            {showDeliveryAdvSearch && (
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">送货单号</label><input value={deliveryAdvSearch.noteNumber} onChange={e => setDeliveryAdvSearch(prev => ({...prev, noteNumber: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="送货单号" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">供应商</label><input value={deliveryAdvSearch.supplierName} onChange={e => setDeliveryAdvSearch(prev => ({...prev, supplierName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="供应商名称" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">收货公司</label><input value={deliveryAdvSearch.companyName} onChange={e => setDeliveryAdvSearch(prev => ({...prev, companyName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="收货公司名称" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">送货日期</label><input type="date" value={deliveryAdvSearch.deliveryDate} onChange={e => setDeliveryAdvSearch(prev => ({...prev, deliveryDate: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">状态</label><select value={deliveryAdvSearch.status} onChange={e => setDeliveryAdvSearch(prev => ({...prev, status: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded"><option value="all">全部</option><option value="pending">待发货</option><option value="in_transit">配送中</option><option value="delivered">已送达</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select></div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setDeliveryAdvSearch({ noteNumber: "", supplierName: "", companyName: "", deliveryDate: "", status: "all" })} className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100">重置</button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">送货单号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">供应商</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">收货公司</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">送货日期</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">数量</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">回单</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">状态</th>
                    <th className="border border-gray-300 px-4 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveryNotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveryNotes.map((note) => {
                      const supplier = suppliers.find((s) => s.id === note.supplierId);
                      const company = companies.find((c) => c.id === note.companyId);
                      const statusMap: Record<string, { label: string; color: string }> = {
                        pending: { label: "待发货", color: "bg-yellow-100 text-yellow-800" },
                        in_transit: { label: "配送中", color: "bg-blue-100 text-blue-800" },
                        delivered: { label: "已送达", color: "bg-purple-100 text-purple-800" },
                        completed: { label: "已完成", color: "bg-green-100 text-green-800" },
                        cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800" },
                      };
                      const status = statusMap[note.status] || statusMap.pending;
                      return (
                        <tr key={note.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                            {note.noteNumber}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {supplier?.name || "-"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {company?.name || "-"}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">
                            {note.deliveryDate}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {note.items.reduce((sum, item) => sum + item.quantity, 0)}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            {(() => {
                              const ship = shipmentOrders.find(s => s.deliveryNoteId === note.id);
                              const receipt = ship?.receipt;
                              return (receipt && Array.isArray(receipt) && receipt.length > 0) ? (
                                <button onClick={() => setViewReceiptId(note.id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">查看 ({receipt.length})</button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              );
                            })()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${status.color}`}>
                              {status.label}
                            </span>
                            {(() => {
                              const ship = shipmentOrders.find(s => s.deliveryNoteId === note.id);
                              const dist = distributionOrders.find(d => d.deliveryNoteId === note.id);
                              let delays: string[] = [];
                              if (ship?.shipTime) {
                                const dl = new Date(note.deliveryDate + "T24:00:00");
                                const diff = (new Date(ship.shipTime).getTime() - dl.getTime()) / (1000*60*60);
                                if (diff > 12) delays.push("发货延期" + (diff - 12).toFixed(1) + "h");
                              }
                              if (dist?.distributeTime) {
                                const dl = new Date(note.deliveryDate + "T24:00:00");
                                const diff = (new Date(dist.distributeTime).getTime() - dl.getTime()) / (1000*60*60);
                                if (diff > 24) delays.push("配送延期" + (diff - 24).toFixed(1) + "h");
                              }
                              return delays.length > 0 ? (
                                <div className="text-red-600 text-xs mt-1">{delays.map((d, i) => <div key={i}>{d}</div>)}</div>
                              ) : null;
                            })()}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button
                                onClick={() => setDeliveryPreview(note)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="预览"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handlePrintDeliveryNote(note)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                title="打印"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditDeliveryNote(note)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="编辑"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleGenerateLabelsForNote(note.id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                                title="生成标签"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteDeliveryNote(note.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                title="删除"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 发货模块 */}
        {activeTab === "shipment" && (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="扫描或输入发货单号/送货单号模糊查询..."
                    value={shipmentSearch}
                    onChange={e => setShipmentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button onClick={() => setShowShipmentAdvSearch(!showShipmentAdvSearch)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  高级查询
                </button>
                <button onClick={handleExportShipments} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  导出Excel
                </button>
              </div>
              {/* 高级查询面板 */}
              {showShipmentAdvSearch && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">发货单号</label><input value={shipmentAdvSearch.shipmentNumber} onChange={e => setShipmentAdvSearch(prev => ({...prev, shipmentNumber: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="发货单号" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">送货单号</label><input value={shipmentAdvSearch.deliveryNoteNumber} onChange={e => setShipmentAdvSearch(prev => ({...prev, deliveryNoteNumber: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="送货单号" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">供应商</label><input value={shipmentAdvSearch.supplierName} onChange={e => setShipmentAdvSearch(prev => ({...prev, supplierName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="供应商" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">收货公司</label><input value={shipmentAdvSearch.companyName} onChange={e => setShipmentAdvSearch(prev => ({...prev, companyName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="收货公司" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">状态</label><select value={shipmentAdvSearch.status} onChange={e => setShipmentAdvSearch(prev => ({...prev, status: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded"><option value="">全部</option><option value="pending_ship">待发货</option><option value="shipped">已发货</option><option value="in_distribution">配送中</option><option value="delivered">已送达</option><option value="completed">已完成</option><option value="cancelled">已取消</option></select></div>
                    <div><label className="block text-xs text-gray-500 mb-1">发货日期</label><input type="date" value={shipmentAdvSearch.shipDate} onChange={e => setShipmentAdvSearch(prev => ({...prev, shipDate: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" /></div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setShipmentAdvSearch({shipmentNumber: "", deliveryNoteNumber: "", supplierName: "", companyName: "", status: "", shipDate: ""})} className="px-3 py-1.5 text-sm border rounded hover:bg-white">重置</button>
                  </div>
                </div>
              )}
            </div>

            {/* 发货统计卡片 */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {[
                { label: "待发货", count: shipmentOrders.filter(s => s.status === "pending_ship").length, color: "bg-amber-50 text-amber-700" },
                { label: "已发货", count: shipmentOrders.filter(s => s.status === "shipped").length, color: "bg-blue-50 text-blue-700" },
                { label: "配送中", count: shipmentOrders.filter(s => s.status === "in_distribution").length, color: "bg-purple-50 text-purple-700" },
                { label: "已送达", count: shipmentOrders.filter(s => s.status === "delivered").length, color: "bg-green-50 text-green-700" },
                { label: "已完成/取消", count: shipmentOrders.filter(s => s.status === "completed" || s.status === "cancelled").length, color: "bg-gray-50 text-gray-700" },
              ].map((card, i) => (
                <div key={i} className={`rounded-lg p-4 ${card.color}`}>
                  <div className="text-2xl font-bold">{card.count}</div>
                  <div className="text-sm mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* 发货单列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-medium">发货单号</th>
                    <th className="py-3 px-4 text-left font-medium">送货单号</th>
                    <th className="py-3 px-4 text-left font-medium">供应商</th>
                    <th className="py-3 px-4 text-left font-medium">收货公司</th>
                    <th className="py-3 px-4 text-center font-medium">回单</th>
                    <th className="py-3 px-4 text-center font-medium">状态</th>
                    <th className="py-3 px-4 text-left font-medium">发货时间</th>
                    <th className="py-3 px-4 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {shipmentOrders
                    .filter(s => {
                      if (!shipmentSearch.trim() && !Object.values(shipmentAdvSearch).some(v => v)) return true;
                      const q = shipmentSearch.toLowerCase();
                      let match = true;
                      if (shipmentSearch.trim()) {
                        match = s.shipmentNumber.toLowerCase().includes(q) || s.deliveryNoteNumber.toLowerCase().includes(q) || (s.supplierName || "").toLowerCase().includes(q) || (s.companyName || "").toLowerCase().includes(q);
                      }
                      if (shipmentAdvSearch.shipmentNumber && !s.shipmentNumber.toLowerCase().includes(shipmentAdvSearch.shipmentNumber.toLowerCase())) match = false;
                      if (shipmentAdvSearch.deliveryNoteNumber && !s.deliveryNoteNumber.toLowerCase().includes(shipmentAdvSearch.deliveryNoteNumber.toLowerCase())) match = false;
                      if (shipmentAdvSearch.supplierName && !(s.supplierName || "").toLowerCase().includes(shipmentAdvSearch.supplierName.toLowerCase())) match = false;
                      if (shipmentAdvSearch.companyName && !(s.companyName || "").toLowerCase().includes(shipmentAdvSearch.companyName.toLowerCase())) match = false;
                      if (shipmentAdvSearch.status && s.status !== shipmentAdvSearch.status) match = false;
                      if (shipmentAdvSearch.shipDate && s.shipTime && !s.shipTime.startsWith(shipmentAdvSearch.shipDate)) match = false;
                      return match;
                    })
                    .sort((a, b) => (b.createTime || "").localeCompare(a.createTime || ""))
                    .map(s => {
                      const statusMap: Record<string, { label: string; color: string }> = {
                        pending_ship: { label: "待发货", color: "bg-amber-100 text-amber-700" },
                        shipped: { label: "已发货", color: "bg-blue-100 text-blue-700" },
                        in_distribution: { label: "配送中", color: "bg-purple-100 text-purple-700" },
                        delivered: { label: "已送达", color: "bg-green-100 text-green-700" },
                        completed: { label: "已完成", color: "bg-emerald-100 text-emerald-700" },
                        cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
                      };
                      const st = statusMap[s.status] || { label: s.status, color: "bg-gray-100 text-gray-700" };
                      const isExpanded = expandedShipmentId === s.id;
                      return (
                        <React.Fragment key={s.id}>
                          <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedShipmentId(isExpanded ? null : s.id)}>
                            <td className="py-3 px-4 font-mono text-xs flex items-center gap-1">
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                              {s.shipmentNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">{s.deliveryNoteNumber}</td>
                            <td className="py-3 px-4">{s.supplierName || "-"}</td>
                            <td className="py-3 px-4">{s.companyName || "-"}</td>
                            <td className="py-3 px-4 text-center">
                              {s.receipt && (Array.isArray(s.receipt) ? s.receipt.length > 0 : true) ? (
                                <span className="text-xs text-green-600 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewReceiptId(s.id); }}>查看</span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                            </td>
                            <td className="py-3 px-4 text-xs">{s.shipTime ? new Date(s.shipTime).toLocaleString("zh-CN") : "-"}</td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {s.status === "pending_ship" && (
                                  <>
                                    {shipmentConfirmId === s.id ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">确认发货?</span>
                                        <button onClick={() => handleShippedAndCreateDistribution(s.id)} className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">确认</button>
                                        <button onClick={() => setShipmentConfirmId(null)} className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">取消</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => setShipmentConfirmId(s.id)} className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600">确认发货</button>
                                    )}
                                  </>
                                )}
                                {s.status === "shipped" && (
                                  <button onClick={() => setCancelShipmentId(s.id)} className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">取消发货</button>
                                )}
                                {s.status === "delivered" && (
                                  <button onClick={() => handleMarkCompletedWithReceipt(s.id)} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600">已送达</button>
                                )}
                                {s.status === "cancelled" && (
                                  <button onClick={() => handleRedistribute(s.id)} className="px-3 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">重新配送</button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr><td colSpan={8} className="bg-gray-50 px-8 py-4 border-b">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div><span className="text-gray-500">发货员:</span> {s.shipOperator || "-"}</div>
                                <div><span className="text-gray-500">取消原因:</span> {s.cancelReason || "-"}</div>
                                <div><span className="text-gray-500">创建时间:</span> {s.createTime ? new Date(s.createTime).toLocaleString("zh-CN") : "-"}</div>
                              </div>
                              {/* 失败记录 */}
                              {s.failureHistory && s.failureHistory.length > 0 && (
                                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                                  <div className="text-xs font-medium text-red-700 mb-1">历史失败/取消记录:</div>
                                  {s.failureHistory.map((f, i) => (
                                    <div key={i} className="text-xs text-red-600 flex items-center gap-2 mb-0.5">
                                      <span className="font-medium">[{f.type}]</span>
                                      <span>{new Date(f.time).toLocaleString("zh-CN")}</span>
                                      <span>- {f.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* 送货单明细 */}
                              {(() => {
                                const note = deliveryNotes.find(n => n.id === s.deliveryNoteId);
                                if (!note) return null;
                                return (
                                  <div className="mt-3">
                                    <div className="text-xs font-medium text-gray-600 mb-1">送货明细:</div>
                                    <table className="w-full text-xs border">
                                      <thead><tr className="bg-gray-100"><th className="border px-2 py-1">物料编码</th><th className="border px-2 py-1">物料名称</th><th className="border px-2 py-1">规格</th><th className="border px-2 py-1">数量</th><th className="border px-2 py-1">单位</th></tr></thead>
                                      <tbody>{note.items.map((item, i) => <tr key={i}><td className="border px-2 py-1">{item.productCode}</td><td className="border px-2 py-1">{item.productName}</td><td className="border px-2 py-1">{item.specification || "-"}</td><td className="border px-2 py-1 text-center">{item.quantity}</td><td className="border px-2 py-1 text-center">{item.unit || "-"}</td></tr>)}</tbody>
                                    </table>
                                  </div>
                                );
                              })()}
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {shipmentOrders.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">暂无发货单，创建送货单后将自动生成</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 取消发货模态框 */}
            {cancelShipmentId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-4">取消发货</h3>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">取消原因 <span className="text-red-500">*</span></label><textarea value={cancelShipmentReason} onChange={e => setCancelShipmentReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="请输入取消发货的原因" /></div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => { setCancelShipmentId(null); setCancelShipmentReason(""); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">返回</button>
                    <button onClick={() => handleCancelShipment(cancelShipmentId)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">确认取消</button>
                  </div>
                </div>
              </div>
            )}

            {/* 上传回单模态框 */}
            {uploadReceiptShipmentId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-4">确认送达 - 上传回单</h3>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">上传回单（支持PDF和图片）</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-lg" /></div>
                  {receiptFile && <div className="mt-2 text-xs text-green-600">已选择: {receiptFile.name}</div>}
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => { setUploadReceiptShipmentId(null); setReceiptFile(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button onClick={() => handleMarkCompletedConfirm(uploadReceiptShipmentId)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">确认完成</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 配送模块 */}
        {activeTab === "distribution" && (
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="扫描或输入发货单号/配送单号模糊查询..."
                    value={distributionSearch}
                    onChange={e => setDistributionSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button onClick={() => setShowDistAdvSearch(!showDistAdvSearch)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  高级查询
                </button>
                <button onClick={handleExportDistributions} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  导出Excel
                </button>
              </div>
              {/* 高级查询面板 */}
              {showDistAdvSearch && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-xs text-gray-500 mb-1">配送单号</label><input value={distAdvSearch.distributionNumber} onChange={e => setDistAdvSearch(prev => ({...prev, distributionNumber: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="配送单号" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">发货单号/送货单号</label><input value={distAdvSearch.shipmentNumber} onChange={e => setDistAdvSearch(prev => ({...prev, shipmentNumber: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="发货单号" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">收货公司</label><input value={distAdvSearch.companyName} onChange={e => setDistAdvSearch(prev => ({...prev, companyName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="收货公司" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">状态</label><select value={distAdvSearch.status} onChange={e => setDistAdvSearch(prev => ({...prev, status: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded"><option value="">全部</option><option value="pending_distribute">待配送</option><option value="in_distribution">配送中</option><option value="delivered">已送达</option><option value="failed">配送失败</option></select></div>
                    <div><label className="block text-xs text-gray-500 mb-1">配送方式</label><select value={distAdvSearch.distributionType} onChange={e => setDistAdvSearch(prev => ({...prev, distributionType: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded"><option value="">全部</option><option value="logistics">物流配送</option><option value="express">快递</option><option value="company">公司配送</option></select></div>
                    <div><label className="block text-xs text-gray-500 mb-1">供应商</label><input value={distAdvSearch.supplierName} onChange={e => setDistAdvSearch(prev => ({...prev, supplierName: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="供应商" /></div>
                    <div><label className="block text-xs text-gray-500 mb-1">配送日期</label><input type="date" value={distAdvSearch.distributeDate} onChange={e => setDistAdvSearch(prev => ({...prev, distributeDate: e.target.value}))} className="w-full px-2 py-1.5 text-sm border rounded" /></div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setDistAdvSearch({distributionNumber: "", shipmentNumber: "", companyName: "", status: "", distributionType: "", supplierName: "", distributeDate: ""})} className="px-3 py-1.5 text-sm border rounded hover:bg-white">重置</button>
                  </div>
                </div>
              )}
            </div>

            {/* 配送统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: "待配送", count: distributionOrders.filter(d => d.status === "pending_distribute").length, color: "bg-amber-50 text-amber-700" },
                { label: "配送中", count: distributionOrders.filter(d => d.status === "in_distribution").length, color: "bg-blue-50 text-blue-700" },
                { label: "已送达", count: distributionOrders.filter(d => d.status === "delivered").length, color: "bg-green-50 text-green-700" },
                { label: "配送失败", count: distributionOrders.filter(d => d.status === "failed").length, color: "bg-red-50 text-red-700" },
              ].map((card, i) => (
                <div key={i} className={`rounded-lg p-4 ${card.color}`}>
                  <div className="text-2xl font-bold">{card.count}</div>
                  <div className="text-sm mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* 配送单列表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-medium">配送单号</th>
                    <th className="py-3 px-4 text-left font-medium">发货单号</th>
                    <th className="py-3 px-4 text-left font-medium">供应商</th>
                    <th className="py-3 px-4 text-left font-medium">收货公司</th>
                    <th className="py-3 px-4 text-left font-medium">配送方式</th>
                    <th className="py-3 px-4 text-center font-medium">回单</th>
                    <th className="py-3 px-4 text-center font-medium">状态</th>
                    <th className="py-3 px-4 text-left font-medium">配送时间</th>
                    <th className="py-3 px-4 text-left font-medium">配送信息</th>
                    <th className="py-3 px-4 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionOrders
                    .filter(d => {
                      if (!distributionSearch.trim() && !Object.values(distAdvSearch).some(v => v)) return true;
                      const q = distributionSearch.toLowerCase();
                      let match = true;
                      if (distributionSearch.trim()) {
                        match = d.shipmentNumber.toLowerCase().includes(q) || d.distributionNumber.toLowerCase().includes(q) || (d.companyName || "").toLowerCase().includes(q);
                      }
                      if (distAdvSearch.distributionNumber && !d.distributionNumber.toLowerCase().includes(distAdvSearch.distributionNumber.toLowerCase())) match = false;
                      if (distAdvSearch.shipmentNumber && !d.shipmentNumber.toLowerCase().includes(distAdvSearch.shipmentNumber.toLowerCase())) match = false;
                      if (distAdvSearch.companyName && !(d.companyName || "").toLowerCase().includes(distAdvSearch.companyName.toLowerCase())) match = false;
                      if (distAdvSearch.status && d.status !== distAdvSearch.status) match = false;
                      if (distAdvSearch.distributionType && d.distributionType !== distAdvSearch.distributionType) match = false;
                      if (distAdvSearch.supplierName && !(d.supplierName || "").toLowerCase().includes(distAdvSearch.supplierName.toLowerCase())) match = false;
                      if (distAdvSearch.distributeDate && d.distributeTime && !d.distributeTime.startsWith(distAdvSearch.distributeDate)) match = false;
                      return match;
                    })
                    .sort((a, b) => (b.createTime || "").localeCompare(a.createTime || ""))
                    .map(d => {
                      const statusMap: Record<string, { label: string; color: string }> = {
                        pending_distribute: { label: "待配送", color: "bg-amber-100 text-amber-700" },
                        in_distribution: { label: "配送中", color: "bg-blue-100 text-blue-700" },
                        delivered: { label: "已送达", color: "bg-green-100 text-green-700" },
                        failed: { label: "配送失败", color: "bg-red-100 text-red-700" },
                      };
                      const st = statusMap[d.status] || { label: d.status, color: "bg-gray-100 text-gray-700" };
                      const typeMap: Record<string, string> = { logistics: "物流配送", express: "快递", company: "公司配送" };
                      let distInfo = "-";
                      if (d.distributionType === "logistics" && d.logisticsCompany) {
                        distInfo = `${d.logisticsCompany} / ${d.logisticsNumber || "-"} / ${d.logisticsDriverName || "-"}`;
                      } else if (d.distributionType === "express" && d.expressCompany) {
                        distInfo = `${d.expressCompany} / ${d.expressNumber || "-"}`;
                      } else if (d.distributionType === "company" && d.companyDriverName) {
                        distInfo = `${d.companyDriverName} / ${d.companyDriverPhone || "-"}`;
                      }
                      const isExpanded = expandedDistId === d.id;
                      return (
                        <React.Fragment key={d.id}>
                          <tr className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedDistId(isExpanded ? null : d.id)}>
                            <td className="py-3 px-4 font-mono text-xs flex items-center gap-1">
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                              {d.distributionNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">{d.shipmentNumber}</td>
                            <td className="py-3 px-4">{d.supplierName || "-"}</td>
                            <td className="py-3 px-4">{d.companyName || "-"}</td>
                            <td className="py-3 px-4"><span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{typeMap[d.distributionType] || "-"}</span></td>
                            <td className="py-3 px-4 text-center">
                              {(() => {
                                const ship = shipmentOrders.find(s => s.id === d.shipmentId);
                                const receipt = ship?.receipt;
                                return (receipt && Array.isArray(receipt) && receipt.length > 0) ? (
                                  <span className="text-xs text-green-600 cursor-pointer" onClick={(e) => { e.stopPropagation(); setViewReceiptId(ship.id); }}>查看</span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                );
                              })()}
                            </td>
                            <td className="py-3 px-4 text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                            <td className="py-3 px-4 text-xs">{d.distributeTime ? new Date(d.distributeTime).toLocaleString("zh-CN") : "-"}</td>
                            <td className="py-3 px-4 text-xs max-w-[200px] truncate" title={distInfo}>{distInfo}</td>
                            <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {d.status === "pending_distribute" && (
                                  <div className="flex items-center gap-1">
                                    {showDistModeForId === d.id ? (
                                      <>
                                        <button onClick={() => { setDistributeModal({ shipmentNumber: d.shipmentNumber, type: "logistics" }); setDistributeForm({ logisticsCompany: "", logisticsNumber: "", logisticsDriverName: "", logisticsDriverId: "", logisticsDriverPhone: "", expressCompany: "", expressNumber: "", companyDriverName: "", companyDriverId: "", companyDriverPhone: "" }); }} className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">物流</button>
                                        <button onClick={() => { setDistributeModal({ shipmentNumber: d.shipmentNumber, type: "express" }); setDistributeForm({ logisticsCompany: "", logisticsNumber: "", logisticsDriverName: "", logisticsDriverId: "", logisticsDriverPhone: "", expressCompany: "", expressNumber: "", companyDriverName: "", companyDriverId: "", companyDriverPhone: "" }); }} className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">快递</button>
                                        <button onClick={() => { setDistributeModal({ shipmentNumber: d.shipmentNumber, type: "company" }); setDistributeForm({ logisticsCompany: "", logisticsNumber: "", logisticsDriverName: "", logisticsDriverId: "", logisticsDriverPhone: "", expressCompany: "", expressNumber: "", companyDriverName: "", companyDriverId: "", companyDriverPhone: "" }); }} className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">公司</button>
                                        <button onClick={() => setShowDistModeForId(null)} className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">返回</button>
                                      </>
                                    ) : (
                                      <>
                                        <button onClick={() => setShowDistModeForId(d.id)} className="px-2 py-1.5 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600">配送</button>
                                        <button onClick={() => setCancelDistId(d.id)} className="px-2 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">取消配送</button>
                                      </>
                                    )}
                                  </div>
                                )}
                                {d.status === "in_distribution" && (
                                  <>
                                    {completeConfirmId === d.id ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs text-gray-500">确认完成?</span>
                                        <button onClick={() => handleDistributionComplete(d.id)} className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">确认</button>
                                        <button onClick={() => setCompleteConfirmId(null)} className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">取消</button>
                                      </div>
                                    ) : failConfirmId === d.id ? (
                                      <div className="flex items-center gap-1">
                                        <input value={failReason} onChange={e => setFailReason(e.target.value)} placeholder="失败原因" className="px-2 py-1 text-xs border rounded w-24" />
                                        <button onClick={() => handleDistributionFailed(d.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">确认</button>
                                        <button onClick={() => { setFailConfirmId(null); setFailReason(""); }} className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">取消</button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => setCompleteConfirmId(d.id)} className="px-2 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600">配送完成</button>
                                        <button onClick={() => setFailConfirmId(d.id)} className="px-2 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">配送失败</button>
                                        <button onClick={() => setCancelDistId(d.id)} className="px-2 py-1.5 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">取消配送</button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr><td colSpan={10} className="bg-gray-50 px-8 py-4 border-b">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div><span className="text-gray-500">配送方式:</span> {typeMap[d.distributionType] || "-"}</div>
                                <div><span className="text-gray-500">创建时间:</span> {d.createTime ? new Date(d.createTime).toLocaleString("zh-CN") : "-"}</div>
                                <div><span className="text-gray-500">取消原因:</span> {d.cancelReason || "-"}</div>
                              </div>
                              {d.distributionType === "logistics" && (
                                <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                                  <div><span className="text-gray-500">物流公司:</span> {d.logisticsCompany || "-"}</div>
                                  <div><span className="text-gray-500">物流单号:</span> {d.logisticsNumber || "-"}</div>
                                  <div><span className="text-gray-500">司机:</span> {d.logisticsDriverName || "-"} {d.logisticsDriverPhone || "-"}</div>
                                </div>
                              )}
                              {d.distributionType === "express" && (
                                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                  <div><span className="text-gray-500">快递公司:</span> {d.expressCompany || "-"}</div>
                                  <div><span className="text-gray-500">快递单号:</span> {d.expressNumber || "-"}</div>
                                </div>
                              )}
                              {d.distributionType === "company" && (
                                <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                                  <div><span className="text-gray-500">司机:</span> {d.companyDriverName || "-"}</div>
                                  <div><span className="text-gray-500">身份证:</span> {d.companyDriverId || "-"}</div>
                                  <div><span className="text-gray-500">手机号:</span> {d.companyDriverPhone || "-"}</div>
                                </div>
                              )}
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {distributionOrders.length === 0 && (
                    <tr><td colSpan={10} className="py-8 text-center text-gray-400">暂无配送单，发货确认后将自动创建</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 取消配送模态框 */}
            {cancelDistId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-lg font-semibold mb-4">取消配送</h3>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">取消原因 <span className="text-red-500">*</span></label><textarea value={cancelDistReason} onChange={e => setCancelDistReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="请输入取消配送的原因" /></div>
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => { setCancelDistId(null); setCancelDistReason(""); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">返回</button>
                    <button onClick={() => handleCancelDistribution(cancelDistId)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">确认取消</button>
                  </div>
                </div>
              </div>
            )}

            {/* 配送确认模态框 */}
            {distributeModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {distributeModal.type === "logistics" ? "物流配送" : distributeModal.type === "express" ? "快递配送" : "公司配送"} - {distributeModal.shipmentNumber}
                  </h3>

                  {distributeModal.type === "logistics" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">物流公司名称 <span className="text-red-500">*</span></label>
                        <input value={distributeForm.logisticsCompany} onChange={e => setDistributeForm(prev => ({ ...prev, logisticsCompany: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入物流公司名称" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">物流单号 <span className="text-red-500">*</span></label>
                        <input value={distributeForm.logisticsNumber} onChange={e => setDistributeForm(prev => ({ ...prev, logisticsNumber: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入物流单号" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">司机姓名</label>
                        <input value={distributeForm.logisticsDriverName} onChange={e => setDistributeForm(prev => ({ ...prev, logisticsDriverName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入司机姓名" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">司机身份证号</label>
                          <input value={distributeForm.logisticsDriverId} onChange={e => setDistributeForm(prev => ({ ...prev, logisticsDriverId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="身份证号" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">司机手机号</label>
                          <input value={distributeForm.logisticsDriverPhone} onChange={e => setDistributeForm(prev => ({ ...prev, logisticsDriverPhone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="手机号" />
                        </div>
                      </div>
                    </div>
                  )}

                  {distributeModal.type === "express" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">快递公司名称 <span className="text-red-500">*</span></label>
                        <input value={distributeForm.expressCompany} onChange={e => setDistributeForm(prev => ({ ...prev, expressCompany: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入快递公司名称" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">快递单号 <span className="text-red-500">*</span></label>
                        <input value={distributeForm.expressNumber} onChange={e => setDistributeForm(prev => ({ ...prev, expressNumber: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入快递单号" />
                      </div>
                    </div>
                  )}

                  {distributeModal.type === "company" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">司机姓名 <span className="text-red-500">*</span></label>
                        <input value={distributeForm.companyDriverName} onChange={e => setDistributeForm(prev => ({ ...prev, companyDriverName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="请输入司机姓名" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">司机身份证号</label>
                          <input value={distributeForm.companyDriverId} onChange={e => setDistributeForm(prev => ({ ...prev, companyDriverId: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="身份证号" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">司机手机号</label>
                          <input value={distributeForm.companyDriverPhone} onChange={e => setDistributeForm(prev => ({ ...prev, companyDriverPhone: e.target.value }))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="手机号" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setDistributeModal(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
                    <button onClick={handleConfirmDistribution} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">确认配送</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {/* 删除警告弹窗 */}
            {deleteWarning && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl">!</div>
                    <h3 className="text-lg font-semibold text-amber-700">操作受限</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{deleteWarning.title}</p>
                  <p className="text-sm text-amber-600 font-medium">{deleteWarning.reason}</p>
                  <div className="flex justify-end mt-4">
                    <button onClick={() => setDeleteWarning(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">我知道了</button>
                  </div>
                </div>
              </div>
            )}

            {/* 回单查看弹窗 */}
            {viewReceiptId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">回单查看</h3>
                  {(() => {
                    const shipment = shipmentOrders.find(s => s.id === viewReceiptId || s.deliveryNoteId === viewReceiptId);
                    const note = deliveryNotes.find(n => n.id === viewReceiptId);
                    const rawReceipt = shipment?.receipt || note?.receipt;
                    const receiptData = Array.isArray(rawReceipt) ? rawReceipt : (rawReceipt ? [{ name: "回单文件", url: String(rawReceipt), type: "image/png", uploadedAt: new Date().toISOString() }] : []);
                    if (receiptData.length === 0) {
                      return <p className="text-sm text-gray-500 text-center py-8">暂无回单信息</p>;
                    }
                    return (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {receiptData.map((r: { name: string; url: string; type: string; uploadedAt: string }, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                              {r.type === "application/pdf" ? "PDF" : "IMG"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.name}</p>
                              <p className="text-xs text-gray-400">{new Date(r.uploadedAt).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">打开</a>
                              <a href={r.url} download={r.name} className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">下载</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="flex justify-end mt-4">
                    <button onClick={() => setViewReceiptId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">关闭</button>
                  </div>
                </div>
              </div>
            )}

                {/* 物料标签 */}
        {activeTab === "label" && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative inline-block">
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  从送货单生成
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showLabelDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLabelDropdown(false)} />
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                      {getDeliveryNotesWithoutLabels().length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          所有送货单已生成标签
                        </div>
                      ) : (
                        getDeliveryNotesWithoutLabels().map((note) => {
                          const supplier = suppliers.find((s) => s.id === note.supplierId);
                          return (
                            <button
                              key={note.id}
                              onClick={() => {
                                handleGenerateLabelsFromSelectedNote(note.id);
                                setShowLabelDropdown(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-800 text-sm">{note.noteNumber}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {supplier?.name || "-"} | {note.items.length}个产品
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setNewLabelModal(true)}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新增标签
              </button>
              <button
                onClick={() => {
                  if (selectedLabels.size === 0) {
                    alert("请先选择要打印的标签");
                    return;
                  }
                  handlePrintLabels();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                打印选中 ({selectedLabels.size})
              </button>
              <button
                onClick={handleDeleteAllLabels}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清空所有
              </button>
              {selectedLabels.size > 0 && (
                <span className="text-gray-600 text-sm ml-2">
                  已选择 {selectedLabels.size} 个标签
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedLabels.size === materialLabels.length && materialLabels.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLabels(new Set(materialLabels.map((l) => l.id)));
                          } else {
                            setSelectedLabels(new Set());
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="border border-gray-300 px-4 py-2 text-left">标签编号</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">供应商</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">物料编码</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">物料名称</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">生成时间</th>
                    <th className="border border-gray-300 px-3 py-2 text-center w-28">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {materialLabels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                        暂无标签，请从送货单生成
                      </td>
                    </tr>
                  ) : (
                    materialLabels.map((label) => (
                      <tr key={label.id} className={`hover:bg-gray-50 ${selectedLabels.has(label.id) ? "bg-indigo-50" : ""}`}>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedLabels.has(label.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedLabels);
                              if (e.target.checked) {
                                newSet.add(label.id);
                              } else {
                                newSet.delete(label.id);
                              }
                              setSelectedLabels(newSet);
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                          {label.labelCode}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {label.supplierName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {label.productCode}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {label.productName}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                          {label.createTime}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => setLabelEditModal(label)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                              title="编辑"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setLabelPreview(label)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                              title="预览"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePrintLabels([label.id])}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                              title="打印"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`确定要删除标签 ${label.labelCode} 吗？`)) {
                                  setMaterialLabels((prev) => prev.filter((l) => l.id !== label.id));
                                  setSelectedLabels((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(label.id);
                                    return newSet;
                                  });
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="删除"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "basic" && (
          <div>
            {/* 子标签页 */}
            <div className="flex gap-2 mb-4 border-b pb-2">
              <button
                onClick={() => setBasicSubTab("supplier")}
                className={`px-4 py-2 rounded-t-lg transition-all ${
                  basicSubTab === "supplier"
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                供应商
              </button>
              <button
                onClick={() => setBasicSubTab("company")}
                className={`px-4 py-2 rounded-t-lg transition-all ${
                  basicSubTab === "company"
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                收货公司
              </button>
            </div>

            {/* 供应商 */}
            {basicSubTab === "supplier" && (
              <div>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setBasicEditModal({ type: "supplier" })}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    新增供应商
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-4 py-2 text-left">序号</th>
                        <th className="border px-4 py-2 text-left">Logo</th>
                        <th className="border px-4 py-2 text-left">供应商名称</th>
                        <th className="border px-4 py-2 text-left">英文名称</th>
                        <th className="border px-4 py-2 text-left">缩写</th>
                        <th className="border px-4 py-2 text-left">联系人</th>
                        <th className="border px-4 py-2 text-left">电话</th>
                        <th className="border px-4 py-2 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border px-4 py-8 text-center text-gray-500">
                            暂无供应商数据
                          </td>
                        </tr>
                      ) : (
                        suppliers.map((s, i) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="border px-4 py-2">{i + 1}</td>
                            <td className="border px-4 py-2">
                              {s.logo ? (
                                <img src={s.logo} alt={s.name} className="w-10 h-10 object-contain rounded" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs font-bold">
                                  {s.name?.charAt(0) || "?"}
                                </div>
                              )}
                            </td>
                            <td className="border px-4 py-2">{s.name}</td>
                            <td className="border px-4 py-2">{s.englishName || "-"}</td>
                            <td className="border px-4 py-2">{s.shortName || "-"}</td>
                            <td className="border px-4 py-2">{s.contact || "-"}</td>
                            <td className="border px-4 py-2">{s.phone || "-"}</td>
                            <td className="border px-4 py-2 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setBasicEditModal({ type: "supplier", item: s })}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteSupplier(s.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 收货公司 - 来自客户管理 */}
            {basicSubTab === "company" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  收货公司名称与「客户管理」同步匹配。联系人、电话、地址仅供送货单使用，可单独编辑。
                </p>
                <div className="flex gap-4 mb-4">
                  <button
                    onClick={() => setBasicEditModal({ type: "company" })}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    新增收货公司
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-4 py-2 text-left">序号</th>
                        <th className="border px-4 py-2 text-left">客户编号</th>
                        <th className="border px-4 py-2 text-left">公司名称</th>
                        <th className="border px-4 py-2 text-left">收货人</th>
                        <th className="border px-4 py-2 text-left">收货电话</th>
                        <th className="border px-4 py-2 text-left">收货地址</th>
                        <th className="border px-4 py-2 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border px-4 py-8 text-center text-gray-500">
                            暂无收货公司数据
                          </td>
                        </tr>
                      ) : (
                        customers.map((c: Company, i: number) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="border px-4 py-2">{i + 1}</td>
                            <td className="border px-4 py-2">{c.customerCode || "-"}</td>
                            <td className="border px-4 py-2">{c.customerName || c.name}</td>
                            <td className="border px-4 py-2">
                              <input
                                type="text"
                                value={companyLocalData[c.id]?.contact || c.contact || ""}
                                onChange={(e) => updateCompanyLocalData((prev) => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], contact: e.target.value }
                                }))}
                                placeholder="收货人"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="border px-4 py-2">
                              <input
                                type="text"
                                value={companyLocalData[c.id]?.phone || c.phone || ""}
                                onChange={(e) => updateCompanyLocalData((prev) => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], phone: e.target.value }
                                }))}
                                placeholder="收货电话"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="border px-4 py-2">
                              <input
                                type="text"
                                value={companyLocalData[c.id]?.address || c.address || ""}
                                onChange={(e) => updateCompanyLocalData((prev) => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], address: e.target.value }
                                }))}
                                placeholder="收货地址"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="border px-4 py-2 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setBasicEditModal({ type: "company", item: c })}
                                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                                >
                                  编辑
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 编辑模态框 - 送货单 */}
      {deliveryEditModal && (
        <DeliveryEditModal
          note={deliveryEditModal}
          suppliers={suppliers}
          companies={companies}
          products={externalProducts}
          companyLocalData={companyLocalData}
          onSave={handleSaveDeliveryNote}
          onClose={() => setDeliveryEditModal(null)}
        />
      )}

      {/* 编辑模态框 - 基础资料 */}
      {basicEditModal && (
        <BasicEditModal
          type={basicEditModal.type}
          item={basicEditModal.item}
          localData={basicEditModal.type === "company" && basicEditModal.item ? companyLocalData[basicEditModal.item.id] : undefined}
          onSave={handleSaveBasic}
          onClose={() => setBasicEditModal(null)}
        />
      )}

      {/* 预览模态框 - 送货单 */}
      {deliveryPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">送货单预览</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  打印
                </button>
                <button
                  onClick={() => setDeliveryPreview(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="border-2 border-gray-800 p-4 bg-white print:p-2">
              <DeliveryNoteContent note={deliveryPreview} suppliers={suppliers} companies={companies} />
            </div>
          </div>
        </div>
      )}

      {/* 预览模态框 - 物料标签 */}
      {labelPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">物料标签预览</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // 初始化所有条形码
                    setTimeout(async () => {
                      const JB = await loadJsBarcode();
                      document.querySelectorAll('svg.barcode').forEach((svg) => {
                        const value = svg.getAttribute('data-value') || '';
                        if (value && !svg.getAttribute('data-initialized')) {
                          JB(svg, value, {
                            format: "CODE128",
                            width: 1.5,
                            height: 40,
                            displayValue: false,
                            margin: 0,
                          });
                          svg.setAttribute('data-initialized', 'true');
                        }
                      });
                      window.print();
                    }, 100);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  打印
                </button>
                <button
                  onClick={() => setLabelPreview(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="print:p-4">
              {/* 标签卡片 - A6尺寸 148x105mm */}
              <div className="inline-block border-2 border-gray-800 bg-white" style={{ width: '148mm', minHeight: '105mm' }}>
                {/* 顶部收货公司 */}
                <div className="bg-gray-100 border-b border-gray-800 p-1 text-center font-bold text-sm">
                  {labelPreview.companyName || '收货公司'}
                </div>
                
                {/* 信息表格 */}
                <div className="p-1 text-xs">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">供应商：</td>
                        <td className="py-0.5">{labelPreview.supplierName}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">采购订单：</td>
                        <td className="py-0.5">{labelPreview.purchaseOrder || '-'}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">物料编码：</td>
                        <td className="py-0.5 font-mono">{labelPreview.productCode}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">物料名称：</td>
                        <td className="py-0.5">{labelPreview.productName}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">数量/单位：</td>
                        <td className="py-0.5">{labelPreview.quantity || '-'}{labelPreview.unit ? ` / ${labelPreview.unit}` : ''}</td>
                      </tr>
                      <tr>
                        <td className="py-0.5 pr-2 font-medium whitespace-nowrap">来料日期：</td>
                        <td className="py-0.5">{labelPreview.receiveDate || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* 底部条形码 */}
                <div className="border-t border-gray-800 p-1 text-center">
                  <svg data-value={labelPreview.productCode} className="barcode mx-auto"></svg>
                  <div className="text-xs font-mono mt-0.5">{labelPreview.productCode}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑模态框 - 物料标签 */}
      {labelEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">编辑物料标签</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const updatedLabel: MaterialLabel = {
                  ...labelEditModal,
                  supplierName: formData.get("supplierName") as string,
                  productCode: formData.get("productCode") as string,
                  productName: formData.get("productName") as string,
                  labelCode: formData.get("labelCode") as string,
                  updateTime: new Date().toISOString().slice(0, 10),
                };
                setMaterialLabels((prev) =>
                  prev.map((l) => (l.id === labelEditModal.id ? updatedLabel : l))
                );
                showMessage("标签更新成功", "success");
                setLabelEditModal(null);
              }}
            >
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">标签编号</label>
                <input
                  type="text"
                  name="labelCode"
                  defaultValue={labelEditModal.labelCode}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">供应商</label>
                <input
                  type="text"
                  name="supplierName"
                  defaultValue={labelEditModal.supplierName}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">物料编码</label>
                <input
                  type="text"
                  name="productCode"
                  defaultValue={labelEditModal.productCode}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">物料名称</label>
                <input
                  type="text"
                  name="productName"
                  defaultValue={labelEditModal.productName}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setLabelEditModal(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 新增物料标签模态框 */}
      {newLabelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">新增物料标签</h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newLabel: MaterialLabel = {
                  id: `label_${Date.now()}`,
                  labelCode: newLabelForm.labelCode,
                  supplierId: newLabelForm.supplierId,
                  supplierName: newLabelForm.supplierName,
                  productId: newLabelForm.productCode,
                  productCode: newLabelForm.productCode,
                  productName: newLabelForm.productName,
                  companyName: newLabelForm.companyName,
                  purchaseOrder: newLabelForm.purchaseOrder || "",
                  quantity: newLabelForm.quantity,
                  unit: newLabelForm.unit,
                  receiveDate: newLabelForm.receiveDate || new Date().toISOString().slice(0, 10),
                  createTime: new Date().toISOString().slice(0, 10),
                  updateTime: new Date().toISOString().slice(0, 10),
                };
                setMaterialLabels((prev) => [...prev, newLabel]);
                setNewLabelModal(false);
                setNewLabelForm({ labelCode: "", supplierId: "", supplierName: "", productCode: "", productName: "", companyName: "", purchaseOrder: "", quantity: "1", unit: "", receiveDate: "" });
                setLabelProductSearch("");
                showMessage("物料标签创建成功", "success");
              }}
            >
              <div className="p-6 space-y-4">
                {/* 标签编号 - 自动生成 */}
                <div>
                  <label className="block text-sm font-medium mb-1">标签编号</label>
                  <input
                    type="text"
                    value={newLabelForm.labelCode}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">自动生成</p>
                </div>
                {/* 供应商 - 下拉选择 */}
                <div>
                  <label className="block text-sm font-medium mb-1">供应商 <span className="text-red-500">*</span></label>
                  <select
                    value={newLabelForm.supplierName}
                    onChange={(e) => setNewLabelForm({ ...newLabelForm, supplierName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">请选择供应商</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {/* 收货公司 */}
                <div>
                  <label className="block text-sm font-medium mb-1">收货公司</label>
                  <select
                    value={newLabelForm.companyName}
                    onChange={(e) => setNewLabelForm({ ...newLabelForm, companyName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">请选择收货公司</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.customerName || c.name}>{c.customerName || c.name}</option>
                    ))}
                  </select>
                </div>
                {/* 物料编码 - 搜索选择 */}
                <div>
                  <label className="block text-sm font-medium mb-1">物料编码 <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type="text"
                      value={labelProductSearch}
                      onChange={(e) => setLabelProductSearch(e.target.value)}
                      placeholder="输入关键字搜索产品..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                    {labelProductSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {externalProducts
                          .filter((p) => {
                            const kw = labelProductSearch.toLowerCase();
                            return (
                              (p.materialCode || "").toLowerCase().includes(kw) ||
                              (p.projectName || "").toLowerCase().includes(kw)
                            );
                          })
                          .slice(0, 10)
                          .map((p) => (
                            <div
                              key={p.id}
                              className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                              onClick={() => {
                                setNewLabelForm({
                                  ...newLabelForm,
                                  productCode: p.materialCode || "",
                                  productName: p.projectName || "",
                                  unit: p.unit || "",
                                });
                                setLabelProductSearch(p.materialCode || "");
                              }}
                            >
                              <span className="font-mono text-sm">{p.materialCode}</span>
                              <span className="text-gray-500 text-sm ml-2">{p.projectName}</span>
                            </div>
                          ))}
                        {externalProducts.filter((p) => {
                          const kw = labelProductSearch.toLowerCase();
                          return (p.materialCode || "").toLowerCase().includes(kw) || (p.projectName || "").toLowerCase().includes(kw);
                        }).length === 0 && (
                          <div className="px-3 py-2 text-gray-400 text-sm">未找到匹配产品</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* 物料名称 - 自动带出 */}
                <div>
                  <label className="block text-sm font-medium mb-1">物料名称</label>
                  <input
                    type="text"
                    value={newLabelForm.productName}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                  />
                  <p className="text-xs text-gray-400 mt-1">选择物料编码后自动带出</p>
                </div>
                {/* 采购订单 */}
                <div>
                  <label className="block text-sm font-medium mb-1">采购订单</label>
                  <input
                    type="text"
                    value={newLabelForm.purchaseOrder}
                    onChange={(e) => setNewLabelForm({ ...newLabelForm, purchaseOrder: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="输入采购订单号"
                  />
                </div>
                {/* 数量/单位 */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">数量</label>
                    <input
                      type="text"
                      value={newLabelForm.quantity}
                      onChange={(e) => setNewLabelForm({ ...newLabelForm, quantity: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="数量"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-sm font-medium mb-1">单位</label>
                    <input
                      type="text"
                      value={newLabelForm.unit}
                      onChange={(e) => setNewLabelForm({ ...newLabelForm, unit: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="单位"
                    />
                  </div>
                </div>
                {/* 来料日期 */}
                <div>
                  <label className="block text-sm font-medium mb-1">来料日期</label>
                  <input
                    type="date"
                    value={newLabelForm.receiveDate}
                    onChange={(e) => setNewLabelForm({ ...newLabelForm, receiveDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNewLabelModal(false);
                    setLabelProductSearch("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 打印区域 - 物料标签 */}
      <div id="print-labels" className="hidden print:block">
        <PrintLabelsContent labels={materialLabels.filter(l => selectedLabels.has(l.id))} />
      </div>
    </div>
  );
}

// ========== 打印内容组件 ==========
interface PrintLabelsContentProps {
  labels: MaterialLabel[];
}

function PrintLabelsContent({ labels }: PrintLabelsContentProps) {
  return (
    <div className="print-labels-grid">
      {labels.map((label) => (
        <div key={label.id} className="print-label-card">
          <div className="print-label-company">{label.companyName || "-"}</div>
          <div className="print-label-row"><strong>供应商:</strong> {label.supplierName || "-"}</div>
          <div className="print-label-row"><strong>采购订单:</strong> {label.purchaseOrder || "-"}</div>
          <div className="print-label-row"><strong>物料编码:</strong> <span style={{fontFamily:"monospace"}}>{label.productCode}</span></div>
          <div className="print-label-row"><strong>物料名称:</strong> {label.productName}</div>
          <div className="print-label-row"><strong>数量/单位:</strong> {label.quantity || "-"}{label.unit ? `/${label.unit}` : ""}</div>
          <div className="print-label-row"><strong>来料日期:</strong> {label.receiveDate || "-"}</div>
          <div className="print-label-barcode">
            <svg className={`label-barcode-${label.id}`}></svg>
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== 基础资料编辑模态框 ==========
interface BasicEditModalProps {
  type: "supplier" | "company";
  item?: Supplier | Company;
  localData?: { contact?: string; phone?: string; address?: string };
  onSave: (data: Record<string, string>) => void;
  onClose: () => void;
}

function BasicEditModal({ type, item, localData, onSave, onClose }: BasicEditModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    if (item) {
      const base = { ...item } as Record<string, string>;
      // 收货公司：用localData覆盖收货人/收货电话/收货地址
      if (type === "company" && localData) {
        if (localData.contact) base.contact = localData.contact;
        if (localData.phone) base.phone = localData.phone;
        if (localData.address) base.address = localData.address;
      }
      return base;
    }
    if (type === "supplier") return { name: "", englishName: "", shortName: "", contact: "", phone: "" };
    return { name: "", customerCode: "", contact: "", phone: "", address: "" };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {type === "supplier" && (item ? "编辑供应商" : "新增供应商")}
          {type === "company" && (item ? "编辑收货公司" : "新增收货公司")}
        </h3>
        <form onSubmit={handleSubmit}>
          {type === "supplier" && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">供应商名称 *</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">公司Logo</label>
                <div className="flex items-center gap-3">
                  {formData.logo ? (
                    <div className="relative">
                      <img src={formData.logo} alt="logo" className="w-16 h-16 object-contain border rounded" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logo: "" })}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, logo: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">英文名称</label>
                <input
                  type="text"
                  value={formData.englishName || ""}
                  onChange={(e) => setFormData({ ...formData, englishName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">公司缩写</label>
                <input
                  type="text"
                  value={formData.shortName || ""}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">联系人</label>
                <input
                  type="text"
                  value={formData.contact || ""}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">电话</label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </>
          )}
          {type === "company" && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">公司名称 *</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">客户编号</label>
                <input
                  type="text"
                  value={formData.customerCode || ""}
                  onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="从客户管理匹配"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">收货人</label>
                <input
                  type="text"
                  value={formData.contact || ""}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="仅供送货单使用"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">收货电话</label>
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="仅供送货单使用"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">收货地址</label>
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="仅供送货单使用"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========== 送货单编辑模态框 ==========
interface DeliveryEditModalProps {
  note: DeliveryNote;
  suppliers: Supplier[];
  companies: Company[];
  products: Product[];
  companyLocalData: Record<string, { contact?: string; phone?: string; address?: string }>;
  onSave: (note: DeliveryNote) => void;
  onClose: () => void;
}

function DeliveryEditModal({ note, suppliers, companies, products, companyLocalData, onSave, onClose }: DeliveryEditModalProps) {
  const [formData, setFormData] = useState<DeliveryNote>(note);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemRemarks, setItemRemarks] = useState("");
  const [productSearchKeyword, setProductSearchKeyword] = useState("");
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const handleAddItem = (product: Product) => {
    const newItem: DeliveryNoteItem = {
      productId: product.id,
      productName: product.projectName,
      productCode: product.materialCode,
      specification: product.specification || "",
      quantity: itemQuantity,
      unit: product.unit || "个",
      remarks: itemRemarks,
    };

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setItemQuantity(1);
    setItemRemarks("");
  };

  // 批量添加选中的产品
  const handleBatchAddItems = (products: Product[]) => {
    const newItems: DeliveryNoteItem[] = products.map((product) => ({
      productId: product.id,
      productName: product.projectName,
      productCode: product.materialCode,
      specification: product.specification || "",
      quantity: itemQuantity,
      unit: product.unit || "个",
      remarks: itemRemarks,
    }));

    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
    }));

    setItemQuantity(1);
    setItemRemarks("");
    setShowProductSelector(false);
    setProductSearchKeyword("");
    setSelectedProductIds(new Set());
  };

  // 过滤已添加的产品
  const addedProductIds = formData.items.map((item) => item.productId);
  
  // 搜索产品（根据关键字过滤）
  const filteredProducts = products.filter((p: Product) => {
    const keyword = productSearchKeyword.toLowerCase();
    return (
      !addedProductIds.includes(p.id) &&
      (p.materialCode?.toLowerCase().includes(keyword) ||
        p.projectName?.toLowerCase().includes(keyword) ||
        p.specification?.toLowerCase().includes(keyword) ||
        p.description?.toLowerCase().includes(keyword))
    );
  });

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      alert("请选择供应商");
      return;
    }
    if (!formData.companyId) {
      alert("请选择收货公司");
      return;
    }
    onSave(formData);
  };

  // 过滤出未添加的产品（使用产品管理数据）
  const availableProducts = products.filter(
    (p: Product) => !formData.items.some((item) => item.productId === p.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">
          {note.items.length > 0 ? "编辑送货单" : "新增送货单"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">送货单号</label>
              <input
                type="text"
                value={formData.noteNumber}
                onChange={(e) => setFormData({ ...formData, noteNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">送货日期</label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">供应商 *</label>
              <select
                value={formData.supplierId}
                onChange={(e) => {
                  const selectedSupplier = suppliers.find(s => s.id === e.target.value);
                  setFormData({
                    ...formData,
                    supplierId: e.target.value,
                    supplierName: selectedSupplier?.name || "",
                    supplierEnglishName: selectedSupplier?.englishName || "",
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">请选择供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">收货公司 *</label>
              <select
                value={formData.companyId}
                onChange={(e) => {
                  const selectedCompany = companies.find((c) => c.id === e.target.value);
                  const localData = companyLocalData[e.target.value];
                  setFormData({ 
                    ...formData, 
                    companyId: e.target.value,
                    companyName: selectedCompany?.name || selectedCompany?.customerName || "",
                    receiver: localData?.contact || selectedCompany?.contact || "",
                    contactPhone: localData?.phone || selectedCompany?.phone || "",
                    deliveryAddress: localData?.address || selectedCompany?.address || ""
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">请选择收货公司</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.customerName}
                  </option>
                ))}
              </select>
            </div>
              {/* 状态由系统流程自动管理，无需手动选择 */}
            <div>
              <label className="block text-sm font-medium mb-1">收货人</label>
              <input
                type="text"
                value={formData.receiver || ""}
                onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="仅供送货单使用"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">收货电话</label>
              <input
                type="text"
                value={formData.contactPhone || ""}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="仅供送货单使用"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">收货地址</label>
              <input
                type="text"
                value={formData.deliveryAddress || ""}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="仅供送货单使用"
              />
            </div>
          </div>

          {/* 送货明细 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">送货明细</h4>
              {addedProductIds.length < products.length && (
                <button
                  type="button"
                  onClick={() => setShowProductSelector(!showProductSelector)}
                  className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600"
                >
                  {showProductSelector ? "关闭选择" : "+ 选择产品"}
                </button>
              )}
            </div>
            
            {/* 产品搜索选择器 */}
            {showProductSelector && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">搜索产品（输入关键字）</label>
                  <input
                    type="text"
                    value={productSearchKeyword}
                    onChange={(e) => setProductSearchKeyword(e.target.value)}
                    placeholder="输入产品编码、名称、规格、型号进行搜索..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    autoFocus
                  />
                </div>
                
                <div className="mb-3 flex gap-4 items-end flex-wrap">
                  <div className="w-24">
                    <label className="block text-xs text-gray-500 mb-1">默认数量</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs text-gray-500 mb-1">默认备注</label>
                    <input
                      type="text"
                      value={itemRemarks}
                      onChange={(e) => setItemRemarks(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="可选"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setItemQuantity(1); setItemRemarks(""); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    重置
                  </button>
                </div>
                
                <div className="text-sm text-gray-500 mb-2">
                  共找到 {filteredProducts.length} 个可选产品{productSearchKeyword && `（已过滤）`}
                </div>
                
                <div className="mb-3 flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const newSet = new Set(selectedProductIds);
                      filteredProducts.forEach((p: Product) => newSet.add(p.id));
                      setSelectedProductIds(newSet);
                    }}
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProductIds(new Set())}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                  >
                    清除选择
                  </button>
                  {selectedProductIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const productsToAdd = filteredProducts.filter((p: Product) => selectedProductIds.has(p.id));
                        handleBatchAddItems(productsToAdd);
                      }}
                      className="px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      确认添加 ({selectedProductIds.size})
                    </button>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    已选 {selectedProductIds.size} / {filteredProducts.length} 个产品
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium w-10">
                          <input type="checkbox" onChange={(e) => {
                            if (e.target.checked) {
                              const newSet = new Set(selectedProductIds);
                              filteredProducts.forEach((p: Product) => newSet.add(p.id));
                              setSelectedProductIds(newSet);
                            } else {
                              const newSet = new Set(selectedProductIds);
                              filteredProducts.forEach((p: Product) => newSet.delete(p.id));
                              setSelectedProductIds(newSet);
                            }
                          }} checked={filteredProducts.length > 0 && filteredProducts.every((p: Product) => selectedProductIds.has(p.id))} />
                        </th>
                        <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium">物料编码</th>
                        <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium">项目名称</th>
                        <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium">规格型号</th>
                        <th className="border border-gray-200 px-3 py-2 text-left text-xs font-medium">单位</th>
                        <th className="border border-gray-200 px-3 py-2 text-center text-xs font-medium w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="border border-gray-200 px-3 py-6 text-center text-gray-500 text-sm">
                            {productSearchKeyword ? "未找到匹配的产品" : "所有产品已添加"}
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p: Product) => (
                          <tr key={p.id} className={`hover:bg-indigo-50 cursor-pointer ${selectedProductIds.has(p.id) ? "bg-blue-50" : ""}`} onClick={() => {
                            const newSet = new Set(selectedProductIds);
                            if (newSet.has(p.id)) newSet.delete(p.id); else newSet.add(p.id);
                            setSelectedProductIds(newSet);
                          }}>
                            <td className="border border-gray-200 px-2 py-2 text-center">
                              <input type="checkbox" checked={selectedProductIds.has(p.id)} onChange={() => {
                                const newSet = new Set(selectedProductIds);
                                if (newSet.has(p.id)) newSet.delete(p.id); else newSet.add(p.id);
                                setSelectedProductIds(newSet);
                              }} onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-sm font-mono">{p.materialCode}</td>
                            <td className="border border-gray-200 px-3 py-2 text-sm">{p.projectName}</td>
                            <td className="border border-gray-200 px-3 py-2 text-sm text-gray-600">{p.specification || "-"}</td>
                            <td className="border border-gray-200 px-3 py-2 text-sm text-center">{p.unit || "个"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 已添加的产品列表 */}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left w-12">序号</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">物料编码</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">物料名称</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">规格</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-20">数量</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-16">单位</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">备注</th>
                  <th className="border border-gray-300 px-3 py-2 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 px-3 py-6 text-center text-gray-500">
                      请添加送货产品
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                      <td className="border border-gray-300 px-3 py-2 font-mono text-sm">
                        {item.productCode}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">{item.productName}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm text-gray-600">{item.specification || "-"}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx] = { ...newItems[idx], quantity: parseInt(e.target.value) || 1 };
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-16 text-center border border-gray-300 rounded px-1 py-0.5 text-sm"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center">{item.unit}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{item.remarks || "-"}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 备注 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">备注</label>
            <textarea
              value={formData.remarks || ""}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
              placeholder="可选"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
