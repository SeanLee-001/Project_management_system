"use client";

import { useState, useEffect } from "react";
import type { ProjectApprovalFlow, User } from "@/storage/database/shared/schema";
import { ProjectApprovalType, UserRole } from "@/storage/database/shared/schema";
import { ResizableTable, Column } from "@/components/ResizableTable";
import { UserRoleDisplayNames } from "@/storage/database/shared/schema";

interface ApprovalFlowManagementProps {
  userId?: string;
  userRole?: string;
}

// 审批类型配置
const approvalTypes = [
  { key: "new_project", label: "新建项目", category: "项目审批" },
  { key: "edit_project", label: "编辑项目", category: "项目审批" },
  { key: "delete_project", label: "删除项目", category: "项目审批" },
  { key: "status_change", label: "状态变更", category: "项目审批" },
  { key: "member_change", label: "成员变更", category: "项目审批" },
  { key: "new_order", label: "新建订单", category: "订单审批" },
  { key: "edit_order", label: "编辑订单", category: "订单审批" },
  { key: "delete_order", label: "删除订单", category: "订单审批" },
  { key: "new_contract", label: "新建合同", category: "合同审批" },
  { key: "edit_contract", label: "编辑合同", category: "合同审批" },
  { key: "delete_contract", label: "删除合同", category: "合同审批" },
];

