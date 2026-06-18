"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { exportContracts } from "@/utils/excelExport";
import { generateImportTemplate, contractImportColumns } from "@/utils/excelImport";
import { Pencil, Trash2, Undo2, Unlock } from "lucide-react";
import { ResizableTable, Column } from "@/components/ResizableTable";
import { checkPermission, showNoPermissionAlert } from "@/lib/permissionUtils";

type ContractStatus = "active" | "inactive";

export default function ContractManagement() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [hasEditPermission, setHasEditPermission] = useState<boolean | null>(null);
  const [hasDeletePermission, setHasDeletePermission] = useState<boolean | null>(null);

  // 检查权限
  useEffect(() => {
    const checkPermissions = async () => {
      const edit = await checkPermission("contracts", "edit");
      const deletePerm = await checkPermission("contracts", "delete");
      setHasEditPermission(edit);
      setHasDeletePermission(deletePerm);
    };
    checkPermissions();
  }, []);

  const [contractForm, setContractForm] = useState({
    contractCode: "",
    contractName: "",
    contractDate: "",
    customerName: "",
    customerCode: "",
    customerId: "",
    contractAmount: "",
    technicalManager: "",
    technicalPhone: "",
    procurementManager: "",
    procurementPhone: "",
    attachment1Url: "", // 技术协议
    attachment2Url: "", // 项目合同
    attachment3Url: "", // 订单
    status: "active" as ContractStatus,
    needApproval: false,
  });

  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contracts-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 视图状态
  const [viewType, setViewType] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contracts-view-type");
      if (saved === "table" || saved === "card") return saved;
    }
    return "table";
  });

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("contracts-page-size", pageSize.toString());
  }, [pageSize]);

  // 保存viewType到localStorage
  useEffect(() => {
    localStorage.setItem("contracts-view-type", viewType);
  }, [viewType]);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // 重置到第一页
  };

  useEffect(() => {
    fetchContracts();
    fetchCustomers();
  }, []);

  const fetchContracts = useCallback(async (keyword?: string) => {
    try {
      const url = keyword
        ? `/api/contracts?search=${encodeURIComponent(keyword)}`
        : "/api/contracts";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setContracts(json.data);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setContracts]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data.filter((c: any) => c.status === "active"));
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [setCustomers]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    fetchContracts(keyword);
  };

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setContractForm({ ...contractForm, customerName: name });

    if (name) {
      const filtered = customers.filter((c) =>
        c.customerName.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  };

  const handleCustomerSelect = async (customer: any) => {
    // 先填充客户基本信息
    setContractForm({
      ...contractForm,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      customerId: customer.id,
    });
    setShowCustomerDropdown(false);

    // 获取客户联系人信息
    try {
      const res = await fetch(`/api/customers/${customer.id}/contacts`);
      const json = await res.json();
      if (json.success) {
        const contacts = json.data;
        // 查找技术负责人
        const technicalContact = contacts.find(
          (c: any) => c.contactType === "technical"
        );
        // 查找采购负责人
        const procurementContact = contacts.find(
          (c: any) => c.contactType === "procurement"
        );

        // 填充联系人信息
        setContractForm((prev) => ({
          ...prev,
          technicalManager: technicalContact?.contactName || "",
          technicalPhone: technicalContact?.contactPhone || "",
          procurementManager: procurementContact?.contactName || "",
          procurementPhone: procurementContact?.contactPhone || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching customer contacts:", error);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    attachmentType: "attachment1" | "attachment2" | "attachment3"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        if (attachmentType === "attachment1") {
          setContractForm({ ...contractForm, attachment1Url: json.data.url });
        } else if (attachmentType === "attachment2") {
          setContractForm({ ...contractForm, attachment2Url: json.data.url });
        } else if (attachmentType === "attachment3") {
          setContractForm({ ...contractForm, attachment3Url: json.data.url });
        }
      } else {
        alert(json.error || "文件上传失败");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("文件上传失败");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证是否已选择客户
    if (!contractForm.customerId) {
      alert("请从下拉列表中选择客户");
      return;
    }

    try {
      // 先创建合同
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractForm),
      });

      if (res.ok) {
        const json = await res.json();

        // 自动创建审批申请
        try {
          // 获取当前用户信息
          const userStr = localStorage.getItem("user");
          const user = userStr ? JSON.parse(userStr) : null;

          if (!user || !user.id) {
            console.error("获取用户信息失败，无法创建审批申请");
          } else {
            // 获取审批流程配置
            let currentApproverId = "1";
            let currentApproverName = "系统管理员";
            let totalSteps = "level1";
            
            try {
              const flowsRes = await fetch("/api/approval-flows?approvalType=new_contract&includeDisabled=false");
              const flowsJson = await flowsRes.json();
              if (flowsJson.success && flowsJson.data && flowsJson.data.length > 0) {
                const flow = flowsJson.data[0];
                if (flow.level1ApproverId) {
                  currentApproverId = flow.level1ApproverId;
                  currentApproverName = flow.level1ApproverRole || "审批人";
                  if (flow.level3ApproverId) {
                    totalSteps = "level3";
                  } else if (flow.level2ApproverId) {
                    totalSteps = "level2";
                  }
                }
              }
            } catch (e) {
              console.warn("获取审批流程失败，使用默认配置:", e);
            }

            // 创建审批申请
            const approvalRes = await fetch("/api/approvals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestType: "contract",
                requestId: json.data.id,
                title: `合同审批 - ${contractForm.contractName}`,
                content: `合同编码：${contractForm.contractCode}\n合同名称：${contractForm.contractName}\n客户：${contractForm.customerName}\n合同金额：${contractForm.contractAmount}`,
                applicantId: user.id,
                applicantName: user.fullName || user.username,
                currentApproverId,
                currentApproverName,
                totalSteps,
                relatedData: JSON.stringify({
                  contractCode: contractForm.contractCode,
                  contractName: contractForm.contractName,
                  customerName: contractForm.customerName,
                  contractAmount: contractForm.contractAmount,
                }),
              }),
            });

            if (approvalRes.ok) {
              const approvalJson = await approvalRes.json();
            } else {
              console.error("创建审批申请失败:", await approvalRes.text());
              alert("合同已创建，但创建审批申请失败");
            }
          }
        } catch (approvalError) {
          console.error("Error creating approval:", approvalError);
          alert("合同已创建，但创建审批申请失败");
        }

        await fetchContracts(searchKeyword);
        setShowContractForm(false);
        resetContractForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating contract:", error);
      alert("创建合同失败");
    }
  };

  const handleUpdateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract) return;

    // 验证是否已选择客户
    if (!contractForm.customerId) {
      alert("请从下拉列表中选择客户");
      return;
    }

    // 检查合同是否有待审批的申请
    if (editingContract.approvalStatus === "pending") {
      alert("该合同有待审批的申请，请等待审批完成或撤销当前审批后再编辑");
      return;
    }

    // 获取当前用户信息
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user || !user.id) {
      alert("获取用户信息失败");
      return;
    }

    // 确认提交审批
    if (!confirm(`确定要提交合同变更审批吗？\n\n合同编号：${contractForm.contractCode}\n合同名称：${contractForm.contractName}\n\n提交后将创建审批申请，审批通过后合同变更才会生效。`)) {
      return;
    }

    try {
      // 获取合同原始数据用于比较变更内容
      const contractRes = await fetch(`/api/contracts/${editingContract.id}`);
      const contractJson = await contractRes.json();
      if (!contractJson.success) {
        alert("获取合同信息失败");
        return;
      }
      const originalData = contractJson.data;

      // 计算变更内容
      const updates: Record<string, { old: any; new: any }> = {};
      const fieldsToCompare = [
        { key: 'contractName', label: '合同名称' },
        { key: 'contractDate', label: '合同日期' },
        { key: 'customerName', label: '客户名称' },
        { key: 'contractAmount', label: '合同金额' },
        { key: 'technicalManager', label: '技术负责人' },
        { key: 'technicalPhone', label: '技术负责人电话' },
        { key: 'procurementManager', label: '采购负责人' },
        { key: 'procurementPhone', label: '采购负责人电话' },
      ];

      fieldsToCompare.forEach(({ key, label }) => {
        const oldValue = originalData[key] || '';
        const newValue = (contractForm as any)[key] || '';
        if (oldValue !== newValue) {
          updates[key] = { old: oldValue, new: newValue };
        }
      });

      // 创建编辑合同审批记录
      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestType: "contract",
          requestId: editingContract.id,
          title: `编辑合同审批 - ${contractForm.contractName}`,
          content: `合同变更申请\n\n合同编号：${contractForm.contractCode}\n合同名称：${contractForm.contractName}\n\n变更内容：${Object.keys(updates).length > 0 ? Object.entries(updates).map(([key, { old: oldVal, new: newVal }]) => `${fieldsToCompare.find(f => f.key === key)?.label || key}：${oldVal || '(空)'} → ${newVal || '(空)'}`).join('\n') : '无'}`,
          applicantId: user.id,
          applicantName: user.fullName || user.username,
          totalSteps: "level1",
          relatedData: JSON.stringify({
            contractId: editingContract.id,
            contractCode: contractForm.contractCode,
            contractName: contractForm.contractName,
            updates: updates,
          }),
        }),
      });

      if (approvalRes.ok) {
        const approvalJson = await approvalRes.json();
        if (approvalJson.success) {
          alert("编辑合同已提交审批，请等待审批通过");
          await fetchContracts(searchKeyword);
          setEditingContract(null);
          setShowContractForm(false);
          resetContractForm();
        } else {
          alert(approvalJson.error || "提交审批失败");
        }
      } else {
        const json = await approvalRes.json();
        alert(json.error || "提交审批失败");
      }
    } catch (error) {
      console.error("Error updating contract:", error);
      alert("提交审批失败，请稍后重试");
    }
  };

  const handleDeleteContract = async (contract: any) => {
    // 检查审批状态，如果正在审批中，不允许重复提交
    const approvalStatus = contract.approvalStatus;
    if (approvalStatus === "pending") {
      alert("该合同正在审批中，不允许删除。请先撤销审批后再操作。");
      return;
    }

    if (!confirm(`确定要删除此合同吗？\n\n合同编号：${contract.contractCode}\n合同名称：${contract.contractName}\n\n此操作将提交审批，审批通过后合同将被删除！`)) return;

    // 获取当前用户信息
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user || !user.id) {
      alert("获取用户信息失败，无法提交审批申请");
      return;
    }

    try {
      // 获取合同详情用于审批数据
      const contractRes = await fetch(`/api/contracts/${contract.id}`);
      const contractJson = await contractRes.json();
      if (!contractJson.success) {
        alert("获取合同信息失败");
        return;
      }
      const contractData = contractJson.data;

      // 获取审批流程配置
      let currentApproverId = "1";
      let currentApproverName = "系统管理员";
      let totalSteps = "level1";
      
      try {
        const flowsRes = await fetch("/api/approval-flows?approvalType=delete_contract&includeDisabled=false");
        const flowsJson = await flowsRes.json();
        if (flowsJson.success && flowsJson.data && flowsJson.data.length > 0) {
          const flow = flowsJson.data[0];
          if (flow.level1ApproverId) {
            currentApproverId = flow.level1ApproverId;
            currentApproverName = flow.level1ApproverRole || "审批人";
            if (flow.level3ApproverId) {
              totalSteps = "level3";
            } else if (flow.level2ApproverId) {
              totalSteps = "level2";
            }
          }
        }
      } catch (e) {
        console.warn("获取审批流程失败，使用默认配置:", e);
      }

      // 创建删除合同审批记录
      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestType: "contract",
          requestId: contract.id,
          title: `删除合同：${contractData.contractName}`,
          content: `合同编号：${contractData.contractCode}\n合同名称：${contractData.contractName}\n客户名称：${contractData.customerName}\n合同金额：${contractData.contractAmount}\n操作：删除`,
          applicantId: user.id,
          applicantName: user.username || user.id,
          currentApproverId,
          currentApproverName,
          totalSteps,
          relatedData: JSON.stringify({
            operation: "delete",
            contractId: contract.id,
            contractCode: contractData.contractCode,
            contractName: contractData.contractName,
          }),
        }),
      });

      const approvalJson = await approvalRes.json();
      if (approvalJson.success) {
        alert("删除申请已提交，等待审批");
        await fetchContracts(searchKeyword);
      } else {
        alert("提交审批失败：" + (approvalJson.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error creating delete approval:", error);
      alert("提交审批失败，请稍后重试");
    }
  };

  const handleStatusChange = async (contractId: string, newStatus: ContractStatus) => {
    try {
      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchContracts(searchKeyword);
      } else {
        const json = await res.json();
        alert(json.error || "更新状态失败");
      }
    } catch (error) {
      console.error("Error updating contract status:", error);
      alert("更新合同状态失败");
    }
  };

  const handleViewContract = (contract: any) => {
    handleEditContract(contract);
  };

  const handleEditContract = (contract: any) => {
    if (contract.approvalStatus === "pending") {
      alert("该合同正在审批中，不允许编辑。请先撤销审批后再编辑。");
      return;
    }

    setEditingContract(contract);
    setContractForm({
      contractCode: contract.contractCode,
      contractName: contract.contractName,
      contractDate: contract.contractDate ? contract.contractDate.split('T')[0] : "",
      customerName: contract.customerName,
      customerCode: contract.customerCode,
      customerId: contract.customerId,
      contractAmount: contract.contractAmount || "",
      technicalManager: contract.technicalManager || "",
      technicalPhone: contract.technicalPhone || "",
      procurementManager: contract.procurementManager || "",
      procurementPhone: contract.procurementPhone || "",
      attachment1Url: contract.attachment1Url || "", // 技术协议
      attachment2Url: contract.attachment2Url || "", // 项目合同
      attachment3Url: contract.attachment3Url || "", // 订单
      status: contract.status as ContractStatus,
      needApproval: false, // 编辑时不允许修改审批状态
    });
    setShowContractForm(true);
  };

  const handleCancelContractApproval = async (contract: any) => {
    const approvalRequestId = contract.approvalRequestId;
    if (!approvalRequestId) {
      alert("该合同没有关联的审批申请");
      return;
    }

    if (!confirm("确定要撤销该合同的审批吗？\n\n撤销后可以重新编辑并再次提交审批。")) {
      return;
    }

    try {
      // 获取当前用户信息
      const userRes = await fetch("/api/auth/current-user");
      const userJson = await userRes.json();
      if (!userJson.success || !userJson.data) {
        alert("获取用户信息失败");
        return;
      }
      const currentUser = userJson.data;

      const res = await fetch(`/api/approvals/${approvalRequestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      const json = await res.json();
      if (json.success) {
        alert("审批已撤销");
        await fetchContracts(searchKeyword);
      } else {
        alert("撤销审批失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error cancelling approval:", error);
      alert("撤销审批失败，请稍后重试");
    }
  };

  const handleForceClearApproval = async (contract: any) => {
    const reason = contract.approvalRequestId
      ? "该合同审批记录存在但无法通过正常流程撤销（可能已有审批人处理），强制清除后合同将恢复可编辑状态。"
      : "该合同审批状态异常（审批已锁定但无关联审批记录），强制清除后合同将恢复可编辑状态。";

    if (!confirm(`${reason}\n\n确定要强制清除审批锁定吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-approval" }),
      });

      const json = await res.json();
      if (json.success) {
        alert(json.message || "审批锁定已清除");
        await fetchContracts(searchKeyword);
      } else {
        alert("清除失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error force clearing approval:", error);
      alert("清除失败，请稍后重试");
    }
  };

  const handleToggleStatus = async (contract: any) => {
    const newStatus = contract.status === "active" ? "inactive" : "active";
    const actionText = newStatus === "active" ? "恢复" : "终止";

    if (!confirm(`确定要${actionText}该合同吗？\n\n合同：${contract.contractName}`)) {
      return;
    }

    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contract, status: newStatus }),
      });

      const json = await res.json();
      if (json.success) {
        alert(`合同已${actionText}`);
        await fetchContracts(searchKeyword);
      } else {
        alert(`${actionText}合同失败：` + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error(`Error toggling contract status:`, error);
      alert(`${actionText}合同失败，请稍后重试`);
    }
  };

  const resetContractForm = () => {
    setContractForm({
      contractCode: "",
      contractName: "",
      contractDate: "",
      customerName: "",
      customerCode: "",
      customerId: "",
      contractAmount: "",
      technicalManager: "",
      technicalPhone: "",
      procurementManager: "",
      procurementPhone: "",
      attachment1Url: "", // 技术协议
      attachment2Url: "", // 项目合同
      attachment3Url: "", // 订单
      status: "active",
      needApproval: false,
    });
    setEditingContract(null);
    setFilteredCustomers([]);
    setShowCustomerDropdown(false);
  };

  const handleExportContracts = async () => {
    if (contracts.length === 0) {
      alert("暂无合同数据可导出");
      return;
    }
    try {
      await exportContracts(contracts);
      alert("合同数据导出成功！");
    } catch (error) {
      console.error("Error exporting contracts:", error);
      alert("导出失败，请稍后重试");
    }
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate(contractImportColumns, "合同", "合同导入");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/contracts/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const { total, success, failed, errors } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${success} 条\n失败：${failed} 条`;
        if (errors && errors.length > 0) {
          message += '\n\n失败详情：\n' + errors.map((e: any) => `合同编码：${e.contractCode}，错误：${e.error}`).join('\n');
        }
        alert(message);
        await fetchContracts(searchKeyword);
      } else {
        alert(json.error || '导入失败');
      }
    } catch (error) {
      console.error('Error importing contracts:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "启用";
      case "inactive":
        return "停用";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // 定义合同表格列配置
  const contractColumns: Column<any>[] = [
    {
      key: "createdAt",
      title: "创建时间",
      width: 160,
      sortable: true,
      render: (value, row) => row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      key: "contractCode",
      title: "合同编码",
      width: 150,
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: "contractName",
      title: "合同名称",
      width: 200,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline"
            onClick={() => handleViewContract(row)}
          >
            {value}
          </span>
          {row.status === "inactive" && (
            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
              该合同已停用
            </span>
          )}
        </div>
      ),
    },
    {
      key: "contractDate",
      title: "合同日期",
      width: 120,
      sortable: true,
      render: (value) => {
        if (!value) return "-";
        // 处理ISO格式日期，只显示年-月-日
        return value.split('T')[0];
      },
    },
    {
      key: "customerName",
      title: "客户信息",
      width: 250,
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.customerName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.customerCode}</div>
        </div>
      ),
    },
    {
      key: "contractAmount",
      title: "合同金额",
      width: 150,
      sortable: true,
      render: (value) => value ? `¥${Number(value).toLocaleString()}` : "-",
    },
    {
      key: "technicalManager",
      title: "技术负责人",
      width: 150,
      sortable: false,
      render: (_, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{row.technicalManager || "-"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.technicalPhone || ""}</div>
        </div>
      ),
    },
    {
      key: "procurementManager",
      title: "采购负责人",
      width: 150,
      sortable: false,
      render: (_, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{row.procurementManager || "-"}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.procurementPhone || ""}</div>
        </div>
      ),
    },
    {
      key: "attachments",
      title: "附件",
      width: 300,
      sortable: false,
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.attachment1Url && (
            <a
              href={row.attachment1Url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              技术协议
            </a>
          )}
          {row.attachment2Url && (
            <a
              href={row.attachment2Url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              项目合同
            </a>
          )}
          {row.attachment3Url && (
            <a
              href={row.attachment3Url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
            >
              订单
            </a>
          )}
          {!row.attachment1Url && !row.attachment2Url && !row.attachment3Url && (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
              无附件
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      sortable: true,
      render: (value, row) => (
        <select
          value={value}
          onChange={(e) => handleStatusChange(row.id, e.target.value as ContractStatus)}
          className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(value)} hover:opacity-80 transition-opacity`}
        >
          <option value="active">启用</option>
          <option value="inactive">停用</option>
        </select>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 120,
      sortable: false,
      render: (_, row) => {
        const approvalStatus = row.approvalStatus;
        const approvalRequestId = row.approvalRequestId;
        const isPending = approvalStatus === "pending";

        return (
          <div className="flex gap-1 items-center justify-end">
            <button
              onClick={() => {
                if (hasEditPermission === false) {
                  showNoPermissionAlert();
                  return;
                }
                handleEditContract(row);
              }}
              disabled={hasEditPermission === false}
              className={`p-1.5 rounded-md transition-colors ${
                hasEditPermission === false
                  ? "text-gray-300 cursor-not-allowed dark:text-gray-600"
                  : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              }`}
              title={hasEditPermission === false ? "无操作权限" : "编辑"}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (hasDeletePermission === false) {
                  showNoPermissionAlert();
                  return;
                }
                handleDeleteContract(row);
              }}
              disabled={hasDeletePermission === false}
              className={`p-1.5 rounded-md transition-colors ${
                hasDeletePermission === false
                  ? "text-gray-300 cursor-not-allowed dark:text-gray-600"
                  : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
              }`}
              title={hasDeletePermission === false ? "无操作权限" : "删除"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {isPending && approvalRequestId && (
              <button
                onClick={() => handleCancelContractApproval(row)}
                className="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-colors"
                title="撤销审批"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {isPending && (
              <button
                onClick={() => handleForceClearApproval(row)}
                className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="强制清除审批锁定"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            合同管理
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            管理合同信息和附件
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadTemplate}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
          >
            下载模板
          </button>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600"
          >
            {isImporting ? '导入中...' : '导入 Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleExportContracts}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            导出 Excel
          </button>
          <button
            onClick={() => {
              resetContractForm();
              setShowContractForm(true);
            }}
            disabled={hasEditPermission === false}
            className={`rounded-lg px-4 py-2 text-white transition-colors ${
              hasEditPermission === false
                ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
            }`}
            title={hasEditPermission === false ? "无操作权限" : "新建合同"}
          >
            新建合同
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          value={searchKeyword}
          onChange={handleSearch}
          placeholder="搜索合同名称、客户名称或合同编码..."
          className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            暂无合同
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchKeyword ? "尝试其他搜索关键词" : "点击上方\"新建合同\"按钮创建第一个合同"}
          </p>
        </div>
      ) : (
        <>
          {/* 计算当前页面数据 */}
          {(() => {
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const currentPageContracts = contracts.slice(startIndex, endIndex);
            const totalCount = contracts.length;
            const totalPages = Math.ceil(totalCount / pageSize) || 1;

            return (
              <>
                {/* 视图切换 */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                    <button
                      onClick={() => setViewType("table")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewType === "table"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      表格视图
                    </button>
                    <button
                      onClick={() => setViewType("card")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewType === "card"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      卡片视图
                    </button>
                  </div>
                </div>

                {viewType === "table" ? (
                  <ResizableTable
                    columns={contractColumns}
                    data={currentPageContracts}
                    storageKey="contracts"
                    showPagination={false}
                  />
                ) : (
                  /* 卡片视图 */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentPageContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2">
                                {contract.contractName}
                              </h3>
                              {contract.status === "inactive" && (
                                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                                  该合同已停用
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {contract.contractCode}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              contract.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {contract.status === "active" ? "有效" : "终止"}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate">{contract.customerName}</span>
                          </div>
                          {contract.contractDate && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{contract.contractDate}</span>
                            </div>
                          )}
                          {contract.contractAmount && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">{contract.contractAmount}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditContract(contract); }}
                            disabled={hasEditPermission === false}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'}`}
                            title={hasEditPermission === false ? '无操作权限' : '编辑'}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleToggleStatus(contract); }}
                            disabled={hasEditPermission === false}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (contract.status === "active" ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50')}`}
                            title={hasEditPermission === false ? '无操作权限' : (contract.status === "active" ? '终止' : '恢复')}
                          >
                            {contract.status === "active" ? "终止" : "恢复"}
                          </button>
                          <button
                            onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteContract(contract.id); }}
                            disabled={hasDeletePermission === false}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasDeletePermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'}`}
                            title={hasDeletePermission === false ? '无操作权限' : '删除'}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 分页控制 - 置于页面最底部 */}
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      每页显示：
                    </span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = parseInt(e.target.value, 10);
                        setPageSize(newSize);
                        setCurrentPage(1);
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="10">10 条</option>
                      <option value="20">20 条</option>
                      <option value="50">50 条</option>
                      <option value="100">100 条</option>
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      共 {totalCount} 条记录
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                      >
                        首页
                      </button>
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                      >
                        上一页
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                        第 {currentPage} / {totalPages} 页
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        disabled={currentPage >= totalPages}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                      >
                        下一页
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                      >
                        末页
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </>
      )}

      {/* Contract Form Modal */}
      {showContractForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] flex flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingContract ? "编辑合同" : "新建合同"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="contractForm" onSubmit={editingContract ? handleUpdateContract : handleCreateContract}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      合同编码 *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingContract}
                      value={contractForm.contractCode}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractCode: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                      placeholder="例如：CT001"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      合同名称 *
                    </label>
                    <input
                      type="text"
                      required
                      value={contractForm.contractName}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractName: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入合同名称"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      合同日期
                    </label>
                    <input
                      type="date"
                      value={contractForm.contractDate}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractDate: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      合同金额
                    </label>
                    <input
                      type="text"
                      value={contractForm.contractAmount}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, contractAmount: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入合同金额"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    客户名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractForm.customerName}
                    onChange={handleCustomerNameChange}
                    onFocus={() => {
                      if (contractForm.customerName) {
                        const filtered = customers.filter((c) =>
                          c.customerName.toLowerCase().includes(contractForm.customerName.toLowerCase())
                        );
                        setFilteredCustomers(filtered);
                      }
                      setShowCustomerDropdown(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowCustomerDropdown(false), 200);
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入客户名称（支持模糊查询）"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    请从下拉列表中选择客户（必须点击选择，不能手动输入）
                  </p>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      >
                        <div className="font-medium">{customer.customerName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          编码: {customer.customerCode}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    客户编码（自动带出）
                  </label>
                  <input
                    type="text"
                    disabled
                    value={contractForm.customerCode}
                    className={`w-full rounded-md border px-3 py-2 disabled:bg-gray-100 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 ${
                      contractForm.customerId
                        ? "border-green-300 dark:border-green-700"
                        : "border-red-300 dark:border-red-700"
                    }`}
                    placeholder="选择客户后自动填充"
                  />
                  {!contractForm.customerId && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      ⚠️ 请从上方下拉列表中点击选择客户
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    合同状态
                  </label>
                  <select
                    value={contractForm.status}
                    onChange={(e) =>
                      setContractForm({
                        ...contractForm,
                        status: e.target.value as ContractStatus,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  客户技术负责人信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={contractForm.technicalManager}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, technicalManager: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入技术负责人姓名"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      联系电话
                    </label>
                    <input
                      type="tel"
                      value={contractForm.technicalPhone}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, technicalPhone: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入联系电话"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  客户采购负责人信息
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={contractForm.procurementManager}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, procurementManager: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入采购负责人姓名"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      联系电话
                    </label>
                    <input
                      type="tel"
                      value={contractForm.procurementPhone}
                      onChange={(e) =>
                        setContractForm({ ...contractForm, procurementPhone: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="输入联系电话"
                    />
                  </div>
                </div>
              </div>
              </div>

              <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  合同附件
                </h3>

                <div className="space-y-4">
                  {/* 附件一：技术协议 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      附件一：技术协议
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, "attachment1")}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      {uploadingFile && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 self-center">
                          上传中...
                        </span>
                      )}
                    </div>
                    {contractForm.attachment1Url && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={contractForm.attachment1Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          下载技术协议
                        </a>
                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, attachment1Url: "" })}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 附件二：项目合同 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      附件二：项目合同
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, "attachment2")}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      {uploadingFile && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 self-center">
                          上传中...
                        </span>
                      )}
                    </div>
                    {contractForm.attachment2Url && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={contractForm.attachment2Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          下载项目合同
                        </a>
                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, attachment2Url: "" })}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 附件三：订单 */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      附件三：订单
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(e, "attachment3")}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                      {uploadingFile && (
                        <span className="text-sm text-gray-600 dark:text-gray-400 self-center">
                          上传中...
                        </span>
                      )}
                    </div>
                    {contractForm.attachment3Url && (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={contractForm.attachment3Url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          下载订单
                        </a>
                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, attachment3Url: "" })}
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowContractForm(false);
                  resetContractForm();
                }}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-4 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                取消
              </button>
              <button
                type="submit"
                form="contractForm"
                className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-4 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {editingContract ? "提交审批" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
