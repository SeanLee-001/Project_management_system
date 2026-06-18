"use client";

import { useState, useEffect } from "react";
import type { ProjectApproval, ProjectApprovalStep, User } from "@/storage/database/shared/schema";
import { ProjectApprovalType, ProjectApprovalStatus } from "@/storage/database/shared/schema";
import { ResizableTable, Column } from "@/components/ResizableTable";

interface ProjectApprovalProps {
  projectId?: string;
  userId?: string;
  userRole?: string;
  targetApprovalId?: string | null;
  targetApprovalType?: string | null;
  onApprovalViewed?: () => void;
  onApprovalCompleted?: () => void;
}

export default function ProjectApproval({ projectId, userId, userRole, targetApprovalId, targetApprovalType, onApprovalViewed, onApprovalCompleted }: ProjectApprovalProps) {
  const [approvals, setApprovals] = useState<ProjectApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingApproval, setRejectingApproval] = useState<ProjectApproval | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewDetailApproval, setViewDetailApproval] = useState<ProjectApproval | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [viewDetailProject, setViewDetailProject] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferringApproval, setTransferringApproval] = useState<ProjectApproval | null>(null);
  const [transferTargetUserId, setTransferTargetUserId] = useState<string>("");
  const [transferReason, setTransferReason] = useState("");

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("project-approvals-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 10;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 在组件加载时重置当前页码为第一页
  useEffect(() => {
    setCurrentPage(1);
  }, []);

  // 保存 pageSize 到 localStorage
  useEffect(() => {
    localStorage.setItem("project-approvals-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchApprovals();
  }, [projectId]);

  // 获取用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUsersList(json.data);
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // 当数据变化时，确保当前页码不超过总页数
  useEffect(() => {
    const totalPages = Math.ceil(approvals.length / pageSize);
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    } else if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [approvals.length, pageSize, currentPage]);

  // 当审批数据加载完成且有目标审批 ID 时，滚动到对应的审批记录
  useEffect(() => {
    if (targetApprovalId && !isLoading && approvals.length > 0) {
      // 查找目标审批
      const targetIndex = approvals.findIndex(a => a.id === targetApprovalId);
      
      if (targetIndex === -1) {
        // 未找到目标审批，记录日志
        console.warn(`[ProjectApproval] 未找到目标审批：${targetApprovalId}`, {
          approvalsLength: approvals.length,
          first10Ids: approvals.map(a => a.id).slice(0, 10)
        });
        if (onApprovalViewed) {
          onApprovalViewed();
        }
        return;
      }
      
      // 等待一小段时间确保 DOM 已渲染
      setTimeout(() => {
        const targetPage = Math.floor(targetIndex / pageSize) + 1;
        setCurrentPage(targetPage);

        // 等待分页更新后再滚动
        setTimeout(() => {
          const tableRows = document.querySelectorAll('tbody tr');
          const rowIndexInPage = targetIndex % pageSize;
          if (tableRows[rowIndexInPage]) {
            tableRows[rowIndexInPage].scrollIntoView({ behavior: "smooth", block: "center" });
            tableRows[rowIndexInPage].classList.add("ring-2", "ring-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
            setTimeout(() => {
              tableRows[rowIndexInPage].classList.remove("ring-2", "ring-blue-500", "bg-blue-50", "dark:bg-blue-900/20");
            }, 3000);
          }
          if (onApprovalViewed) {
            onApprovalViewed();
          }
        }, 200);
      }, 300);
    } else if (targetApprovalId && !isLoading && approvals.length === 0) {
      console.warn(`[ProjectApproval] 审批列表为空，无法定位目标审批：${targetApprovalId}`);
      if (onApprovalViewed) {
        onApprovalViewed();
      }
    }
  }, [targetApprovalId, isLoading, approvals.length, pageSize, onApprovalViewed]);

  const fetchApprovals = async () => {
    try {
      const url = projectId
        ? `/api/project-approvals?projectId=${projectId}`
        : "/api/project-approvals";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        // 重置页码为第一页
        setCurrentPage(1);
        // 排序：pending 状态的排在前面，其他状态按创建时间倒序
        const sortedApprovals = (json.data || []).sort((a: ProjectApproval, b: ProjectApproval) => {
          if (a.status === "pending" && b.status !== "pending") return -1;
          if (a.status !== "pending" && b.status === "pending") return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setApprovals(sortedApprovals);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (approval: ProjectApproval) => {
    // 系统管理员和超级管理员可以跳过所有审核流程，直接审核
    // 支持多种角色格式：system_admin, admin, 管理员，系统管理员等
    const roleStr = String(userRole || "");
    console.log('[DEBUG handleApprove]', {
      userRole,
      roleStr,
      userId,
      currentApproverId: approval.currentApproverId,
    });
    
    // 判断是否为系统管理员（支持中英文）
    const isAdmin = roleStr === "system_admin" || 
                    roleStr === "超级管理员" || 
                    roleStr === "系统管理员" ||
                    roleStr.toLowerCase().includes("admin") ||
                    roleStr.toLowerCase().includes("管理员");
    
    const isCurrentApprover = approval.currentApproverId === userId;
    
    console.log('[DEBUG handleApprove result]', {
      isAdmin,
      isCurrentApprover,
      canApprove: isAdmin || isCurrentApprover,
    });
    
    if (!isAdmin && !isCurrentApprover) {
      alert("您不是当前审批人，无法审批\n\n调试信息:\nuserRole: " + userRole + "\nroleStr: " + roleStr + "\nisAdmin: " + isAdmin);
      return;
    }

    if (!confirm(`确定要通过该项目审批吗？\n项目：${approval.approvalType}`)) return;

    try {
      const res = await fetch(`/api/project-approvals/${approval.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: userId,
          isSystemAdmin: isAdmin,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        console.error('[Approve HTTP Error]', { status: res.status, statusText: res.statusText, json });
        alert(json.error || `HTTP 错误：${res.status}`);
        return;
      }

      if (json.success) {
        alert(json.message || "审批已通过");
        await fetchApprovals();
        if (onApprovalCompleted) {
          onApprovalCompleted();
        }
      } else {
        console.error('[Approve Error]', json);
        alert(json.error || "审批失败");
      }
    } catch (error) {
      console.error("Error approving approval:", error);
      alert("审批失败，请稍后重试");
    }
  };

  const handleReject = (approval: ProjectApproval) => {
    setRejectingApproval(approval);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApproval) return;

    if (!rejectReason.trim()) {
      alert("请输入拒绝原因");
      return;
    }

    // 系统管理员和超级管理员可以跳过所有审核流程，直接审核
    const roleStr = String(userRole || "");
    
    // 判断是否为系统管理员（支持中英文）
    const isAdmin = roleStr === "system_admin" || 
                    roleStr === "超级管理员" || 
                    roleStr === "系统管理员" ||
                    roleStr.toLowerCase().includes("admin") ||
                    roleStr.toLowerCase().includes("管理员");
    
    const isCurrentApprover = rejectingApproval.currentApproverId === userId;
    
    console.log('[DEBUG handleRejectSubmit]', {
      userRole,
      roleStr,
      isAdmin,
      isCurrentApprover,
      canApprove: isAdmin || isCurrentApprover,
    });
    
    if (!isAdmin && !isCurrentApprover) {
      alert("您不是当前审批人，无法审批\n\n调试信息:\nuserRole: " + userRole + "\nroleStr: " + roleStr + "\nisAdmin: " + isAdmin);
      return;
    }


    try {
      const res = await fetch(`/api/project-approvals/${rejectingApproval.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approverId: userId,
          rejectReason: rejectReason.trim(),
          isSystemAdmin: isAdmin,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        console.error('[Reject HTTP Error]', { status: res.status, statusText: res.statusText, json });
        alert(json.error || `HTTP 错误：${res.status}`);
        return;
      }

      if (json.success) {
        alert(json.message || "审批已拒绝");
        setShowRejectDialog(false);
        setRejectingApproval(null);
        setRejectReason("");
        await fetchApprovals();
        if (onApprovalCompleted) {
          onApprovalCompleted();
        }
      } else {
        alert(json.error || "审批失败");
      }
    } catch (error) {
      console.error("Error rejecting approval:", error);
      alert("审批失败，请稍后重试");
    }
  };

  const handleViewDetail = async (approval: ProjectApproval) => {
    setViewDetailApproval(approval);
    setViewDetailProject(null); // 先清空之前的数据
    setIsLoadingProject(true);
    setShowDetailDialog(true);

    // 先从 approvalData 中解析项目信息
    try {
      if (approval.approvalData) {
        const parsedData = JSON.parse(approval.approvalData);
        // 处理不同的审批数据结构
        let projectInfo = null;
        if (parsedData.projectData && (parsedData.projectData.projectCode || parsedData.projectData.name)) {
          // 新建项目审批，数据在 projectData 中
          projectInfo = parsedData.projectData;
        } else if (parsedData && (parsedData.projectCode || parsedData.name)) {
          // 其他类型的审批，数据直接在 parsedData 中
          projectInfo = parsedData;
        }
        // 如果 approvalData 中包含完整的项目信息，直接使用
        if (projectInfo) {
          setViewDetailProject(projectInfo);
          setIsLoadingProject(false);
          return;
        }
      }
    } catch (error) {
      console.error("Error parsing approvalData:", error);
    }

    // 如果 approvalData 中没有项目信息，尝试从 API 获取
    try {
      if (approval.projectId) {
        const res = await fetch(`/api/projects/${approval.projectId}`);
        if (!res.ok) {
          // API失败时，尝试回退到approvalData
          if (approval.approvalData) {
            try {
              const parsedData = JSON.parse(approval.approvalData);
              let fallbackData = null;
              if (parsedData.projectData && (parsedData.projectData.projectCode || parsedData.projectData.name)) {
                // 新建项目审批，数据在 projectData 中
                fallbackData = parsedData.projectData;
              } else if (parsedData && (parsedData.projectCode || parsedData.name)) {
                // 其他类型的审批，数据直接在 parsedData 中
                fallbackData = parsedData;
              }
              if (fallbackData) {
                setViewDetailProject(fallbackData);
                console.warn("API failed, using approvalData as fallback");
              } else {
                console.warn("API failed and approvalData is empty");
              }
            } catch (error) {
              console.error("Error parsing approvalData as fallback:", error);
            }
          } else {
            console.warn("API failed and no approvalData available");
          }
          return;
        }
        const json = await res.json();
        if (json.success && json.data) {
          setViewDetailProject(json.data);
        } else {
          console.error("Invalid response format:", json);
        }
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const getApprovalTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      new_project: "新建项目",
      edit_project: "编辑项目",
      delete_project: "删除项目",
      status_change: "状态变更",
      member_change: "成员变更",
      new_order: "新建订单",
      edit_order: "编辑订单",
      delete_order: "删除订单",
      new_contract: "新建合同",
      edit_contract: "编辑合同",
      delete_contract: "删除合同",
    };
    return typeMap[type] || type;
  };

  const getApprovalTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      new_project: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      edit_project: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      delete_project: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      status_change: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      member_change: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      new_order: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      edit_order: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      delete_order: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      new_contract: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      edit_contract: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      delete_contract: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    };
    return colorMap[type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  // 格式化审批数据，将JSON转换为友好的显示格式
  // 根据用户 ID 获取用户名称
  const getUserNames = () => {
    const names: Record<string, string> = {};
    usersList.forEach(user => {
      names[user.id] = user.fullName || user.username || user.id;
    });
    return names;
  };

  // 根据用户 ID 获取用户名称
  const getUserNameById = (userId: string | null | undefined) => {
    if (!userId) return '-';
    const user = usersList.find(u => u.id === userId);
    return user?.fullName || user?.username || userId;
  };

  const formatApprovalData = (approvalType: string, data: any): React.ReactNode => {
    // 状态映射
    const statusMap: Record<string, string> = {
      active: "进行中",
      completed: "已完成",
      paused: "已暂停",
      cancelled: "已取消",
    };

    // 字段名映射
    const fieldNameMap: Record<string, string> = {
      name: "项目名称",
      description: "项目描述",
      status: "项目状态",
      startDate: "开始日期",
      endDate: "结束日期",
      projectManager: "项目经理",
      mechanicalLead: "机械负责人",
      electricalLead: "电气负责人",
      visualLead: "视觉负责人",
      softwareLead: "软件负责人",
      algorithmLead: "算法负责人",
      procurement: "采购",
      planning: "计划",
      production: "生产",
      quality: "质量",
      fieldProjectLead: "现场项目经理",
      business: "商务",
      safety: "安全",
      customerName: "客户名称",
      projectCode: "项目编号",
    };

    switch (approvalType) {
      case "member_change": {
        const oldMembers = data.oldCustomMembers ? (typeof data.oldCustomMembers === 'string' ? JSON.parse(data.oldCustomMembers) : data.oldCustomMembers) : [];
        const newMembers = data.customMembers ? (typeof data.customMembers === 'string' ? JSON.parse(data.customMembers) : data.customMembers) : [];

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectName || "-"}</p>
              </div>
            </div>
            
            {oldMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-2">变更前成员（将被移除）</p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-red-200 dark:border-red-800">
                        <th className="text-left py-1 px-2 text-red-600 dark:text-red-400">角色</th>
                        <th className="text-left py-1 px-2 text-red-600 dark:text-red-400">姓名</th>
                        <th className="text-left py-1 px-2 text-red-600 dark:text-red-400">电话</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oldMembers.map((member: any, idx: number) => (
                        <tr key={idx} className="border-b border-red-100 dark:border-red-900">
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.role || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.name || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {newMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-500 dark:text-green-400 mb-2">变更后成员（将新增）</p>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-green-200 dark:border-green-800">
                        <th className="text-left py-1 px-2 text-green-600 dark:text-green-400">角色</th>
                        <th className="text-left py-1 px-2 text-green-600 dark:text-green-400">姓名</th>
                        <th className="text-left py-1 px-2 text-green-600 dark:text-green-400">电话</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newMembers.map((member: any, idx: number) => (
                        <tr key={idx} className="border-b border-green-100 dark:border-green-900">
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.role || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.name || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {oldMembers.length === 0 && newMembers.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无成员变更</p>
            )}
          </div>
        );
      }

      case "status_change": {
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectName || "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p className="text-xs font-medium text-red-500 dark:text-red-400">变更前状态</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{statusMap[data.oldStatus] || data.oldStatus || "-"}</p>
              </div>
              <div className="text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="flex-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <p className="text-xs font-medium text-green-500 dark:text-green-400">变更后状态</p>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{statusMap[data.newStatus] || data.newStatus || "-"}</p>
              </div>
            </div>
          </div>
        );
      }

      case "edit_project": {
        const updates = data.updates || {};
        const updateKeys = Object.keys(updates);
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectName || "-"}</p>
              </div>
            </div>
            {updateKeys.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">修改内容</p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg space-y-2">
                  {updateKeys.map((key) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 min-w-[80px]">
                        {fieldNameMap[key] || key}:
                      </span>
                      <div className="flex-1">
                        <span className="text-xs text-red-500 dark:text-red-400 line-through">{String(updates[key]?.old || "-")}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-xs text-green-500 dark:text-green-400">{String(updates[key]?.new || "-")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      case "delete_project": {
        return (
          <div className="space-y-3">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">删除确认</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">此操作将永久删除项目，审批通过后无法恢复。</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.projectName || "-"}</p>
              </div>
            </div>
          </div>
        );
      }

      case "new_project": {
        const projectData = data.projectData || {};
        const customMembers = data.customMembers ? (typeof data.customMembers === 'string' ? JSON.parse(data.customMembers) : data.customMembers) : [];
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.projectCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.name || "-"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目描述</p>
              <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.description || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">开始日期</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.startDate || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">结束日期</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.endDate || "-"}</p>
              </div>
            </div>
            {customMembers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">项目成员</p>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600">
                        <th className="text-left py-1 px-2 text-gray-500 dark:text-gray-400">角色</th>
                        <th className="text-left py-1 px-2 text-gray-500 dark:text-gray-400">姓名</th>
                        <th className="text-left py-1 px-2 text-gray-500 dark:text-gray-400">电话</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customMembers.map((member: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-600">
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.role || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.name || "-"}</td>
                          <td className="py-1.5 px-2 text-gray-700 dark:text-gray-300">{member.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "edit_contract": {
        const updates = data.updates || {};
        const updateKeys = Object.keys(updates);
        
        // 合同字段名映射
        const contractFieldMap: Record<string, string> = {
          contractName: "合同名称",
          contractDate: "合同日期",
          customerName: "客户名称",
          contractAmount: "合同金额",
          technicalManager: "技术负责人",
          technicalPhone: "技术负责人电话",
          procurementManager: "采购负责人",
          procurementPhone: "采购负责人电话",
        };
        
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">合同编号</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.contractCode || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">合同名称</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">{data.contractName || "-"}</p>
              </div>
            </div>
            {updateKeys.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">变更内容</p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg space-y-2">
                  {updateKeys.map((key) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 min-w-[100px]">
                        {contractFieldMap[key] || key}:
                      </span>
                      <div className="flex-1">
                        <span className="text-xs text-red-500 dark:text-red-400 line-through">{String(updates[key]?.old || "(空)")}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-xs text-green-500 dark:text-green-400">{String(updates[key]?.new || "(空)")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {updateKeys.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无字段变更</p>
            )}
          </div>
        );
      }

      default:
        return (
          <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  const handleCancel = async (approval: ProjectApproval) => {
    if (!confirm(`确定要撤销该审批吗？\n项目：${approval.approvalType}`)) return;

    try {
      const res = await fetch(`/api/project-approvals/${approval.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert("审批已撤销");
        await fetchApprovals();
      } else {
        alert(json.error || "撤销失败");
      }
    } catch (error) {
      console.error("Error cancelling approval:", error);
      alert("撤销失败，请稍后重试");
    }
  };

  const handleTransfer = (approval: ProjectApproval) => {
    setTransferringApproval(approval);
    setTransferTargetUserId("");
    setTransferReason("");
    setShowTransferDialog(true);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringApproval) return;

    if (!transferTargetUserId) {
      alert("请选择接收人");
      return;
    }

    try {
      const res = await fetch(`/api/project-approvals/${transferringApproval.id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: transferTargetUserId,
          reason: transferReason.trim() || "",
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert("审批已转交");
        setShowTransferDialog(false);
        setTransferringApproval(null);
        setTransferTargetUserId("");
        setTransferReason("");
        await fetchApprovals();
        if (onApprovalCompleted) {
          onApprovalCompleted();
        }
      } else {
        alert(json.error || "转交失败");
      }
    } catch (error) {
      console.error("Error transferring approval:", error);
      alert("转交失败，请稍后重试");
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "待审批",
      approved: "已通过",
      rejected: "已拒绝",
      cancelled: "已取消",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // 定义表格列配置
  const approvalColumns: Column<ProjectApproval>[] = [
    {
      key: "projectName",
      title: "项目名称",
      width: 200,
      sortable: true,
      render: (_, row) => {
        try {
          const data = row.approvalData ? JSON.parse(row.approvalData) : {};
          // 处理不同的审批数据结构
          let projectName = "-";
          if (data.projectName) {
            // 直接包含项目名称（编辑项目等）
            projectName = data.projectName;
          } else if (data.projectData && data.projectData.name) {
            // 新建项目审批，项目名称在 projectData.name 中
            projectName = data.projectData.name;
          }

          // 如果是新建项目审批，显示"新需求"标识（红色字体+爆炸型外框）
          if (row.approvalType === "new_project") {
            return (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="truncate text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline"
                  onClick={() => handleViewDetail(row)}
                >
                  {projectName}
                </span>
                <div className="relative inline-flex items-center flex-shrink-0">
                  {/* 爆炸型 SVG 外框 */}
                  <svg
                    className="absolute -inset-1 w-16 h-6 text-red-600 animate-pulse"
                    viewBox="0 0 100 40"
                    fill="none"
                  >
                    <polygon
                      points="50,0 60,10 80,5 75,20 95,30 75,35 80,50 60,40 50,45 40,40 20,50 25,35 5,30 25,20 20,5 40,10"
                      fill="currentColor"
                      opacity="0.2"
                    />
                    <polygon
                      points="50,2 58,10 78,6 74,20 92,28 74,33 78,46 58,38 50,42 42,38 22,46 26,33 8,28 26,20 22,6 42,10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="relative inline-flex items-center px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                    新需求
                  </span>
                </div>
              </div>
            );
          }

          return (
            <span
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline"
              onClick={() => handleViewDetail(row)}
            >
              {projectName}
            </span>
          );
        } catch {
          return "-";
        }
      },
    },
    {
      key: "approvalType",
      title: "审批类型",
      width: 120,
      sortable: true,
      render: (value) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getApprovalTypeColor(value)}`}>
          {getApprovalTypeText(value)}
        </span>
      ),
    },
    {
      key: "applicantName",
      title: "申请人",
      width: 120,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "currentApproverName",
      title: "当前审批人",
      width: 120,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "currentLevel",
      title: "当前层级",
      width: 100,
      sortable: true,
      render: (value) => {
        const levelMap: Record<string, string> = {
          level_1: "一级",
          level_2: "二级",
          level_3: "三级",
        };
        return levelMap[value] || value;
      },
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(value)}`}>
          {getStatusText(value)}
        </span>
      ),
    },
    {
      key: "rejectReason",
      title: "拒绝原因",
      width: 200,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "createdAt",
      title: "提交时间",
      width: 160,
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "actions",
      title: "操作",
      width: 260,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2 justify-end flex-wrap">
          {row.status === "pending" && (
            <>
              {/* 申请人本人可以撤销审批 */}
              {userId && row.applicantId === userId && (
                <button
                  onClick={() => handleCancel(row)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  撤销
                </button>
              )}
              {/* 审批按钮 - 系统管理员、超级管理员或当前审批人可见 */}
              {(() => {
                const roleStr = String(userRole || "");
                // 判断是否为系统管理员（支持中英文）
                const isAdmin = roleStr === "system_admin" || 
                               roleStr === "超级管理员" || 
                               roleStr === "系统管理员" ||
                               roleStr.toLowerCase().includes("admin") ||
                               roleStr.toLowerCase().includes("管理员");
                const isCurrentApprover = row.currentApproverId === userId;
                const showButtons = isAdmin || isCurrentApprover;
                
                console.log('[DEBUG Button Render]', {
                  userRole,
                  roleStr,
                  isAdmin,
                  isCurrentApprover,
                  showButtons,
                });
                
                return showButtons;
              })() && (
                <>
                  <button
                    onClick={() => handleApprove(row)}
                    className="rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                    title="系统管理员可直接审批所有项目"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(row)}
                    className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                    title="系统管理员可直接审批所有项目"
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => handleTransfer(row)}
                    className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                    title="转交给其他人审批"
                  >
                    转交
                  </button>
                </>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  // 调试输出：检查权限
  useEffect(() => {
    console.log('[ProjectApproval Debug]', {
      userRole,
      userId,
      isSystemAdmin: userRole === "system_admin" || userRole === "super_admin",
      totalApprovals: approvals.length,
      pendingApprovals: approvals.filter(a => a.status === "pending").length,
    });
  }, [userRole, userId, approvals]);

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex-shrink-0 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            项目审批流程
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            管理项目审批流程和记录
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">加载中...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            暂无审批记录
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            项目提交后将会显示在此处
          </p>
        </div>
      ) : (
        <>
          <ResizableTable
            columns={approvalColumns}
            data={approvals.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            storageKey="project-approvals"
            showPagination={false}
          />

          <div className="mt-4 flex-shrink-0 flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                每页显示
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value, 10);
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                共 {approvals.length} 条记录
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  首页
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  上一页
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentPage} / {Math.ceil(approvals.length / pageSize) || 1} 页
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(Math.ceil(approvals.length / pageSize) || 1, prev + 1)
                    )
                  }
                  disabled={currentPage >= Math.ceil(approvals.length / pageSize)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  下一页
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.ceil(approvals.length / pageSize) || 1)
                  }
                  disabled={currentPage >= Math.ceil(approvals.length / pageSize)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && rejectingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  拒绝审批
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getApprovalTypeText(rejectingApproval.approvalType)}
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  拒绝原因 *
                </label>
                <textarea
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  rows={4}
                  placeholder="请输入拒绝原因"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  拒绝原因将通知申请人
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectingApproval(null);
                    setRejectReason("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-5 py-2.5 text-sm font-medium text-white hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md transition-all"
                >
                  确认拒绝
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Dialog */}
      {showTransferDialog && transferringApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  转交审批
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {getApprovalTypeText(transferringApproval.approvalType)}
                </p>
              </div>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  接收人 *
                </label>
                <select
                  required
                  value={transferTargetUserId}
                  onChange={(e) => setTransferTargetUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors"
                >
                  <option value="">请选择接收人</option>
                  {usersList
                    .filter(u => u.id !== userId)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullName || user.username}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  转交原因
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  rows={3}
                  placeholder="请输入转交原因（选填）"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferDialog(false);
                    setTransferringApproval(null);
                    setTransferTargetUserId("");
                    setTransferReason("");
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md transition-all"
                >
                  确认转交
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {showDetailDialog && viewDetailApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm dark:bg-black/70">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-800 transform transition-all flex flex-col max-h-[90vh]">
            {/* 固定标题栏 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    审批详情
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getApprovalTypeText(viewDetailApproval.approvalType)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailDialog(false);
                  setViewDetailApproval(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
            </div>

            {/* 可滚动内容区域 */}
            <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">审批类型</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getApprovalTypeColor(viewDetailApproval.approvalType)}`}>
                    {getApprovalTypeText(viewDetailApproval.approvalType)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">状态</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(viewDetailApproval.status)}`}>
                    {getStatusText(viewDetailApproval.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">申请人</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewDetailApproval.applicantName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">当前审批人</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewDetailApproval.currentApproverName || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">当前层级</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewDetailApproval.currentLevel}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">提交时间</p>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewDetailApproval.createdAt)}</p>
                </div>
              </div>

              {viewDetailApproval.rejectReason && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">拒绝原因</p>
                  <p className="text-sm text-gray-900 dark:text-white">{viewDetailApproval.rejectReason}</p>
                </div>
              )}

              {viewDetailApproval.approvalData && (() => {
                try {
                  const parsedData = JSON.parse(viewDetailApproval.approvalData);
                  return (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">审批详情</p>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        {formatApprovalData(viewDetailApproval.approvalType, parsedData)}
                      </div>
                    </div>
                  );
                } catch (error) {
                  return (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">审批数据</p>
                      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-sm text-red-600 dark:text-red-400">
                        数据解析错误: {(error as Error).message}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* 项目完整信息 */}
              {(() => {
                // 优先使用 viewDetailProject，如果没有则从 approvalData 中解析
                let projectData = viewDetailProject;
                const isFallback = !viewDetailProject && viewDetailApproval?.approvalData;
                if (isFallback) {
                  try {
                    const parsedData = JSON.parse(viewDetailApproval.approvalData!);
                    // 处理不同的审批数据结构
                    if (parsedData.projectData && (parsedData.projectData.projectCode || parsedData.projectData.name)) {
                      // 新建项目审批，数据在 projectData 中
                      projectData = parsedData.projectData;
                    } else if (parsedData && (parsedData.projectCode || parsedData.name)) {
                      // 其他类型的审批，数据直接在 parsedData 中
                      projectData = parsedData;
                    }
                  } catch (error) {
                    console.error("Error parsing approvalData:", error);
                  }
                }

                if (projectData) {
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">项目完整信息</p>
                        {isFallback && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            从审批数据加载（项目可能已被删除）
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目编号</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).projectCode || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目名称</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.name || "-"}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目描述</p>
                          <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.description || "-"}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">状态</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.status || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">负责人</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.ownerId || "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">开始日期</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.startDate ? new Date(projectData.startDate).toLocaleDateString('zh-CN') : "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">结束日期</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{projectData.endDate ? new Date(projectData.endDate).toLocaleDateString('zh-CN') : "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">客户ID</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).customerId || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">客户名称</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).customerName || "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目经理</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                              {getUserNameById((projectData as any).projectManager)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">项目经理电话</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).projectManagerPhone || "-"}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">订单号</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).orderNumber || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">合同号</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{(projectData as any).contractCode || "-"}</p>
                          </div>
                        </div>

                        {(projectData as any).customMembers && (() => {
                          try {
                            const members = typeof (projectData as any).customMembers === 'string' 
                              ? JSON.parse((projectData as any).customMembers) 
                              : (projectData as any).customMembers;
                            if (Array.isArray(members) && members.length > 0) {
                              return (
                                <div>
                                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">项目成员</p>
                                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100 dark:bg-gray-600">
                                        <tr>
                                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">角色</th>
                                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">姓名</th>
                                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">电话</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {members.map((member: any, idx: number) => (
                                          <tr key={idx} className="border-t border-gray-200 dark:border-gray-600">
                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{member.role || "-"}</td>
                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{member.name || "-"}</td>
                                            <td className="py-2 px-3 text-gray-900 dark:text-white">{member.phone || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            }
                          } catch (e) {
                            // 解析失败时显示原始数据
                            return (
                              <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500">自定义成员</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{(projectData as any).customMembers}</p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                }

                return (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">项目完整信息</p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      {isLoadingProject ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">正在加载项目信息...</p>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 dark:text-red-400 space-y-2">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="font-medium">无法加载项目信息</p>
                              <p className="text-xs mt-1 text-red-500 dark:text-red-500">
                                项目可能已被删除或ID不正确。审批数据中也未找到项目信息。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