export default function ApprovalFlowManagement({ userId, userRole }: ApprovalFlowManagementProps) {
  const [flows, setFlows] = useState<ProjectApprovalFlow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ProjectApprovalFlow | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchDepartmentId, setBatchDepartmentId] = useState("");
  const [batchDefaultApprovers, setBatchDefaultApprovers] = useState({
    level1ApproverId: "",
    level1ApproverRole: "",
    level2ApproverId: "",
    level2ApproverRole: "",
    level3ApproverId: "",
    level3ApproverRole: "",
  });
  // 逐审批类型的覆盖配置：只存储与默认不同的
  const [batchOverrides, setBatchOverrides] = useState<Record<string, {
    level1ApproverId: string;
    level1ApproverRole: string;
    level2ApproverId: string;
    level2ApproverRole: string;
    level3ApproverId: string;
    level3ApproverRole: string;
    useOverride: boolean;
  }>>({});

  // 审批人配置类型
  interface ApproverConfig {
    level1ApproverId: string;
    level1ApproverRole: string;
    level2ApproverId: string;
    level2ApproverRole: string;
    level3ApproverId: string;
    level3ApproverRole: string;
  }

  // 表单状态
  const [formData, setFormData] = useState({
    name: "", // 流程代码
    departmentId: "",
    approvalTypes: [] as string[],
    isEnabled: true,
    // 项目审批配置
    projectApprovers: {
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    } as ApproverConfig,
    // 订单审批配置
    orderApprovers: {
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    } as ApproverConfig,
    // 合同审批配置
    contractApprovers: {
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    } as ApproverConfig,
  });

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("approval-flows-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 筛选状态
  const [filterFlowCode, setFilterFlowCode] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterApprovalType, setFilterApprovalType] = useState("");

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("approval-flows-page-size", pageSize.toString());
  }, [pageSize]);

  useEffect(() => {
    fetchFlows();
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments?active=true", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchFlows = async () => {
    try {
      const res = await fetch("/api/approval-flows?includeDisabled=true");
      const json = await res.json();
      if (json.success) {
        setFlows(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching approval flows:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // 生成流程代码（按部门生成独立的流程代码）
  const generateFlowCode = (departmentId?: string) => {
    // 获取部门的流程代码前缀
    const dept = departments.find(d => d.id === departmentId);
    const deptPrefix = dept?.departmentCode || "DEPT";
    
    // 筛选该部门的已有流程
    const deptFlows = departmentId 
      ? flows.filter(f => (f as any).departmentId === departmentId)
      : flows;
    
    // 找到该部门的最大序号
    const maxNum = deptFlows.reduce((max, flow) => {
      const code = flow.name || "";
      // 匹配格式: DEPT001-PRO001, PROJ006-PRO001 等
      const match = code.match(/-PRO(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    return `${deptPrefix}-PRO${String(maxNum + 1).padStart(3, "0")}`;
  };

  // 根据审批类型获取流程代码
  const getFlowCode = (flow: ProjectApprovalFlow) => {
    return flow.name || generateFlowCode();
  };

  const handleAdd = () => {
    setEditingFlow(null);
    setFormData({
      name: "", // 流程代码将在选择部门后自动生成
      departmentId: "",
      approvalTypes: [],
      isEnabled: true,
      projectApprovers: {
        level1ApproverId: "",
        level1ApproverRole: "",
        level2ApproverId: "",
        level2ApproverRole: "",
        level3ApproverId: "",
        level3ApproverRole: "",
      },
      orderApprovers: {
        level1ApproverId: "",
        level1ApproverRole: "",
        level2ApproverId: "",
        level2ApproverRole: "",
        level3ApproverId: "",
        level3ApproverRole: "",
      },
      contractApprovers: {
        level1ApproverId: "",
        level1ApproverRole: "",
        level2ApproverId: "",
        level2ApproverRole: "",
        level3ApproverId: "",
        level3ApproverRole: "",
      },
    });
    setShowEditModal(true);
  };

  // 根据审批类型分类获取审批人配置
  const getApproverConfigByType = (approvalType: string, flow?: ProjectApprovalFlow) => {
    const defaultConfig = {
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    };
    
    if (flow) {
      return {
        level1ApproverId: flow.level1ApproverId || "",
        level1ApproverRole: flow.level1ApproverRole || "",
        level2ApproverId: flow.level2ApproverId || "",
        level2ApproverRole: flow.level2ApproverRole || "",
        level3ApproverId: flow.level3ApproverId || "",
        level3ApproverRole: flow.level3ApproverRole || "",
      };
    }
    
    return defaultConfig;
  };

  const handleEdit = (flow: ProjectApprovalFlow) => {
    setEditingFlow(flow);
    
    // 根据审批类型设置对应的审批人配置
    const approvalType = flow.approvalType;
    const approverConfig = getApproverConfigByType(approvalType, flow);
    
    let approvers: ApproverConfig = {
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    };
    
    // 判断审批类型并设置对应的审批人配置
    if (["new_project", "edit_project", "delete_project", "status_change", "member_change"].includes(approvalType)) {
      approvers = approverConfig;
    } else if (["new_order", "edit_order", "delete_order"].includes(approvalType)) {
      approvers = approverConfig;
    } else if (["new_contract", "edit_contract", "delete_contract"].includes(approvalType)) {
      approvers = approverConfig;
    }
    
    setFormData({
      name: flow.name || "",
      departmentId: (flow as any).departmentId || "",
      approvalTypes: [approvalType],
      isEnabled: flow.isEnabled ?? true,
      projectApprovers: ["new_project", "edit_project", "delete_project", "status_change", "member_change"].includes(approvalType)
        ? approverConfig
        : { level1ApproverId: "", level1ApproverRole: "", level2ApproverId: "", level2ApproverRole: "", level3ApproverId: "", level3ApproverRole: "" },
      orderApprovers: ["new_order", "edit_order", "delete_order"].includes(approvalType)
        ? approverConfig
        : { level1ApproverId: "", level1ApproverRole: "", level2ApproverId: "", level2ApproverRole: "", level3ApproverId: "", level3ApproverRole: "" },
      contractApprovers: ["new_contract", "edit_contract", "delete_contract"].includes(approvalType)
        ? approverConfig
        : { level1ApproverId: "", level1ApproverRole: "", level2ApproverId: "", level2ApproverRole: "", level3ApproverId: "", level3ApproverRole: "" },
    });
    setShowEditModal(true);
  };

  const handleDelete = async (flow: ProjectApprovalFlow) => {
    if (!confirm(`确定要删除该审批流程吗？`)) return;

    try {
      const res = await fetch(`/api/approval-flows/${flow.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.success) {
        alert("删除成功");
        await fetchFlows();
      } else {
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting flow:", error);
      alert("删除失败，请稍后重试");
    }
  };

  const handleApprovalTypeToggle = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      approvalTypes: checked
        ? [...prev.approvalTypes, type]
        : prev.approvalTypes.filter(t => t !== type),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.approvalTypes.length === 0) {
      alert("请至少选择一个审批类型");
      return;
    }

    // 检查每个选中的审批类型是否配置了一级审批人
    const projectTypes = ["new_project", "edit_project", "delete_project", "status_change", "member_change"];
    const orderTypes = ["new_order", "edit_order", "delete_order"];
    const contractTypes = ["new_contract", "edit_contract", "delete_contract"];

    for (const type of formData.approvalTypes) {
      if (projectTypes.includes(type) && !formData.projectApprovers.level1ApproverId) {
        alert("项目审批类型必须配置一级审批人");
        return;
      }
      if (orderTypes.includes(type) && !formData.orderApprovers.level1ApproverId) {
        alert("订单审批类型必须配置一级审批人");
        return;
      }
      if (contractTypes.includes(type) && !formData.contractApprovers.level1ApproverId) {
        alert("合同审批类型必须配置一级审批人");
        return;
      }
    }

    try {
      // 为每个选中的审批类型创建一条流程记录
      // 如果是编辑模式，使用现有流程代码；如果是新增模式，生成新的流程代码（按部门）
      const flowCode = editingFlow 
        ? editingFlow.name 
        : (formData.name || generateFlowCode(formData.departmentId || undefined));
      
      for (const approvalType of formData.approvalTypes) {
        // 根据审批类型选择对应的审批人配置
        let approverConfig = {
          level1ApproverId: "",
          level1ApproverRole: "",
          level2ApproverId: "",
          level2ApproverRole: "",
          level3ApproverId: "",
          level3ApproverRole: "",
        };
        
        if (projectTypes.includes(approvalType)) {
          approverConfig = formData.projectApprovers;
        } else if (orderTypes.includes(approvalType)) {
          approverConfig = formData.orderApprovers;
        } else if (contractTypes.includes(approvalType)) {
          approverConfig = formData.contractApprovers;
        }

        const submitData = {
          name: flowCode,
          description: "",
          departmentId: formData.departmentId,
          approvalType,
          isEnabled: formData.isEnabled,
          level1ApproverId: approverConfig.level1ApproverId,
          level1ApproverRole: approverConfig.level1ApproverRole,
          level2ApproverId: approverConfig.level2ApproverId || "",
          level2ApproverRole: approverConfig.level2ApproverRole || "",
          level3ApproverId: approverConfig.level3ApproverId || "",
          level3ApproverRole: approverConfig.level3ApproverRole || "",
        };

        const url = editingFlow
          ? `/api/approval-flows/${editingFlow.id}`
          : "/api/approval-flows";
        const method = editingFlow ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        const json = await res.json();

        if (!json.success) {
          alert(json.error || (editingFlow ? "更新失败" : "创建失败"));
          return;
        }
      }

      alert(editingFlow ? "更新成功" : "创建成功");
      setShowEditModal(false);
      setEditingFlow(null);
      await fetchFlows();
    } catch (error) {
      console.error("Error saving flow:", error);
      alert("保存失败，请稍后重试");
    }
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return "-";
    const user = users.find(u => u.id === userId);
    return user ? (user.fullName || user.username) : "-";
  };

  const getRoleName = (role: string | null | undefined) => {
    if (!role) return "-";
    return UserRoleDisplayNames[role as keyof typeof UserRoleDisplayNames] || role;
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

  // 处理审批人变更
  const handleApproverChange = async (flowId: string, level: 1 | 2 | 3, newApproverId: string, newApproverRole: string) => {
    try {
      const updateData: any = {};
      if (level === 1) {
        updateData.level1ApproverId = newApproverId;
        updateData.level1ApproverRole = newApproverRole;
      } else if (level === 2) {
        updateData.level2ApproverId = newApproverId;
        updateData.level2ApproverRole = newApproverRole;
      } else if (level === 3) {
        updateData.level3ApproverId = newApproverId;
        updateData.level3ApproverRole = newApproverRole;
      }

      const res = await fetch(`/api/approval-flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const json = await res.json();

      if (json.success) {
        await fetchFlows();
      } else {
        alert(json.error || "更新失败");
        await fetchFlows();
      }
    } catch (error) {
      console.error("Error updating approver:", error);
      alert("更新失败，请稍后重试");
      await fetchFlows();
    }
  };

  // 处理状态切换
  const handleStatusToggle = async (flowId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const confirmText = newStatus
      ? "确定要启用该审批流程吗？"
      : "确定要停用该审批流程吗？";

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/approval-flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newStatus }),
      });

      const json = await res.json();

      if (json.success) {
        alert(newStatus ? "审批流程已启用" : "审批流程已停用");
        await fetchFlows();
      } else {
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error toggling status:", error);
      alert("更新失败，请稍后重试");
    }
  };

  // ========== 按部门批量设置 ==========
  const handleOpenBatchModal = () => {
    setBatchDepartmentId("");
    setBatchDefaultApprovers({
      level1ApproverId: "",
      level1ApproverRole: "",
      level2ApproverId: "",
      level2ApproverRole: "",
      level3ApproverId: "",
      level3ApproverRole: "",
    });
    setBatchOverrides({});
    setShowBatchModal(true);
  };

  // 选择部门时，加载该部门已有的审批流程配置
  const handleBatchDeptChange = (deptId: string) => {
    setBatchDepartmentId(deptId);
    if (!deptId) return;

    // 查找该部门已有的流程，取第一个流程的审批人作为默认值
    const deptFlows = flows.filter(f => (f as any).departmentId === deptId);
    if (deptFlows.length > 0) {
      const firstFlow = deptFlows[0];
      setBatchDefaultApprovers({
        level1ApproverId: firstFlow.level1ApproverId || "",
        level1ApproverRole: firstFlow.level1ApproverRole || "",
        level2ApproverId: firstFlow.level2ApproverId || "",
        level2ApproverRole: firstFlow.level2ApproverRole || "",
        level3ApproverId: firstFlow.level3ApproverId || "",
        level3ApproverRole: firstFlow.level3ApproverRole || "",
      });

      // 加载各审批类型的已有配置为覆盖
      const overrides: typeof batchOverrides = {};
      approvalTypeOptions.forEach(opt => {
        const existingFlow = deptFlows.find(f => f.approvalType === opt.key);
        if (existingFlow) {
          // 检查是否与默认配置相同
          const isSame = existingFlow.level1ApproverId === (firstFlow.level1ApproverId || "") &&
            existingFlow.level2ApproverId === (firstFlow.level2ApproverId || "") &&
            existingFlow.level3ApproverId === (firstFlow.level3ApproverId || "");
          overrides[opt.key] = {
            level1ApproverId: existingFlow.level1ApproverId || "",
            level1ApproverRole: existingFlow.level1ApproverRole || "",
            level2ApproverId: existingFlow.level2ApproverId || "",
            level2ApproverRole: existingFlow.level2ApproverRole || "",
            level3ApproverId: existingFlow.level3ApproverId || "",
            level3ApproverRole: existingFlow.level3ApproverRole || "",
            useOverride: !isSame,
          };
        } else {
          overrides[opt.key] = {
            level1ApproverId: "",
            level1ApproverRole: "",
            level2ApproverId: "",
            level2ApproverRole: "",
            level3ApproverId: "",
            level3ApproverRole: "",
            useOverride: false,
          };
        }
      });
      setBatchOverrides(overrides);
    } else {
      setBatchDefaultApprovers({
        level1ApproverId: "",
        level1ApproverRole: "",
        level2ApproverId: "",
        level2ApproverRole: "",
        level3ApproverId: "",
        level3ApproverRole: "",
      });
      const overrides: typeof batchOverrides = {};
      approvalTypeOptions.forEach(opt => {
        overrides[opt.key] = {
          level1ApproverId: "",
          level1ApproverRole: "",
          level2ApproverId: "",
          level2ApproverRole: "",
          level3ApproverId: "",
          level3ApproverRole: "",
          useOverride: false,
        };
      });
      setBatchOverrides(overrides);
    }
  };

  // 批量保存
  const handleBatchSave = async () => {
    if (!batchDepartmentId) {
      alert("请选择部门");
      return;
    }
    if (!batchDefaultApprovers.level1ApproverId) {
      alert("请设置默认一级审批人");
      return;
    }

    const dept = departments.find(d => d.id === batchDepartmentId);
    const deptPrefix = dept?.departmentCode || "DEPT";
    const deptFlows = flows.filter(f => (f as any).departmentId === batchDepartmentId);

    try {
      for (const opt of approvalTypeOptions) {
        // 判断该审批类型是否使用覆盖配置
        const override = batchOverrides[opt.key];
        const useOverride = override?.useOverride;
        const approvers = useOverride && override ? {
          level1ApproverId: override.level1ApproverId || batchDefaultApprovers.level1ApproverId,
          level1ApproverRole: override.level1ApproverRole || batchDefaultApprovers.level1ApproverRole,
          level2ApproverId: override.level2ApproverId || batchDefaultApprovers.level2ApproverId,
          level2ApproverRole: override.level2ApproverRole || batchDefaultApprovers.level2ApproverRole,
          level3ApproverId: override.level3ApproverId || batchDefaultApprovers.level3ApproverId,
          level3ApproverRole: override.level3ApproverRole || batchDefaultApprovers.level3ApproverRole,
        } : { ...batchDefaultApprovers };

        // 如果覆盖配置中一级审批人为空，使用默认配置
        if (!approvers.level1ApproverId) continue;

        // 查找该部门+该审批类型是否已有流程
        const existingFlow = deptFlows.find(f => f.approvalType === opt.key);
        
        const submitData = {
          name: existingFlow?.name || `${deptPrefix}-PRO${String(deptFlows.length + approvalTypeOptions.indexOf(opt) + 1).padStart(3, "0")}`,
          description: "",
          departmentId: batchDepartmentId,
          approvalType: opt.key,
          isEnabled: existingFlow?.isEnabled ?? true,
          ...approvers,
        };

        const url = existingFlow ? `/api/approval-flows/${existingFlow.id}` : "/api/approval-flows";
        const method = existingFlow ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        });
        const json = await res.json();
        if (!json.success) {
          alert(`${opt.label} 保存失败: ${json.error || "未知错误"}`);
          return;
        }
      }

      alert("批量设置成功");
      setShowBatchModal(false);
      await fetchFlows();
    } catch (error) {
      console.error("Error batch saving:", error);
      alert("批量保存失败，请稍后重试");
    }
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 定义表格列配置
  const flowColumns: Column<ProjectApprovalFlow>[] = [
    {
      key: "flowCode",
      title: "流程代码",
      width: 100,
      sortable: true,
      render: (_, row) => row.name || "-",
    },
    {
      key: "departmentId",
      title: "所属部门",
      width: 120,
      sortable: false,
      render: (_, row) => {
        const dept = departments.find(d => d.id === (row as any).departmentId);
        return dept ? dept.departmentName : <span className="text-gray-400">-</span>;
      },
    },
    {
      key: "approvalType",
      title: "审批类型",
      width: 100,
      sortable: true,
      render: (_, row) => getApprovalTypeText(row.approvalType),
    },
    {
      key: "approvers",
      title: "审批人",
      width: 450,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          {/* 一级审批人 */}
          <select
            value={row.level1ApproverId || ""}
            onChange={(e) => {
              const newApproverId = e.target.value;
              const user = users.find(u => u.id === newApproverId);
              const newRole = user?.role || "";
              handleApproverChange(row.id, 1, newApproverId, newRole);
            }}
            className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1 max-w-[120px]"
          >
            <option value="">一级</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.username}
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          {/* 二级审批人 */}
          <select
            value={row.level2ApproverId || ""}
            onChange={(e) => {
              const newApproverId = e.target.value;
              const user = users.find(u => u.id === newApproverId);
              const newRole = user?.role || "";
              handleApproverChange(row.id, 2, newApproverId, newRole);
            }}
            className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1 max-w-[120px]"
          >
            <option value="">二级</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.username}
              </option>
            ))}
          </select>
          <span className="text-gray-400">→</span>
          {/* 三级审批人 */}
          <select
            value={row.level3ApproverId || ""}
            onChange={(e) => {
              const newApproverId = e.target.value;
              const user = users.find(u => u.id === newApproverId);
              const newRole = user?.role || "";
              handleApproverChange(row.id, 3, newApproverId, newRole);
            }}
            className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-2 py-1 max-w-[120px]"
          >
            <option value="">三级</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.fullName || user.username}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: "isEnabled",
      title: "状态",
      width: 80,
      sortable: true,
      render: (_, row) => (
        <button
          onClick={() => handleStatusToggle(row.id, row.isEnabled ?? false)}
          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
            row.isEnabled
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-400 text-white hover:bg-gray-500"
          }`}
        >
          {row.isEnabled ? "启用" : "停用"}
        </button>
      ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 100,
      sortable: true,
      render: (_, row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      title: "操作",
      width: 100,
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="px-2 py-1 text-xs rounded border border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
          >
            编辑
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="px-2 py-1 text-xs rounded border border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // 筛选后的流程列表
  const filteredFlows = flows.filter(flow => {
    // 流程代码筛选
    if (filterFlowCode && flow.name !== filterFlowCode) {
      return false;
    }
    // 所属部门筛选
    if (filterDepartment && (flow as any).departmentId !== filterDepartment) {
      return false;
    }
    // 审批类型筛选
    if (filterApprovalType && flow.approvalType !== filterApprovalType) {
      return false;
    }
    return true;
  });

  // 获取所有流程代码（去重）
  const allFlowCodes = [...new Set(flows.map(f => f.name).filter(Boolean))].sort();

  // 审批类型选项
  const approvalTypeOptions = [
    { key: "new_project", label: "新建项目" },
    { key: "edit_project", label: "编辑项目" },
    { key: "delete_project", label: "删除项目" },
    { key: "status_change", label: "状态变更" },
    { key: "member_change", label: "成员变更" },
    { key: "new_order", label: "新建订单" },
    { key: "edit_order", label: "编辑订单" },
    { key: "delete_order", label: "删除订单" },
    { key: "new_contract", label: "新建合同" },
    { key: "edit_contract", label: "编辑合同" },
    { key: "delete_contract", label: "删除合同" },
  ];

  // 重置筛选
  const handleResetFilters = () => {
    setFilterFlowCode("");
    setFilterDepartment("");
    setFilterApprovalType("");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">审批流程配置</h2>
        <div className="flex gap-2">
          <button
            onClick={handleOpenBatchModal}
            className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            按部门批量设置
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            新增流程
          </button>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="bg-gray-800 dark:bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 流程代码筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">流程代码</label>
            <select
              value={filterFlowCode}
              onChange={(e) => {
                setFilterFlowCode(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部</option>
              {allFlowCodes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          {/* 所属部门筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">所属部门</label>
            <select
              value={filterDepartment}
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.departmentName}</option>
              ))}
            </select>
          </div>

          {/* 审批类型筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">审批类型</label>
            <select
              value={filterApprovalType}
              onChange={(e) => {
                setFilterApprovalType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部</option>
              {approvalTypeOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 重置按钮 */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              重置筛选
            </button>
          </div>
        </div>
      </div>

      <ResizableTable
        columns={flowColumns}
        data={filteredFlows}
        storageKey="approval-flows"
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* 编辑/新增模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4 pt-10">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {editingFlow ? "编辑审批流程" : "新增审批流程"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 顶部：流程代码 + 部门 + 启用状态 */}
                <div className="flex gap-4 items-start">
                  {/* 流程代码 */}
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      流程代码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="选择部门后自动生成"
                      required
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* 所属部门 */}
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      所属部门
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => {
                        const newDeptId = e.target.value;
                        // 如果是新增模式且选择了部门，自动生成流程代码
                        const newFlowCode = !editingFlow && newDeptId 
                          ? generateFlowCode(newDeptId) 
                          : formData.name;
                        setFormData({ ...formData, departmentId: newDeptId, name: newFlowCode });
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">请选择部门（可选）</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.departmentName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 启用状态 */}
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isEnabled"
                      checked={formData.isEnabled}
                      onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isEnabled" className="text-sm text-gray-700 dark:text-gray-300">
                      启用该流程
                    </label>
                  </div>
                </div>

                {/* 审批类型 - 紧凑布局 */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    审批类型 *
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {/* 项目审批 */}
                    <div className={`flex-1 min-w-[200px] p-3 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_project", "edit_project", "delete_project", "status_change", "member_change"].includes(t)) ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">项目审批</h5>
                      <div className="grid grid-cols-2 gap-1">
                        {approvalTypes.filter(t => t.category === "项目审批").map(type => (
                          <label key={type.key} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.approvalTypes.includes(type.key)}
                              onChange={(e) => handleApprovalTypeToggle(type.key, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 订单审批 */}
                    <div className={`flex-1 min-w-[200px] p-3 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_order", "edit_order", "delete_order"].includes(t)) ? "border-green-500 bg-green-50/50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">订单审批</h5>
                      <div className="grid grid-cols-1 gap-1">
                        {approvalTypes.filter(t => t.category === "订单审批").map(type => (
                          <label key={type.key} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.approvalTypes.includes(type.key)}
                              onChange={(e) => handleApprovalTypeToggle(type.key, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 合同审批 */}
                    <div className={`flex-1 min-w-[200px] p-3 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_contract", "edit_contract", "delete_contract"].includes(t)) ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">合同审批</h5>
                      <div className="grid grid-cols-1 gap-1">
                        {approvalTypes.filter(t => t.category === "合同审批").map(type => (
                          <label key={type.key} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.approvalTypes.includes(type.key)}
                              onChange={(e) => handleApprovalTypeToggle(type.key, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                {/* 审批人配置 - 按审批类型分组 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">审批节点配置</h4>
                  <div className="space-y-4">
                    {/* 项目审批配置 */}
                    <div className={`p-4 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_project", "edit_project", "delete_project", "status_change", "member_change"].includes(t)) ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3">项目审批</h5>
                      <div className="flex items-center gap-4">
                        {/* 一级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            一级审批人 *
                          </label>
                          <select
                            value={formData.projectApprovers.level1ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                projectApprovers: {
                                  ...formData.projectApprovers,
                                  level1ApproverId: e.target.value,
                                  level1ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 二级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            二级审批人
                          </label>
                          <select
                            value={formData.projectApprovers.level2ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                projectApprovers: {
                                  ...formData.projectApprovers,
                                  level2ApproverId: e.target.value,
                                  level2ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 三级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            三级审批人
                          </label>
                          <select
                            value={formData.projectApprovers.level3ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                projectApprovers: {
                                  ...formData.projectApprovers,
                                  level3ApproverId: e.target.value,
                                  level3ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 订单审批配置 */}
                    <div className={`p-4 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_order", "edit_order", "delete_order"].includes(t)) ? "border-green-500 bg-green-50/50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-3">订单审批</h5>
                      <div className="flex items-center gap-4">
                        {/* 一级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            一级审批人 *
                          </label>
                          <select
                            value={formData.orderApprovers.level1ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                orderApprovers: {
                                  ...formData.orderApprovers,
                                  level1ApproverId: e.target.value,
                                  level1ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 二级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            二级审批人
                          </label>
                          <select
                            value={formData.orderApprovers.level2ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                orderApprovers: {
                                  ...formData.orderApprovers,
                                  level2ApproverId: e.target.value,
                                  level2ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 三级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            三级审批人
                          </label>
                          <select
                            value={formData.orderApprovers.level3ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                orderApprovers: {
                                  ...formData.orderApprovers,
                                  level3ApproverId: e.target.value,
                                  level3ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 合同审批配置 */}
                    <div className={`p-4 rounded-lg border-2 ${formData.approvalTypes.some(t => ["new_contract", "edit_contract", "delete_contract"].includes(t)) ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/20" : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"}`}>
                      <h5 className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-3">合同审批</h5>
                      <div className="flex items-center gap-4">
                        {/* 一级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            一级审批人 *
                          </label>
                          <select
                            value={formData.contractApprovers.level1ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                contractApprovers: {
                                  ...formData.contractApprovers,
                                  level1ApproverId: e.target.value,
                                  level1ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 二级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            二级审批人
                          </label>
                          <select
                            value={formData.contractApprovers.level2ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                contractApprovers: {
                                  ...formData.contractApprovers,
                                  level2ApproverId: e.target.value,
                                  level2ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-5">→</span>

                        {/* 三级审批人 */}
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                            三级审批人
                          </label>
                          <select
                            value={formData.contractApprovers.level3ApproverId}
                            onChange={(e) => {
                              const user = users.find(u => u.id === e.target.value);
                              setFormData({
                                ...formData,
                                contractApprovers: {
                                  ...formData.contractApprovers,
                                  level3ApproverId: e.target.value,
                                  level3ApproverRole: user?.role || "",
                                }
                              });
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">请选择</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName || user.username} ({getRoleName(user.role)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingFlow(null);
                    }}
                    className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 按部门批量设置模态框 */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4 pt-10">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                按部门批量设置审批人
              </h3>

              {/* 第一步：选择部门 */}
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  选择部门 <span className="text-red-500">*</span>
                </label>
                <select
                  value={batchDepartmentId}
                  onChange={(e) => handleBatchDeptChange(e.target.value)}
                  className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">请选择部门</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              {batchDepartmentId && (
                <>
                  {/* 第二步：设置默认审批人（适用于该部门所有审批类型） */}
                  <div className="mb-6 p-4 rounded-lg border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20">
                    <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                      默认审批人（适用于该部门所有审批类型）
                    </h4>
                    <div className="flex items-center gap-4">
                      {/* 一级审批人 */}
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          一级审批人 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={batchDefaultApprovers.level1ApproverId}
                          onChange={(e) => {
                            const user = users.find(u => u.id === e.target.value);
                            setBatchDefaultApprovers({
                              ...batchDefaultApprovers,
                              level1ApproverId: e.target.value,
                              level1ApproverRole: user?.role || "",
                            });
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">请选择</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.fullName || user.username} ({getRoleName(user.role)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-gray-400 mt-5">→</span>

                      {/* 二级审批人 */}
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          二级审批人
                        </label>
                        <select
                          value={batchDefaultApprovers.level2ApproverId}
                          onChange={(e) => {
                            const user = users.find(u => u.id === e.target.value);
                            setBatchDefaultApprovers({
                              ...batchDefaultApprovers,
                              level2ApproverId: e.target.value,
                              level2ApproverRole: user?.role || "",
                            });
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">请选择</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.fullName || user.username} ({getRoleName(user.role)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <span className="text-gray-400 mt-5">→</span>

                      {/* 三级审批人 */}
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                          三级审批人
                        </label>
                        <select
                          value={batchDefaultApprovers.level3ApproverId}
                          onChange={(e) => {
                            const user = users.find(u => u.id === e.target.value);
                            setBatchDefaultApprovers({
                              ...batchDefaultApprovers,
                              level3ApproverId: e.target.value,
                              level3ApproverRole: user?.role || "",
                            });
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">请选择</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.fullName || user.username} ({getRoleName(user.role)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 第三步：逐审批类型覆盖设置 */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      单独审批类型设置（勾选"自定义"可覆盖默认审批人）
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-gray-300 dark:border-gray-600">
                            <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300 w-28">分类</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300 w-28">审批类型</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300 w-20">自定义</th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">一级审批人</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300 w-8"></th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">二级审批人</th>
                            <th className="text-center py-2 px-3 font-medium text-gray-700 dark:text-gray-300 w-8"></th>
                            <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">三级审批人</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvalTypeOptions.map(opt => {
                            const override = batchOverrides[opt.key];
                            const useOverride = override?.useOverride || false;
                            return (
                              <tr key={opt.key} className={`border-b border-gray-200 dark:border-gray-700 ${useOverride ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                                <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">{approvalTypes.find(t => t.key === opt.key)?.category || ""}</td>
                                <td className="py-2 px-3 text-xs font-medium text-gray-900 dark:text-gray-100">{opt.label}</td>
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={useOverride}
                                    onChange={(e) => {
                                      setBatchOverrides(prev => ({
                                        ...prev,
                                        [opt.key]: {
                                          ...(prev[opt.key] || { level1ApproverId: "", level1ApproverRole: "", level2ApproverId: "", level2ApproverRole: "", level3ApproverId: "", level3ApproverRole: "" }),
                                          useOverride: e.target.checked,
                                        }
                                      }));
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                </td>
                                {/* 一级审批人 */}
                                <td className="py-1 px-1">
                                  {useOverride ? (
                                    <select
                                      value={override?.level1ApproverId || ""}
                                      onChange={(e) => {
                                        const user = users.find(u => u.id === e.target.value);
                                        setBatchOverrides(prev => ({
                                          ...prev,
                                          [opt.key]: {
                                            ...(prev[opt.key] || {}),
                                            level1ApproverId: e.target.value,
                                            level1ApproverRole: user?.role || "",
                                          }
                                        }));
                                      }}
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                      <option value="">选择</option>
                                      {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                          {user.fullName || user.username}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {getUserName(batchDefaultApprovers.level1ApproverId)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-1 text-center text-gray-400">→</td>
                                {/* 二级审批人 */}
                                <td className="py-1 px-1">
                                  {useOverride ? (
                                    <select
                                      value={override?.level2ApproverId || ""}
                                      onChange={(e) => {
                                        const user = users.find(u => u.id === e.target.value);
                                        setBatchOverrides(prev => ({
                                          ...prev,
                                          [opt.key]: {
                                            ...(prev[opt.key] || {}),
                                            level2ApproverId: e.target.value,
                                            level2ApproverRole: user?.role || "",
                                          }
                                        }));
                                      }}
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                      <option value="">选择</option>
                                      {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                          {user.fullName || user.username}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {getUserName(batchDefaultApprovers.level2ApproverId)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-1 px-1 text-center text-gray-400">→</td>
                                {/* 三级审批人 */}
                                <td className="py-1 px-1">
                                  {useOverride ? (
                                    <select
                                      value={override?.level3ApproverId || ""}
                                      onChange={(e) => {
                                        const user = users.find(u => u.id === e.target.value);
                                        setBatchOverrides(prev => ({
                                          ...prev,
                                          [opt.key]: {
                                            ...(prev[opt.key] || {}),
                                            level3ApproverId: e.target.value,
                                            level3ApproverRole: user?.role || "",
                                          }
                                        }));
                                      }}
                                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                      <option value="">选择</option>
                                      {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                          {user.fullName || user.username}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {getUserName(batchDefaultApprovers.level3ApproverId)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleBatchSave}
                  className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  批量保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
