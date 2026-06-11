"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";
type RequestType = "order" | "contract";

interface Approval {
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
  createdAt: string;
  updatedAt: string | null;
}

interface ApprovalHistory {
  id: string;
  requestId: string;
  step: string;
  approverId: string;
  approverName: string;
  action: string;
  actionNote: string | null;
  actionAt: string;
}

interface ApprovalManagementProps {
  targetApprovalId?: string | null;
  onApprovalViewed?: () => void;
}

export default function ApprovalManagement({ targetApprovalId, onApprovalViewed }: ApprovalManagementProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showForceApproveDialog, setShowForceApproveDialog] = useState(false);
  const [note, setNote] = useState("");
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | "">("");
  const [filterRequestType, setFilterRequestType] = useState<RequestType | "">("");
  const [highlightedApprovalId, setHighlightedApprovalId] = useState<string | null>(null);

  // 获取当前用户信息
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 获取当前用户
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      // 判断是否为管理员（用户ID为'1'）
      setIsAdmin(user.id === "1");
    }
  }, []);

  const fetchApprovals = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterRequestType) params.append("requestType", filterRequestType);

      const url = params.toString()
        ? `/api/approvals?${params.toString()}`
        : "/api/approvals";

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setApprovals(json.data);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApprovalHistory = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}/history`);
      const json = await res.json();
      if (json.success) {
        setApprovalHistory(json.data);
      }
    } catch (error) {
      console.error("Error fetching approval history:", error);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus, filterRequestType]);

  // 处理 URL 参数中的 approvalId
  useEffect(() => {
    // 优先使用 targetApprovalId prop，否则使用 URL 参数
    const approvalId = targetApprovalId ?? searchParams.get('approvalId');
    
    if (approvalId) {
      // 等待数据加载完成后查找并高亮审批
      if (approvals.length > 0) {
        const targetApproval = approvals.find(a => a.id === approvalId);
        if (targetApproval) {
          setHighlightedApprovalId(approvalId);
          setSelectedApproval(targetApproval);
          console.log(`[ApprovalManagement] 找到目标审批：${approvalId}`);
          // 滚动到审批位置
          setTimeout(() => {
            const element = document.getElementById(`approval-${approvalId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('ring-2', 'ring-purple-500');
            }
          }, 100);
        } else {
          console.warn(`[ApprovalManagement] 未找到目标审批：${approvalId}`);
        }
        
        // 通知父组件已处理
        if (onApprovalViewed) {
          onApprovalViewed();
        }
      }
    }
  }, [approvals.length, targetApprovalId, searchParams]);

  const handleViewHistory = async (approval: Approval) => {
    setSelectedApproval(approval);
    await fetchApprovalHistory(approval.id);
    setShowHistory(true);
  };

  const handleApprove = async () => {
    if (!selectedApproval || !currentUser) return;

    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: currentUser.id,
          approverName: currentUser.fullName || currentUser.username,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        alert("审批已通过");
        setShowApproveDialog(false);
        setNote("");
        setSelectedApproval(null);
        await fetchApprovals();
      } else {
        const json = await res.json();
        alert(json.error || "审批失败");
      }
    } catch (error) {
      console.error("Error approving:", error);
      alert("审批失败");
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !currentUser) return;

    if (!note.trim()) {
      alert("请输入拒绝原因");
      return;
    }

    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: currentUser.id,
          approverName: currentUser.fullName || currentUser.username,
          note: note,
        }),
      });

      if (res.ok) {
        alert("审批已拒绝");
        setShowRejectDialog(false);
        setNote("");
        setSelectedApproval(null);
        await fetchApprovals();
      } else {
        const json = await res.json();
        alert(json.error || "拒绝失败");
      }
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("拒绝失败");
    }
  };

  const handleForceApprove = async () => {
    if (!selectedApproval || !currentUser) return;

    if (!confirm("确定要跳过所有审批步骤，一键完成审核吗？")) {
      return;
    }

    try {
      const res = await fetch(`/api/approvals/${selectedApproval.id}/force-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: currentUser.id,
          approverName: currentUser.fullName || currentUser.username,
          note: note || "管理员一键审核",
        }),
      });

      if (res.ok) {
        alert("一键审核完成");
        setShowForceApproveDialog(false);
        setNote("");
        setSelectedApproval(null);
        await fetchApprovals();
      } else {
        const json = await res.json();
        alert(json.error || "一键审核失败");
      }
    } catch (error) {
      console.error("Error force approving:", error);
      alert("一键审核失败");
    }
  };

  const getRequestTypeText = (requestType: string) => {
    const map: Record<string, string> = {
      order: '订单审批',
      contract: '合同审批',
      project: '项目审批',
    };
    return map[requestType] || requestType;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      pending: { text: "待审批", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
      approved: { text: "已通过", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
      rejected: { text: "已拒绝", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
      cancelled: { text: "已取消", className: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300" },
    };
    const config = statusMap[status] || { text: status, className: "bg-gray-100 text-gray-800" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.text}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">审批管理</h1>
          {isAdmin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-300">
              管理员
            </span>
          )}
        </div>
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ApprovalStatus | "")}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">所有状态</option>
            <option value="pending">待审批</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
            <option value="cancelled">已取消</option>
          </select>
          <select
            value={filterRequestType}
            onChange={(e) => setFilterRequestType(e.target.value as RequestType | "")}
            className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">所有类型</option>
            <option value="order">订单</option>
            <option value="contract">合同</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">加载中...</div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">暂无审批申请</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {filterStatus || filterRequestType ? "尝试其他筛选条件" : "还没有审批申请"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              id={`approval-${approval.id}`}
              className={`rounded-lg border p-4 transition-all ${
                highlightedApprovalId === approval.id
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500 dark:border-purple-400 dark:bg-purple-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {approval.requestNumber}
                    </span>
                    {getStatusBadge(approval.status)}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getRequestTypeText(approval.requestType)}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {approval.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                    {approval.content}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>申请人：{approval.applicantName}</span>
                    <span>申请时间：{new Date(approval.createdAt).toLocaleString("zh-CN")}</span>
                    {approval.status === "pending" && approval.currentApproverName && (
                      <span>当前审批人：{approval.currentApproverName}</span>
                    )}
                  </div>
                  {approval.approvalNote && (
                    <div className="mt-2 p-2 rounded-md bg-gray-50 dark:bg-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">审批意见：</span>
                        {approval.approvalNote}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleViewHistory(approval)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    查看历史
                  </button>
                  {approval.status === "pending" && currentUser && (
                    <div className="flex flex-col gap-2">
                      {/* 管理员一键审核 */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedApproval(approval);
                            setShowForceApproveDialog(true);
                          }}
                          className="rounded-md bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                        >
                          一键审核 (管理员)
                        </button>
                      )}
                      
                      {/* 审批按钮显示逻辑 */}
                      {/* 情况 1: currentApproverId 为空，显示给所有非申请人 */}
                      {!approval.currentApproverId && approval.applicantId !== currentUser.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowApproveDialog(true);
                            }}
                            className="rounded-md bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          >
                            ✓ 通过
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowRejectDialog(true);
                            }}
                            className="rounded-md bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                          >
                            ✗ 拒绝
                          </button>
                        </div>
                      )}
                      
                      {/* 情况 2: currentApproverId 匹配当前用户 */}
                      {approval.currentApproverId === currentUser.id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowApproveDialog(true);
                            }}
                            className="rounded-md bg-green-600 px-4 py-1.5 text-sm text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                          >
                            ✓ 通过
                          </button>
                          <button
                            onClick={() => {
                              setSelectedApproval(approval);
                              setShowRejectDialog(true);
                            }}
                            className="rounded-md bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                          >
                            ✗ 拒绝
                          </button>
                        </div>
                      )}
                      
                      {/* 情况 3: 已设置审批人但不是当前用户 */}
                      {approval.currentApproverId && approval.currentApproverId !== currentUser.id && (
                        <span className="text-xs text-gray-400 italic">
                          等待审批人：{approval.currentApproverName || approval.currentApproverId}
                        </span>
                      )}
                      
                      {/* 情况 4: 申请人自己 */}
                      {approval.applicantId === currentUser.id && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 italic">
                          您是申请人，等待他人审批
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 审批历史弹窗 */}
      {showHistory && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-lg bg-white shadow-lg dark:bg-gray-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">审批历史</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-md p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">{selectedApproval.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {selectedApproval.content}
                </p>
              </div>
              {approvalHistory.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">暂无审批记录</p>
              ) : (
                <div className="space-y-3">
                  {approvalHistory.map((history, index) => (
                    <div key={history.id} className="border-l-2 border-blue-500 pl-4 relative">
                      <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-blue-500"></div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{history.approverName}</span>
                        <span className="mx-2">•</span>
                        <span className={`font-medium ${
                          history.action === "approve" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        }`}>
                          {history.action === "approve" ? "通过" : "拒绝"}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{new Date(history.actionAt).toLocaleString("zh-CN")}</span>
                      </div>
                      {history.actionNote && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{history.actionNote}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 审批通过弹窗 */}
      {showApproveDialog && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">确认通过</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                确定要通过审批 "{selectedApproval.title}" 吗？
              </p>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                审批意见（可选）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="请输入审批意见..."
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowApproveDialog(false);
                  setNote("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleApprove}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                通过
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 审批拒绝弹窗 */}
      {showRejectDialog && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">拒绝审批</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                确定要拒绝审批 "{selectedApproval.title}" 吗？
              </p>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                拒绝原因 *
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="请输入拒绝原因..."
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setNote("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理员一键审核弹窗 */}
      {showForceApproveDialog && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">管理员一键审核</h2>
            </div>
            <div className="p-4">
              <div className="mb-4 p-3 rounded-md bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  ⚠️ 此操作将跳过所有审批步骤，直接完成审核
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                确定要一键审核 "{selectedApproval.title}" 吗？
              </p>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                审批意见（可选）
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="请输入审批意见..."
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowForceApproveDialog(false);
                  setNote("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleForceApprove}
                className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                一键审核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
