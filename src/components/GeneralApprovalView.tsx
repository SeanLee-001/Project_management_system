"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Undo2, RefreshCw } from "lucide-react";

interface GeneralApproval {
  id: string;
  requestNumber: string;
  requestType: string;
  requestId: string;
  title: string;
  content: string;
  status: string;
  applicantId: string;
  applicantName: string;
  currentApproverId: string;
  currentApproverName: string;
  currentStep: string;
  totalSteps: string;
  approvalDate: string | null;
  approvalNote: string | null;
  relatedData: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface GeneralApprovalViewProps {
  userId?: string;
  userRole?: string;
  targetApprovalId?: string | null;
  onApprovalViewed?: () => void;
  onApprovalCompleted?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  order: "订单",
  contract: "合同",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "待审批",
  approved: "已通过",
  rejected: "已拒绝",
  cancelled: "已撤销",
};
const STEP_LABELS: Record<string, string> = {
  level1: "一级",
  level2: "二级",
  level3: "三级",
};

export default function GeneralApprovalView({
  userId,
  userRole,
  targetApprovalId: initialTargetApprovalId,
  onApprovalCompleted,
}: GeneralApprovalViewProps) {
  const [approvals, setApprovals] = useState<GeneralApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      const json = await res.json();
      if (json.success) {
        const sorted = (json.data || []).sort((a: GeneralApproval, b: GeneralApproval) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setApprovals(sorted);
      }
    } catch (error) {
      console.error("Error fetching general approvals:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (initialTargetApprovalId && !isLoading) {
      setHighlightId(initialTargetApprovalId);
      timer = setTimeout(() => {
        setHighlightId(null);
      }, 4000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [initialTargetApprovalId, isLoading]);

  const isAdmin = (() => {
    const roleStr = String(userRole || "");
    return roleStr === "system_admin" || roleStr === "admin" || roleStr.includes("管理员");
  })();

  const handleApprove = async (approval: GeneralApproval) => {
    setActionLoading(approval.id);
    try {
      const endpoint = isAdmin && approval.currentApproverId !== userId
        ? `/api/approvals/${approval.id}/force-approve`
        : `/api/approvals/${approval.id}/approve`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: userId,
          approverName: userRole === "system_admin" ? "系统管理员" : (approval.applicantName || "管理员"),
          note: isAdmin && approval.currentApproverId !== userId ? "管理员一键审核通过" : "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("审批已通过");
        fetchApprovals();
        if (onApprovalCompleted) onApprovalCompleted();
      } else {
        alert(json.error || "审批失败");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert("审批失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    setActionLoading(rejectingId);
    try {
      const res = await fetch(`/api/approvals/${rejectingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: userId,
          approverName: "管理员",
          note: rejectNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert("审批已拒绝");
        setShowRejectDialog(false);
        setRejectingId(null);
        setRejectNote("");
        fetchApprovals();
        if (onApprovalCompleted) onApprovalCompleted();
      } else {
        alert(json.error || "操作失败");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (approval: GeneralApproval) => {
    if (!confirm("确定要撤销此审批吗？")) return;
    setActionLoading(approval.id);
    try {
      const res = await fetch(`/api/approvals/${approval.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (json.success) {
        alert("审批已撤销");
        fetchApprovals();
        if (onApprovalCompleted) onApprovalCompleted();
      } else {
        alert(json.error || "撤销失败");
      }
    } catch (error) {
      console.error("Error cancelling:", error);
      alert("撤销失败");
    } finally {
      setActionLoading(null);
    }
  };

  const canApprove = (approval: GeneralApproval) => {
    if (approval.status !== "pending") return false;
    if (isAdmin) return true;
    return approval.currentApproverId === userId;
  };

  const canCancel = (approval: GeneralApproval) => {
    if (approval.status !== "pending") return false;
    return approval.applicantId === userId || isAdmin;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载中...</span>
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无审批数据
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* All approvals table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">通用审批列表</h3>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
              {approvals.length} 条
            </span>
          </div>
          <button
            onClick={fetchApprovals}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">审批编号</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">标题</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">类型</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">申请人</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">进度</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">状态</th>
                <th className="text-left text-sm font-semibold text-gray-900 px-4 py-3">时间</th>
                <th className="text-center text-sm font-semibold text-gray-900 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => (
                <tr
                  key={approval.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    highlightId === approval.id ? "bg-blue-50 ring-2 ring-blue-500" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{approval.requestNumber}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                    {approval.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {TYPE_LABELS[approval.requestType] || approval.requestType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{approval.applicantName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {STEP_LABELS[approval.currentStep] || approval.currentStep}
                    {approval.totalSteps && ` / ${STEP_LABELS[approval.totalSteps] || approval.totalSteps}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      approval.status === "pending"
                        ? "bg-orange-100 text-orange-700"
                        : approval.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : approval.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {STATUS_LABELS[approval.status] || approval.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(approval.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {approval.status === "pending" && canApprove(approval) && (
                        <>
                          <button
                            onClick={() => handleApprove(approval)}
                            disabled={actionLoading === approval.id}
                            className="h-7 px-2 rounded text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            title="通过"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setRejectingId(approval.id); setShowRejectDialog(true); }}
                            disabled={actionLoading === approval.id}
                            className="h-7 px-2 rounded text-xs border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="拒绝"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {approval.status === "pending" && canCancel(approval) && (
                        <button
                          onClick={() => handleCancel(approval)}
                          disabled={actionLoading === approval.id}
                          className="h-7 px-2 rounded text-xs border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          title="撤销"
                        >
                          <Undo2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">拒绝审批</h3>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="请输入拒绝原因（选填）"
              className="w-full h-24 rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-red-400"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRejectDialog(false); setRejectingId(null); setRejectNote(""); }}
                className="h-9 px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
