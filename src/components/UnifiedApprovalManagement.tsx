"use client";

import { useEffect, useState, useRef } from "react";

interface Approval {
  id: string;
  status: string;
  applicantName: string;
  createdAt: string;
  currentApproverId?: string;
  currentApproverName?: string;
  sourceTable: "project" | "general";
  content?: string;
  relatedData?: string;
  approvalData?: string;
  title?: string;
  requestNumber?: string;
  approvalType?: string;
  requestType?: string;
  requestNumber?: string;
  title?: string;
  currentLevel?: string;
  currentStep?: string;
  rejectReason?: string;
  approvalNote?: string;
  applicantId?: string;
}

interface Props {
  userId: string;
  userRole?: string;
  targetApprovalId?: string | null;
  onApprovalViewed?: () => void;
  onProjectApprovalCompleted?: () => void;
}

export default function UnifiedApprovalManagement({
  userId,
  userRole,
  targetApprovalId,
  onApprovalViewed,
  onProjectApprovalCompleted,
}: Props) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const highlightedRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [modalType, setModalType] = useState<"approve" | "reject" | "force">("approve");
  const [note, setNote] = useState("");
  const isAdmin = userRole === "admin";

  useEffect(() => {
    loadApprovals();
  }, []);

  // 处理目标审批 ID 的高亮和滚动
  useEffect(() => {
    if (targetApprovalId && approvals.length > 0) {
      // 找到目标审批
      const target = approvals.find(a => a.id === targetApprovalId);
      if (target) {
        highlightedRef.current = targetApprovalId;
        // 滚动到目标元素
        setTimeout(() => {
          const element = document.getElementById(`approval-${targetApprovalId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-blue-500");
            // 3 秒后移除高亮
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-blue-500");
              highlightedRef.current = null;
              if (onApprovalViewed) onApprovalViewed();
            }, 3000);
          }
        }, 100);
      }
    }
  }, [targetApprovalId, approvals]);

  const loadApprovals = async () => {
    try {
      const [projectRes, generalRes, usersRes] = await Promise.all([
        fetch("/api/project-approvals"),
        fetch("/api/approvals"),
        fetch("/api/users"),
      ]);
      
      const projectData = await projectRes.json();
      const generalData = await generalRes.json();
      const usersData = await usersRes.json();
      
      setUsers(usersData.data || usersData.users || []);
      
      const merged: Approval[] = [
        ...(projectData.data || projectData.approvals || []).map((a: any) => ({ ...a, sourceTable: "project" as const })),
        ...(generalData.data || generalData.approvals || []).map((a: any) => ({ ...a, sourceTable: "general" as const })),
      ];
      
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setApprovals(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    
    try {
      const endpoint = selectedApproval.sourceTable === "project"
        ? `/api/project-approvals/${selectedApproval.id}/approve`
        : `/api/approvals/${selectedApproval.id}/approve`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: userId, approverName: userId, note }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert("审批通过");
        setShowModal(false);
        setNote("");
        loadApprovals();
        if (selectedApproval.sourceTable === "project") onProjectApprovalCompleted?.();
      } else {
        alert("失败：" + result.error);
      }
    } catch (err: any) {
      alert("错误：" + err.message);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    
    try {
      const endpoint = selectedApproval.sourceTable === "project"
        ? `/api/project-approvals/${selectedApproval.id}/reject`
        : `/api/approvals/${selectedApproval.id}/reject`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverId: userId, approverName: userId, reason: note }),
      });
      
      const result = await res.json();
      if (result.success) {
        alert("已拒绝");
        setShowModal(false);
        setNote("");
        loadApprovals();
      } else {
        alert("失败：" + result.error);
      }
    } catch (err: any) {
      alert("错误：" + err.message);
    }
  };

  const fieldNames: Record<string, string> = {
    operation: "操作",
    orderId: "订单 ID",
    orderNumber: "订单编号",
    projectName: "项目名称",
    customerName: "客户名称",
    amount: "订单金额",
    specifications: "规格型号",
    contractNumber: "合同编号",
    contractName: "合同名称",
    contractAmount: "合同金额",
  };

  const getUserFullName = (userId?: string) => {
    if (!userId) return "未设置";
    const user = users.find(u => u.id === userId);
    return user?.fullName || user?.username || userId;
  };

  const formatContent = (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (typeof data === "string") return data;
      return Object.entries(data).map(([key, value]) => {
        const displayName = fieldNames[key] || key;
        return (
          <div key={key} className="mb-1">
            <span className="font-medium">{displayName}:</span> {String(value)}
          </div>
        );
      });
    } catch {
      return jsonStr;
    }
  };

  const getTypeText = (a: Approval) => {
    if (a.sourceTable === "project") {
      const map: Record<string, string> = { new_project: "新建项目", update_project: "变更项目", delete_project: "删除项目" };
      return map[a.approvalType || ""] || "项目审批";
    }
    const map: Record<string, string> = { order: "订单审批", contract: "合同审批" };
    return map[a.requestType || ""] || "通用审批";
  };

  const filtered = approvals.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (typeFilter === "project" && a.sourceTable !== "project") return false;
    if ((typeFilter === "order" || typeFilter === "contract") && a.requestType !== typeFilter) return false;
    return true;
  });

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "待审批", value: approvals.filter(a => a.status === "pending").length, color: "text-yellow-600" },
          { label: "已通过", value: approvals.filter(a => a.status === "approved").length, color: "text-green-600" },
          { label: "已拒绝", value: approvals.filter(a => a.status === "rejected").length, color: "text-red-600" },
          { label: "总计", value: approvals.length, color: "text-gray-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4 shadow-sm">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选器 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "all", label: "全部", color: "bg-blue-600" },
          { key: "pending", label: "待审批", color: "bg-yellow-600" },
          { key: "approved", label: "已通过", color: "bg-green-600" },
          { key: "rejected", label: "已拒绝", color: "bg-red-600" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${filter === btn.key ? btn.color : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            {btn.label}
          </button>
        ))}
        <span className="mx-2 border-l" />
        {[
          { key: "all", label: "全部类型" },
          { key: "project", label: "项目" },
          { key: "order", label: "订单" },
          { key: "contract", label: "合同" },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setTypeFilter(btn.key)}
            className={`rounded-md border px-4 py-2 text-sm ${typeFilter === btn.key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-500">暂无审批记录</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              id={`approval-${a.id}`}
              className={`rounded-lg border p-4 shadow-sm transition-all ${
                highlightedRef.current === a.id ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg font-semibold">{getTypeText(a)}</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                      a.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      a.status === "approved" ? "bg-green-100 text-green-800" :
                      a.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {a.status === "pending" ? "待审批" : a.status === "approved" ? "已通过" : a.status === "rejected" ? "已拒绝" : a.status}
                    </span>
                    <span className="rounded-md border px-2 py-0.5 text-xs">{a.sourceTable === "project" ? "项目审批" : "通用审批"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>申请人：{a.applicantName}</div>
                    <div>时间：{new Date(a.createdAt).toLocaleString("zh-CN")}</div>
                    {a.requestNumber && <div>单号：{a.requestNumber}</div>}
                    {a.title && <div>标题：{a.title}</div>}
                    {a.currentApproverId && <div>审批人：{getUserFullName(a.currentApproverId)}</div>}
                    {a.currentLevel && <div>级别：{a.currentLevel.replace("_", " ")}</div>}
                    {a.rejectReason && a.status === "rejected" && (
                      <div className="col-span-2 text-red-600">拒绝原因：{a.rejectReason}</div>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {/* 详情按钮 - 所有记录都显示 */}
                  <button
                    onClick={() => { setSelectedApproval(a); setShowDetailModal(true); }}
                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    📄 详情
                  </button>
                  
                  {a.status === "pending" && isAdmin && (
                    <button
                      onClick={() => { setSelectedApproval(a); setModalType("force"); setShowModal(true); }}
                      className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
                    >
                      一键审核
                    </button>
                  )}
                  {a.status === "pending" && (!a.currentApproverId || a.currentApproverId === userId) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedApproval(a); setModalType("approve"); setShowModal(true); }}
                        className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
                      >
                        ✓ 通过
                      </button>
                      <button
                        onClick={() => { setSelectedApproval(a); setModalType("reject"); setShowModal(true); }}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                      >
                        ✗ 拒绝
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      {showDetailModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="mb-4 text-xl font-bold">审批详情</h2>
            
            {/* 基本信息 */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">审批类型</span>
                  <p className="font-medium">{selectedApproval.sourceTable === "project" ? "项目审批" : "通用审批"}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">状态</span>
                  <p className="font-medium">{selectedApproval.status === "pending" ? "待审批" : selectedApproval.status === "approved" ? "已通过" : "已拒绝"}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">申请人</span>
                  <p className="font-medium">{selectedApproval.applicantName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">申请时间</span>
                  <p className="font-medium">{new Date(selectedApproval.createdAt).toLocaleString("zh-CN")}</p>
                </div>
                {selectedApproval.currentApproverId && (
                  <div>
                    <span className="text-sm text-gray-500">当前审批人</span>
                    <p className="font-medium">{getUserFullName(selectedApproval.currentApproverId)}</p>
                  </div>
                )}
                {selectedApproval.requestNumber && (
                  <div>
                    <span className="text-sm text-gray-500">审批单号</span>
                    <p className="font-medium">{selectedApproval.requestNumber}</p>
                  </div>
                )}
              </div>
              
              {/* 详细内容 */}
              {(selectedApproval.content || selectedApproval.relatedData || selectedApproval.approvalData) && (
                <div>
                  <span className="text-sm text-gray-500">审批内容</span>
                  <div className="mt-1 rounded bg-gray-50 p-3 dark:bg-gray-800">
                    {selectedApproval.content && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{selectedApproval.content}</div>
                    )}
                    {selectedApproval.relatedData && (
                      <div className="text-sm leading-relaxed">
                        {formatContent(selectedApproval.relatedData)}
                      </div>
                    )}
                    {selectedApproval.approvalData && (
                      <div className="text-sm leading-relaxed">
                        {formatContent(selectedApproval.approvalData)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 审批意见 */}
              {selectedApproval.approvalNote && (
                <div>
                  <span className="text-sm text-gray-500">审批意见</span>
                  <div className="mt-1 rounded bg-blue-50 p-3 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-800 dark:text-blue-300">{selectedApproval.approvalNote}</p>
                  </div>
                </div>
              )}
              
              {/* 拒绝原因 */}
              {selectedApproval.rejectReason && selectedApproval.status === "rejected" && (
                <div>
                  <span className="text-sm text-gray-500">拒绝原因</span>
                  <div className="mt-1 rounded bg-red-50 p-3 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300">{selectedApproval.rejectReason}</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="rounded border bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审批操作模态框 */}
      {showModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              {modalType === "approve" ? "审批通过" : modalType === "reject" ? "拒绝审批" : "管理员强制审批"}
            </h2>
            {modalType !== "force" && (
              <textarea
                className="mb-4 h-24 w-full rounded border p-2"
                placeholder={modalType === "approve" ? "审批意见（可选）" : "拒绝原因（必填）"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded border px-4 py-2">取消</button>
              <button
                onClick={modalType === "approve" ? handleApprove : modalType === "reject" ? handleReject : handleApprove}
                className={`rounded px-4 py-2 text-white ${
                  modalType === "approve" || modalType === "force" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
