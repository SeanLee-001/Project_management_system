"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { exportOrders } from "@/utils/excelExport";
import { generateImportTemplate, orderImportColumns } from "@/utils/excelImport";
import { Pencil, Trash2, Undo2 } from "lucide-react";
import { ResizableTable, Column } from "@/components/ResizableTable";
import { checkPermission, showNoPermissionAlert } from "@/lib/permissionUtils";

type OrderStatus = "active" | "completed" | "paused" | "cancelled";

interface OrderManagementProps {
  orders?: any[];
  setOrders?: (orders: any[]) => void;
}

export default function OrderManagement({ orders: externalOrders, setOrders: externalSetOrders }: OrderManagementProps = {}) {
  // 使用外部传入的状态，如果没有则使用内部状态
  const [internalOrders, setInternalOrders] = useState<any[]>([]);
  const orders = externalOrders ?? internalOrders;
  const setOrders = externalSetOrders ?? setInternalOrders;

  const [contracts, setContracts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [hasEditPermission, setHasEditPermission] = useState<boolean | null>(null);
  const [hasDeletePermission, setHasDeletePermission] = useState<boolean | null>(null);

  // 检查权限
  useEffect(() => {
    const checkPermissions = async () => {
      const edit = await checkPermission("orders", "edit");
      const deletePerm = await checkPermission("orders", "delete");
      setHasEditPermission(edit);
      setHasDeletePermission(deletePerm);
    };
    checkPermissions();
  }, []);

  // 高级查询状态
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchYear, setSearchYear] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchStartDate, setSearchStartDate] = useState("");
  const [searchEndDate, setSearchEndDate] = useState("");
  const [searchCustomerCode, setSearchCustomerCode] = useState("");
  const [searchStatus, setSearchStatus] = useState<OrderStatus | "">("");
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [orderForm, setOrderForm] = useState({
    orderNumber: "",
    orderDate: "",
    contractCode: "",
    customerCode: "",
    customerName: "",
    materialCode: "",
    projectName: "",
    specification: "",
    quantity: "",
    contractAmount: "", // 合同金额
    deliveryDate: "",
    actualDeliveryDate: "",
    status: "active" as OrderStatus,
    projectProgress: "",
    paymentTerms: "",
    orderAmount: "", // 订单金额 = 数量 * 合同金额
    prepayRatio: "",
    prepayAmount: "",
    prepayReceived: false,
    prepayDate: "",
    prepayInvoiceAmount: "",
    prepayInvoiceDate: "",
    prepayInvoiced: false,
    arrivalAmount: "",
    arrivalReceived: false,
    arrivalDate: "",
    arrivalInvoiceAmount: "",
    arrivalInvoiceDate: "",
    arrivalInvoiced: false,
    arrivalRatio: "",
    acceptanceAmount: "",
    acceptanceReceived: false,
    acceptanceDate: "",
    acceptanceInvoiceAmount: "",
    acceptanceInvoiceDate: "",
    acceptanceInvoiced: false,
    acceptanceRatio: "",
    warrantyRatio: "",
    warrantyAmount: "",
    warrantyReceived: false,
    warrantyDate: "",
    warrantyInvoiceAmount: "",
    warrantyInvoiceDate: "",
    warrantyInvoiced: false,
    notes: "",
    needApproval: false,
  });

  const [filteredContracts, setFilteredContracts] = useState<any[]>([]);
  const [showContractDropdown, setShowContractDropdown] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orders-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 视图状态
  const [viewType, setViewType] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orders-view-type");
      if (saved === "table" || saved === "card") return saved;
    }
    return "table";
  });

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("orders-page-size", pageSize.toString());
  }, [pageSize]);

  // 保存viewType到localStorage
  useEffect(() => {
    localStorage.setItem("orders-view-type", viewType);
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
    // 只在组件独立使用（没有外部orders）时才加载数据
    if (!externalOrders) {
      fetchOrders();
    } else {
      // 有外部 orders 时，直接设置加载完成
      setIsLoading(false);
    }
    fetchContracts();
    fetchCustomers();
  }, [externalOrders]);

  // 自动计算各阶段金额
  useEffect(() => {
    const orderAmount = parseFloat(orderForm.orderAmount) || 0;
    const prepayRatio = parseFloat(orderForm.prepayRatio) || 0;
    const arrivalRatio = parseFloat(orderForm.arrivalRatio) || 0;
    const acceptanceRatio = parseFloat(orderForm.acceptanceRatio) || 0;
    const warrantyRatio = parseFloat(orderForm.warrantyRatio) || 0;

    // 自动计算金额：预付金额 = 预付款比例 * 订单金额
    const prepayAmount = orderAmount * prepayRatio / 100;
    const arrivalAmount = orderAmount * arrivalRatio / 100;
    const acceptanceAmount = orderAmount * acceptanceRatio / 100;
    const warrantyAmount = orderAmount * warrantyRatio / 100;

    setOrderForm(prev => ({
      ...prev,
      prepayAmount: prepayAmount > 0 ? prepayAmount.toFixed(2) : "",
      arrivalAmount: arrivalAmount > 0 ? arrivalAmount.toFixed(2) : "",
      acceptanceAmount: acceptanceAmount > 0 ? acceptanceAmount.toFixed(2) : "",
      warrantyAmount: warrantyAmount > 0 ? warrantyAmount.toFixed(2) : "",
    }));
  }, [orderForm.orderAmount, orderForm.prepayRatio, orderForm.arrivalRatio, orderForm.acceptanceRatio, orderForm.warrantyRatio]);

  // 自动计算订单金额 = 数量 * 合同金额
  useEffect(() => {
    const quantity = parseFloat(orderForm.quantity) || 0;
    const contractAmount = parseFloat(orderForm.contractAmount) || 0;
    const calculatedAmount = (quantity * contractAmount).toFixed(2);
    
    setOrderForm(prev => {
      if (prev.orderAmount !== calculatedAmount) {
        return { ...prev, orderAmount: calculatedAmount };
      }
      return prev;
    });
  }, [orderForm.quantity, orderForm.contractAmount]);

  // 自动生成付款条件
  useEffect(() => {
    const parts = [];

    if (orderForm.prepayRatio) parts.push(`预付${orderForm.prepayRatio}%`);
    if (orderForm.arrivalRatio) parts.push(`到货${orderForm.arrivalRatio}%`);
    if (orderForm.acceptanceRatio) parts.push(`验收${orderForm.acceptanceRatio}%`);
    if (orderForm.warrantyRatio) parts.push(`质保款${orderForm.warrantyRatio}%`);

    const paymentTerms = parts.length > 0 ? parts.join('、') : "";

    // 只有当付款条件确实改变时才更新，避免无限循环
    setOrderForm(prev => {
      if (prev.paymentTerms !== paymentTerms) {
        return { ...prev, paymentTerms };
      }
      return prev;
    });
  }, [orderForm.prepayRatio, orderForm.arrivalRatio, orderForm.acceptanceRatio, orderForm.warrantyRatio]);

  // 金额输入处理函数
  const handleAmountChange = (fieldName: string, value: string) => {
    // 只允许输入数字和一个小数点
    let processedValue = value.replace(/[^\d.]/g, '');

    // 确保只有一个小数点
    const parts = processedValue.split('.');
    if (parts.length > 2) {
      processedValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // 限制小数点后最多两位
    if (parts.length === 2 && parts[1].length > 2) {
      processedValue = parts[0] + '.' + parts[1].slice(0, 2);
    }

    // 自动格式化：如果输入的是整数，自动补全 .00
    if (processedValue && !processedValue.includes('.')) {
      processedValue = parseFloat(processedValue).toFixed(2);
    } else if (processedValue && processedValue.endsWith('.')) {
      processedValue = processedValue + '00';
    } else if (processedValue && processedValue.includes('.') && parts[1].length === 1) {
      processedValue = processedValue + '0';
    }

    // 移除前导零（除非是 0.00）
    if (processedValue !== '0.00' && processedValue.startsWith('0') && !processedValue.startsWith('0.')) {
      processedValue = processedValue.replace(/^0+/, '');
      if (processedValue === '' || processedValue === '.') {
        processedValue = '0.00';
      }
    }

    setOrderForm({ ...orderForm, [fieldName]: processedValue });
  };

  // 比率输入处理函数
  const handleRatioChange = (fieldName: string, value: string) => {
    // 只允许输入数字
    let processedValue = value.replace(/[^\d]/g, '');

    // 移除前导零（除非是 0）
    if (processedValue !== '0' && processedValue.startsWith('0') && processedValue.length > 1) {
      processedValue = processedValue.replace(/^0+/, '');
      if (processedValue === '') {
        processedValue = '0';
      }
    }

    setOrderForm({ ...orderForm, [fieldName]: processedValue });
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchOrders = useCallback(async (keyword?: string, advancedParams?: {
    year?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    customerCode?: string;
    status?: string;
  }) => {
    try {
      const params = new URLSearchParams();

      if (keyword) {
        params.append("search", keyword);
      }

      if (advancedParams) {
        if (advancedParams.year) params.append("year", advancedParams.year);
        if (advancedParams.month) params.append("month", advancedParams.month);
        if (advancedParams.startDate) params.append("startDate", advancedParams.startDate);
        if (advancedParams.endDate) params.append("endDate", advancedParams.endDate);
        if (advancedParams.customerCode) params.append("customerCode", advancedParams.customerCode);
        if (advancedParams.status) params.append("status", advancedParams.status);
      }

      const url = params.toString() ? `/api/orders?${params.toString()}` : "/api/orders";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setOrders]);

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/contracts");
      const json = await res.json();
      if (json.success) {
        setContracts(json.data);
      }
    } catch (error) {
      console.error("Error fetching contracts:", error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    fetchOrders(keyword);
  };

  // 高级查询处理函数
  const handleAdvancedSearch = () => {
    const params: any = {};

    if (searchYear) params.year = searchYear;
    if (searchMonth) params.month = searchMonth;
    if (searchStartDate) params.startDate = searchStartDate;
    if (searchEndDate) params.endDate = searchEndDate;
    if (searchCustomerCode) params.customerCode = searchCustomerCode;
    if (searchStatus) params.status = searchStatus;

    fetchOrders(searchKeyword || undefined, params);
  };

  // 重置高级查询
  const handleResetSearch = () => {
    setSearchYear("");
    setSearchMonth("");
    setSearchStartDate("");
    setSearchEndDate("");
    setSearchCustomerCode("");
    setSearchStatus("");
    setSearchKeyword("");
    fetchOrders();
  };

  // 客户选择相关
  const handleCustomerCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setSearchCustomerCode(code);

    if (code) {
      const filtered = customers.filter((c) =>
        c.customerCode.toLowerCase().includes(code.toLowerCase())
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setSearchCustomerCode(customer.customerCode);
    setShowCustomerDropdown(false);
  };

  const handleContractCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setOrderForm({ ...orderForm, contractCode: code });

    if (code) {
      const filtered = contracts.filter((c) =>
        c.contractCode.toLowerCase().includes(code.toLowerCase())
      );
      setFilteredContracts(filtered);
      setShowContractDropdown(true);
    } else {
      setFilteredContracts([]);
      setShowContractDropdown(false);
    }
  };

  const handleContractSelect = (contract: any) => {
    // 检查合同状态
    if (contract.status === "inactive") {
      alert("该合同已停用，不能创建订单！");
      setShowContractDropdown(false);
      return;
    }

    // 格式化合同日期为 YYYY-MM-DD 格式
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      // 验证日期是否有效
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    };

    setOrderForm({
      ...orderForm,
      orderDate: formatDate(contract.contractDate),
      projectName: contract.contractName,
      contractCode: contract.contractCode,
      customerCode: contract.customerCode,
      customerName: contract.customerName,
      contractAmount: contract.contractAmount || "", // 保存合同金额
    });
    setShowContractDropdown(false);
  };

  const handleMaterialCodeSearch = async () => {
    const code = orderForm.materialCode.trim();
    if (!code) return;

    setIsLoadingProduct(true);
    try {
      const res = await fetch(`/api/products/search?code=${encodeURIComponent(code)}&mode=exact`);
      const json = await res.json();

      if (json.success && json.data) {
        setOrderForm({
          ...orderForm,
          projectName: json.data.projectName || orderForm.projectName,
          specification: json.data.specification || orderForm.specification,
        });
      } else {
        alert("未找到该物料编码对应的产品信息");
      }
    } catch (error) {
      console.error("Error searching product:", error);
      alert("查询产品信息失败");
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleMaterialCodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleMaterialCodeSearch();
    }
  };

  const handleMaterialCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setOrderForm({ ...orderForm, materialCode: code });

    if (code) {
      try {
        const res = await fetch(`/api/products/search?code=${encodeURIComponent(code)}&mode=fuzzy`);
        const json = await res.json();
        if (json.success) {
          setFilteredProducts(json.data);
          setShowProductDropdown(true);
        } else {
          setFilteredProducts([]);
          setShowProductDropdown(false);
        }
      } catch (error) {
        console.error("Error searching products:", error);
        setFilteredProducts([]);
        setShowProductDropdown(false);
      }
    } else {
      setFilteredProducts([]);
      setShowProductDropdown(false);
    }
  };

  const handleProductSelect = (product: any) => {
    setOrderForm({
      ...orderForm,
      materialCode: product.materialCode,
      projectName: product.projectName,
      specification: product.specification || "",
    });
    setShowProductDropdown(false);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查合同状态
    if (orderForm.contractCode) {
      const contract = contracts.find(c => c.contractCode === orderForm.contractCode);
      if (contract && contract.status === "inactive") {
        alert("该合同已停用，不能创建订单！");
        return;
      }
    }

    try {
      // 先创建订单
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderForm),
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
              const flowsRes = await fetch("/api/approval-flows?approvalType=new_order&includeDisabled=false");
              const flowsJson = await flowsRes.json();
              console.log("订单新建审批流程查询结果:", flowsJson);
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
                requestType: "order",
                requestId: json.data.id,
                title: `订单审批 - ${orderForm.orderNumber || orderForm.projectName}`,
                content: `客户：${orderForm.customerName}\n合同号：${orderForm.contractCode}\n项目名称：${orderForm.projectName}\n订单金额：${orderForm.orderAmount}`,
                applicantId: user.id,
                applicantName: user.fullName || user.username,
                currentApproverId,
                currentApproverName,
                totalSteps,
                relatedData: JSON.stringify({
                  orderNumber: orderForm.orderNumber,
                  customerName: orderForm.customerName,
                  contractCode: orderForm.contractCode,
                  orderAmount: orderForm.orderAmount,
                }),
              }),
            });

            if (approvalRes.ok) {
              const approvalJson = await approvalRes.json();
              console.log("订单新建审批申请已创建:", approvalJson.data);
            } else {
              console.error("创建审批申请失败:", await approvalRes.text());
              alert("订单已创建，但创建审批申请失败");
            }
          }
        } catch (approvalError) {
          console.error("Error creating approval:", approvalError);
          alert("订单已创建，但创建审批申请失败");
        }

        // 重新加载所有订单，不带搜索参数，确保订单看板能看到最新数据
        await fetchOrders();
        setShowOrderForm(false);
        resetOrderForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("创建订单失败");
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    // 检查合同状态
    if (orderForm.contractCode) {
      const contract = contracts.find(c => c.contractCode === orderForm.contractCode);
      if (contract && contract.status === "inactive") {
        alert("该合同已停用，不能更新订单！");
        return;
      }
    }

    // 检查是否已存在待审批的申请
    if (editingOrder.approvalRequestId) {
      alert("该订单有待审批的申请，请等待审批完成或撤销当前审批后再编辑");
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
    if (!confirm(`确定要提交订单变更审批吗？\n\n订单编号：${orderForm.orderNumber}\n项目名称：${orderForm.projectName}\n\n提交后将创建审批申请，审批通过后订单变更才会生效。`)) {
      return;
    }

    try {
      // 获取审批流程配置
      let currentApproverId = "1";
      let currentApproverName = "系统管理员";
      let totalSteps = "level1";
      
      try {
        const flowsRes = await fetch("/api/approval-flows?approvalType=edit_order&includeDisabled=false");
        const flowsJson = await flowsRes.json();
        console.log("订单编辑审批流程查询结果:", flowsJson);
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

      // 构建变更内容
      const changes: any = {};
      Object.keys(orderForm).forEach(key => {
        const newValue = orderForm[key as keyof typeof orderForm];
        const oldValue = (editingOrder as any)[key];
        if (newValue !== oldValue && newValue !== "" && newValue !== null) {
          changes[key] = { old: oldValue, new: newValue };
        }
      });

      // 创建审批申请
      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "order",
          requestId: editingOrder.id,
          title: `订单编辑 - ${orderForm.orderNumber || orderForm.projectName}`,
          content: `订单编号：${orderForm.orderNumber}\n项目名称：${orderForm.projectName}\n客户名称：${orderForm.customerName}\n变更内容：${JSON.stringify(changes, null, 2)}`,
          applicantId: user.id,
          applicantName: user.fullName || user.username,
          currentApproverId,
          currentApproverName,
          totalSteps,
          relatedData: JSON.stringify({
            operation: "edit",
            orderId: editingOrder.id,
            orderNumber: orderForm.orderNumber,
            changes,
          }),
        }),
      });

      const approvalJson = await approvalRes.json();
      if (approvalJson.success) {
        alert("订单编辑审批申请已提交，等待审批通过后变更才会生效");
        setEditingOrder(null);
        setShowOrderForm(false);
        resetOrderForm();
        await fetchOrders();
      } else {
        alert("提交审批失败：" + (approvalJson.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error creating edit approval:", error);
      alert("提交审批失败，请稍后重试");
    }
  };

  const handleDeleteOrder = async (order: any) => {
    // 检查审批状态，如果正在审批中，不允许重复提交
    const approvalStatus = order.approvalStatus;
    if (approvalStatus && approvalStatus.status === "pending") {
      alert("该订单正在审批中，不允许删除。请先撤销审批后再操作。");
      return;
    }

    if (!confirm(`确定要删除此订单吗？\n\n订单编号：${order.orderNumber}\n项目名称：${order.projectName}\n\n此操作将提交审批，审批通过后订单将被删除！`)) return;

    // 获取当前用户信息
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user || !user.id) {
      alert("获取用户信息失败，无法提交审批申请");
      return;
    }

    try {
      // 直接使用已有的 order 对象（已包含所有必要信息）
      const orderData = {
        id: order.id,
        orderNumber: order.orderNumber,
        projectName: order.projectName,
        customerName: order.customerName,
        amount: order.amount,
        specifications: order.specifications,
      };

      // 获取审批流程配置
      let currentApproverId = "1"; // 默认系统管理员
      let currentApproverName = "系统管理员";
      let totalSteps = "level1";
      
      try {
        // 尝试获取订单删除审批流程配置
        const flowsRes = await fetch("/api/approval-flows?approvalType=delete_order&includeDisabled=false");
        const flowsJson = await flowsRes.json();
        console.log("审批流程查询结果:", flowsJson);
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
        } else {
          console.log("未找到 delete_order 审批流程，使用默认配置");
        }
      } catch (e) {
        console.error("获取审批流程失败:", e);
      }

      // 创建删除订单审批记录
      console.log("提交删除订单审批:", {
        requestType: "order",
        requestId: order.id,
        title: `删除订单：${orderData.projectName}`,
        applicantId: user.id,
        currentApproverId: currentApproverId,
      });

      const approvalRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestType: "order",
          requestId: order.id,
          title: `删除订单：${orderData.projectName}`,
          content: `订单编号：${orderData.orderNumber}\n项目名称：${orderData.projectName}\n客户名称：${orderData.customerName}\n订单金额：${orderData.orderAmount}\n操作：删除`,
          applicantId: user.id,
          applicantName: user.username || user.id,
          currentApproverId: currentApproverId,
          currentApproverName: currentApproverName,
          totalSteps: totalSteps,
          relatedData: {
            operation: "delete",
            orderId: order.id,
            orderNumber: orderData.orderNumber,
            projectName: orderData.projectName,
          },
        }),
      });

      console.log("审批 API 响应状态:", approvalRes.status);
      const approvalJson = await approvalRes.json();
      console.log("审批 API 响应内容:", approvalJson);
      
      if (approvalJson.success) {
        alert("删除申请已提交，等待审批");
        await fetchOrders(searchKeyword);
      } else {
        alert("提交审批失败：" + (approvalJson.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error creating delete approval:", error);
      alert("提交审批失败，请稍后重试");
    }
  };

  const handleCancelOrderApproval = async (order: any) => {
    const approvalRequestId = order.approvalRequestId;
    if (!approvalRequestId) {
      alert("该订单没有关联的审批申请");
      return;
    }

    if (!confirm("确定要撤销该订单的审批吗？\n\n撤销后可以重新编辑并再次提交审批。")) {
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
        await fetchOrders(searchKeyword);
      } else {
        alert("撤销审批失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error cancelling approval:", error);
      alert("撤销审批失败，请稍后重试");
    }
  };

  const handleViewOrder = (order: any) => {
    handleEditOrder(order);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // 重新加载订单列表
        await fetchOrders();
      } else {
        const json = await res.json();
        alert(json.error || "更新状态失败");
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("更新订单状态失败");
    }
  };

  const handleEditOrder = (order: any) => {
    // 检查审批状态，只有 none、rejected 状态才能编辑
    const approvalStatus = order.approvalStatus;
    if (approvalStatus && approvalStatus.status === "pending") {
      alert("该订单正在审批中，不允许编辑。请先撤销审批后再编辑。");
      return;
    }

    setEditingOrder(order);
    setOrderForm({
      orderNumber: order.orderNumber || "",
      orderDate: order.orderDate ? order.orderDate.split('T')[0] : "",
      contractCode: order.contractCode || "",
      customerCode: order.customerCode || "",
      customerName: order.customerName || "",
      materialCode: order.materialCode || "",
      projectName: order.projectName || "",
      specification: order.specification || "",
      quantity: order.quantity || "",
      contractAmount: order.contractAmount || "", // 加载合同金额
      deliveryDate: order.deliveryDate ? order.deliveryDate.split('T')[0] : "",
      actualDeliveryDate: order.actualDeliveryDate ? order.actualDeliveryDate.split('T')[0] : "",
      status: order.status as OrderStatus,
      projectProgress: order.projectProgress || "",
      paymentTerms: order.paymentTerms || "",
      orderAmount: order.orderAmount ? parseFloat(order.orderAmount).toFixed(2) : "",
      prepayRatio: order.prepayRatio || "",
      prepayAmount: order.prepayAmount ? parseFloat(order.prepayAmount).toFixed(2) : "",
      prepayReceived: order.prepayReceived || false,
      prepayDate: order.prepayDate ? order.prepayDate.split('T')[0] : "",
      prepayInvoiceAmount: order.prepayInvoiceAmount ? parseFloat(order.prepayInvoiceAmount).toFixed(2) : "",
      prepayInvoiceDate: order.prepayInvoiceDate ? order.prepayInvoiceDate.split('T')[0] : "",
      prepayInvoiced: order.prepayInvoiced || false,
      arrivalAmount: order.arrivalAmount ? parseFloat(order.arrivalAmount).toFixed(2) : "",
      arrivalReceived: order.arrivalReceived || false,
      arrivalDate: order.arrivalDate ? order.arrivalDate.split('T')[0] : "",
      arrivalInvoiceAmount: order.arrivalInvoiceAmount ? parseFloat(order.arrivalInvoiceAmount).toFixed(2) : "",
      arrivalInvoiceDate: order.arrivalInvoiceDate ? order.arrivalInvoiceDate.split('T')[0] : "",
      arrivalInvoiced: order.arrivalInvoiced || false,
      arrivalRatio: order.arrivalRatio || "",
      acceptanceAmount: order.acceptanceAmount ? parseFloat(order.acceptanceAmount).toFixed(2) : "",
      acceptanceReceived: order.acceptanceReceived || false,
      acceptanceDate: order.acceptanceDate ? order.acceptanceDate.split('T')[0] : "",
      acceptanceInvoiceAmount: order.acceptanceInvoiceAmount ? parseFloat(order.acceptanceInvoiceAmount).toFixed(2) : "",
      acceptanceInvoiceDate: order.acceptanceInvoiceDate ? order.acceptanceInvoiceDate.split('T')[0] : "",
      acceptanceInvoiced: order.acceptanceInvoiced || false,
      acceptanceRatio: order.acceptanceRatio || "",
      warrantyRatio: order.warrantyRatio || "",
      warrantyAmount: order.warrantyAmount ? parseFloat(order.warrantyAmount).toFixed(2) : "",
      warrantyReceived: order.warrantyReceived || false,
      warrantyDate: order.warrantyDate ? order.warrantyDate.split('T')[0] : "",
      warrantyInvoiceAmount: order.warrantyInvoiceAmount ? parseFloat(order.warrantyInvoiceAmount).toFixed(2) : "",
      warrantyInvoiceDate: order.warrantyInvoiceDate ? order.warrantyInvoiceDate.split('T')[0] : "",
      warrantyInvoiced: order.warrantyInvoiced || false,
      notes: order.notes || "",
      needApproval: false, // 编辑时不允许修改审批状态
    });
    setShowOrderForm(true);
  };

  const resetOrderForm = () => {
    setOrderForm({
      orderNumber: "",
      orderDate: "",
      contractCode: "",
      customerCode: "",
      customerName: "",
      materialCode: "",
      projectName: "",
      specification: "",
      quantity: "",
      deliveryDate: "",
      actualDeliveryDate: "",
      status: "active",
      projectProgress: "",
      paymentTerms: "",
      orderAmount: "",
      prepayRatio: "",
      prepayAmount: "",
      prepayReceived: false,
      prepayDate: "",
      prepayInvoiceAmount: "",
      prepayInvoiceDate: "",
      prepayInvoiced: false,
      arrivalAmount: "",
      arrivalReceived: false,
      arrivalDate: "",
      arrivalInvoiceAmount: "",
      arrivalInvoiceDate: "",
      arrivalInvoiced: false,
      arrivalRatio: "",
      acceptanceAmount: "",
      acceptanceReceived: false,
      acceptanceDate: "",
      acceptanceInvoiceAmount: "",
      acceptanceInvoiceDate: "",
      acceptanceInvoiced: false,
      acceptanceRatio: "",
      warrantyRatio: "",
      warrantyAmount: "",
      warrantyReceived: false,
      warrantyDate: "",
      warrantyInvoiceAmount: "",
      warrantyInvoiceDate: "",
      warrantyInvoiced: false,
      notes: "",
      needApproval: false,
    });
    setEditingOrder(null);
    setFilteredContracts([]);
    setShowContractDropdown(false);
    setFilteredProducts([]);
    setShowProductDropdown(false);
  };

  const handleExportOrders = async () => {
    if (orders.length === 0) {
      alert("暂无订单数据可导出");
      return;
    }
    try {
      await exportOrders(orders);
      alert("订单数据导出成功！");
    } catch (error) {
      console.error("Error exporting orders:", error);
      alert("导出失败，请稍后重试");
    }
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate(orderImportColumns, "订单", "订单导入");
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
      const res = await fetch('/api/orders/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const { total, success, failed, errors } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${success} 条\n失败：${failed} 条`;
        if (errors && errors.length > 0) {
          message += '\n\n失败详情：\n' + errors.map((e: any) => `订单日期：${e.orderDate}，错误：${e.error}`).join('\n');
        }
        alert(message);
        await fetchOrders(searchKeyword);
      } else {
        alert(json.error || '导入失败');
      }
    } catch (error) {
      console.error('Error importing orders:', error);
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
        return "进行中";
      case "completed":
        return "完成";
      case "paused":
        return "暂停";
      case "cancelled":
        return "取消";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // 定义订单表格列配置
  const orderColumns: Column<any>[] = [
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
      key: "orderNumber",
      title: "订单号",
      width: 150,
      sortable: true,
      render: (value, row) => {
        // 检查是否所有款项已收完、票已开完
        const allPaymentReceived =
          row.prepayReceived &&
          row.arrivalReceived &&
          row.acceptanceReceived &&
          row.warrantyReceived;

        const allInvoicesIssued =
          row.prepayInvoiced &&
          row.arrivalInvoiced &&
          row.acceptanceInvoiced &&
          row.warrantyInvoiced;

        const isComplete = allPaymentReceived && allInvoicesIssued;

        // 状态提示标签
        let statusBadge = null;
        if (row.status === "paused") {
          statusBadge = (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                该订单已暂停
              </span>
            </div>
          );
        } else if (row.status === "cancelled") {
          statusBadge = (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                该订单已取消
              </span>
            </div>
          );
        } else if (isComplete) {
          statusBadge = (
            <div className="mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ 款/票已完结
              </span>
            </div>
          );
        }

        return (
          <div>
            <span
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline font-medium"
              onClick={() => handleViewOrder(row)}
            >
              {value || '-'}
            </span>
            {statusBadge}
          </div>
        );
      },
    },
    {
      key: "orderDate",
      title: "订单日期",
      width: 120,
      sortable: true,
      render: (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN');
      },
    },
    {
      key: "contractCode",
      title: "合同号",
      width: 150,
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: "customerName",
      title: "客户",
      width: 200,
      sortable: true,
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.customerCode}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.customerName}</div>
        </div>
      ),
    },
    {
      key: "projectName",
      title: "项目名称",
      width: 200,
      sortable: true,
      render: (value, row) => {
        if (!value) return '-';

        // 检查是否延期
        let overdueInfo = null;
        if (row.deliveryDate) {
          const deliveryDate = new Date(row.deliveryDate);
          const currentDate = new Date();

          // 重置时间为0点，只比较日期
          deliveryDate.setHours(0, 0, 0, 0);
          currentDate.setHours(0, 0, 0, 0);

          if (currentDate > deliveryDate) {
            const diffTime = currentDate.getTime() - deliveryDate.getTime();
            const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            overdueInfo = (
              <span className="ml-2 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                已延期{overdueDays}天
              </span>
            );
          }
        }

        return (
          <div className="flex flex-col gap-1">
            <span className="text-gray-900 dark:text-white">{value}</span>
            {overdueInfo && <div className="mt-0.5">{overdueInfo}</div>}
          </div>
        );
      },
    },
    {
      key: "orderAmount",
      title: "订单金额",
      width: 150,
      sortable: true,
      render: (value) => value ? `¥${Number(value).toLocaleString()}` : '-',
    },
    {
      key: "collectedAmount",
      title: "已收款",
      width: 150,
      sortable: true,
      render: (_, row) => {
        // 只计算已确认收款的金额
        let collected = 0;
        if (row.prepayReceived) collected += parseFloat(row.prepayAmount || "0");
        if (row.arrivalReceived) collected += parseFloat(row.arrivalAmount || "0");
        if (row.acceptanceReceived) collected += parseFloat(row.acceptanceAmount || "0");
        if (row.warrantyReceived) collected += parseFloat(row.warrantyAmount || "0");
        return collected > 0 ? `¥${collected.toLocaleString()}` : '-';
      },
    },
    {
      key: "pendingAmount",
      title: "未收款",
      width: 150,
      sortable: true,
      render: (_, row) => {
        // 只计算未确认收款的金额
        let pending = 0;
        if (!row.prepayReceived) pending += parseFloat(row.prepayAmount || "0");
        if (!row.arrivalReceived) pending += parseFloat(row.arrivalAmount || "0");
        if (!row.acceptanceReceived) pending += parseFloat(row.acceptanceAmount || "0");
        if (!row.warrantyReceived) pending += parseFloat(row.warrantyAmount || "0");
        return pending > 0 ? `¥${pending.toLocaleString()}` : '-';
      },
    },
    {
      key: "paymentDetails",
      title: "应收款明细",
      width: 220,
      sortable: false,
      render: (_, row) => {
        const parts = [];
        const prepayAmount = parseFloat(row.prepayAmount || "0");
        const arrivalAmount = parseFloat(row.arrivalAmount || "0");
        const acceptanceAmount = parseFloat(row.acceptanceAmount || "0");
        const warrantyAmount = parseFloat(row.warrantyAmount || "0");

        if (prepayAmount > 0) {
          const receivedIcon = row.prepayReceived ? "✅ " : "";
          parts.push(`${receivedIcon}预付: ¥${Number(prepayAmount).toLocaleString()}`);
        }
        if (arrivalAmount > 0) {
          const receivedIcon = row.arrivalReceived ? "✅ " : "";
          parts.push(`${receivedIcon}到货: ¥${Number(arrivalAmount).toLocaleString()}`);
        }
        if (acceptanceAmount > 0) {
          const receivedIcon = row.acceptanceReceived ? "✅ " : "";
          parts.push(`${receivedIcon}验收: ¥${Number(acceptanceAmount).toLocaleString()}`);
        }
        if (warrantyAmount > 0) {
          const receivedIcon = row.warrantyReceived ? "✅ " : "";
          parts.push(`${receivedIcon}质保: ¥${Number(warrantyAmount).toLocaleString()}`);
        }
        return parts.length > 0 ? (
          <div className="text-xs space-y-1">
            {parts.map((part, idx) => (
              <div key={idx} className="text-gray-600 dark:text-gray-400">{part}</div>
            ))}
          </div>
        ) : '-';
      },
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      sortable: true,
      render: (value, row) => (
        <select
          value={value}
          onChange={(e) => handleStatusChange(row.id, e.target.value as OrderStatus)}
          className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusColor(value)} hover:opacity-80 transition-opacity`}
        >
          <option value="active">进行中</option>
          <option value="completed">已完成</option>
          <option value="paused">已暂停</option>
          <option value="cancelled">已取消</option>
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
        const isPending = approvalStatus && approvalStatus.status === "pending";

        return (
          <div className="flex gap-1 items-center justify-end">
            <button
              onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditOrder(row); }}
              disabled={hasEditPermission === false}
              className={`p-1.5 rounded-md transition-colors ${hasEditPermission === false ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30'}`}
              title={hasEditPermission === false ? '无操作权限' : '编辑'}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteOrder(row); }}
              disabled={hasDeletePermission === false}
              className={`p-1.5 rounded-md transition-colors ${hasDeletePermission === false ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'}`}
              title={hasDeletePermission === false ? '无操作权限' : '删除'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {isPending && approvalRequestId && (
              <button
                onClick={() => handleCancelOrderApproval(row)}
                className="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-colors"
                title="撤销审批"
              >
                <Undo2 className="w-4 h-4" />
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
            订单管理
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            管理订单信息和付款/开票进度
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
            onClick={handleExportOrders}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            导出 Excel
          </button>
          <button
            onClick={() => {
              resetOrderForm();
              setShowOrderForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            新建订单
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchKeyword}
            onChange={handleSearch}
            placeholder="搜索客户名称、合同号、项目名称或物料编码..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
          >
            {showAdvancedSearch ? "收起" : "高级查询"}
          </button>
        </div>

        {/* 高级查询面板 */}
        {showAdvancedSearch && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 年度查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">年度</label>
                <select
                  value={searchYear}
                  onChange={(e) => setSearchYear(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">全部年度</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>

              {/* 月度查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">月度</label>
                <select
                  value={searchMonth}
                  onChange={(e) => setSearchMonth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  disabled={!searchYear}
                >
                  <option value="">全部月度</option>
                  <option value="1">1月</option>
                  <option value="2">2月</option>
                  <option value="3">3月</option>
                  <option value="4">4月</option>
                  <option value="5">5月</option>
                  <option value="6">6月</option>
                  <option value="7">7月</option>
                  <option value="8">8月</option>
                  <option value="9">9月</option>
                  <option value="10">10月</option>
                  <option value="11">11月</option>
                  <option value="12">12月</option>
                </select>
              </div>

              {/* 日期范围查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">开始日期</label>
                <input
                  type="date"
                  value={searchStartDate}
                  onChange={(e) => setSearchStartDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">结束日期</label>
                <input
                  type="date"
                  value={searchEndDate}
                  onChange={(e) => setSearchEndDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* 状态查询 */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">订单状况</label>
                <select
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value as OrderStatus | "")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">全部状况</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="paused">已暂停</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>

              {/* 客户查询 */}
              <div className="lg:col-span-3 relative">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">客户</label>
                <input
                  type="text"
                  value={searchCustomerCode}
                  onChange={handleCustomerCodeChange}
                  onFocus={() => {
                    if (searchCustomerCode) {
                      const filtered = customers.filter((c) =>
                        c.customerCode.toLowerCase().includes(searchCustomerCode.toLowerCase())
                      );
                      setFilteredCustomers(filtered);
                    }
                    setShowCustomerDropdown(true);
                  }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder="输入客户编码或名称..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                      >
                        <div className="font-medium">{customer.customerCode}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{customer.customerName}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 查询按钮 */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleAdvancedSearch}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                查询
              </button>
              <button
                onClick={handleResetSearch}
                className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
              >
                重置
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            暂无订单
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchKeyword ? "尝试其他搜索关键词" : "点击上方\"新建订单\"按钮创建第一个订单"}
          </p>
        </div>
      ) : (
        <>
          {/* 计算当前页面数据用于统计 */}
          {(() => {
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const currentPageOrders = orders.slice(startIndex, endIndex);
            const currentPageCount = currentPageOrders.length;
            const currentPageAmount = currentPageOrders.reduce((sum, order) => sum + (Number(order.orderAmount) || 0), 0);
            const totalCount = orders.length;
            const totalAmount = orders.reduce((sum, order) => sum + (Number(order.orderAmount) || 0), 0);
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
                    columns={orderColumns}
                    data={currentPageOrders}
                    storageKey="orders"
                    showPagination={false}
                  />
                ) : (
                  /* 卡片视图 */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentPageOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {order.projectName}
                            </h3>
                            {/* 延期提示 */}
                            {(() => {
                              if (order.deliveryDate) {
                                const deliveryDate = new Date(order.deliveryDate);
                                const currentDate = new Date();
                                deliveryDate.setHours(0, 0, 0, 0);
                                currentDate.setHours(0, 0, 0, 0);

                                if (currentDate > deliveryDate) {
                                  const diffTime = currentDate.getTime() - deliveryDate.getTime();
                                  const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return (
                                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                                      已延期{overdueDays}天
                                    </p>
                                  );
                                }
                              }
                              return null;
                            })()}
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {order.orderNumber}
                              </p>
                              {order.status === "paused" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  该订单已暂停
                                </span>
                              )}
                              {order.status === "cancelled" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  该订单已取消
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              order.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : order.status === "completed"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                : order.status === "paused"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {order.status === "active"
                              ? "进行中"
                              : order.status === "completed"
                              ? "已完成"
                              : order.status === "paused"
                              ? "暂停"
                              : "已取消"}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="truncate">{order.customerName}</span>
                          </div>
                          {order.specification && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="truncate">{order.specification}</span>
                            </div>
                          )}
                          {order.quantity && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                              <span>{order.quantity}</span>
                            </div>
                          )}
                          {order.orderAmount && (
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-medium">¥{Number(order.orderAmount).toLocaleString()} 元</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditOrder(order); }}
                            disabled={hasEditPermission === false}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'}`}
                            title={hasEditPermission === false ? '无操作权限' : '编辑'}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteOrder(order.id); }}
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

                {/* 数据汇总 - 只统计当前页面 */}
                <div className="mt-4 rounded-lg border border-gray-200 bg-gradient-to-r from-red-50 to-red-100 p-4 dark:border-red-900 dark:from-red-900/20 dark:to-red-800/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">本页订单数量</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {currentPageCount} / {totalCount} 条
                          </p>
                        </div>
                      </div>
                      <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">本页订单金额</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ¥{currentPageAmount.toLocaleString()} / ¥{totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-2 md:p-4 overflow-y-auto">
          <div className="w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] flex flex-col rounded-lg bg-white shadow-lg dark:bg-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingOrder ? "编辑订单" : "新建订单"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form id="orderForm" onSubmit={editingOrder ? handleUpdateOrder : handleCreateOrder}>
                <div className="space-y-6">
                  {/* 基本信息 */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">基本信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">订单号</label>
                        <input
                          type="text"
                          value={orderForm.orderNumber}
                          onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="请输入订单号"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">订单日期</label>
                        <input
                          type="date"
                          value={orderForm.orderDate}
                          onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="lg:col-span-2 relative">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">合同号</label>
                        <input
                          type="text"
                          value={orderForm.contractCode}
                          onChange={handleContractCodeChange}
                          onFocus={() => {
                            if (orderForm.contractCode) {
                              const filtered = contracts.filter((c) =>
                                c.contractCode.toLowerCase().includes(orderForm.contractCode.toLowerCase())
                              );
                              setFilteredContracts(filtered);
                            }
                            setShowContractDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowContractDropdown(false), 200)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="输入合同号，从合同管理模块查询"
                        />
                        {showContractDropdown && filteredContracts.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full max-w-4xl rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同编码</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同名称</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同日期</th>
                                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">客户信息</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredContracts.map((contract) => (
                                  <tr
                                    key={contract.id}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                                    onClick={() => handleContractSelect(contract)}
                                  >
                                    <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{contract.contractCode}</td>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{contract.contractName || '-'}</td>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                      {contract.contractDate 
                                        ? new Date(contract.contractDate).toLocaleDateString('zh-CN')
                                        : '-'
                                      }
                                    </td>
                                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{contract.customerName || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">客户编码</label>
                        <input
                          type="text"
                          disabled
                          value={orderForm.customerCode}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">客户名称</label>
                        <input
                          type="text"
                          disabled
                          value={orderForm.customerName}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">物料编码</label>
                        <div className="flex gap-2 relative">
                          <input
                            type="text"
                            value={orderForm.materialCode}
                            onChange={handleMaterialCodeChange}
                            onKeyPress={handleMaterialCodeKeyPress}
                            onFocus={() => {
                              if (orderForm.materialCode) {
                                handleMaterialCodeChange({ target: { value: orderForm.materialCode } } as React.ChangeEvent<HTMLInputElement>);
                              }
                              setShowProductDropdown(true);
                            }}
                            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="输入物料编码，支持模糊查询"
                          />
                          <button
                            type="button"
                            onClick={handleMaterialCodeSearch}
                            disabled={isLoadingProduct}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            {isLoadingProduct ? "查询中..." : "查询"}
                          </button>
                          {showProductDropdown && filteredProducts.length > 0 && (
                            <div className="absolute z-10 mt-10 w-full max-w-4xl rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 max-h-96 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">编码</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">项目名称</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">规格型号</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredProducts.map((product) => (
                                    <tr
                                      key={product.id}
                                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                                      onClick={() => handleProductSelect(product)}
                                    >
                                      <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{product.materialCode}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{product.projectName}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{product.specification || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">项目名称</label>
                        <input
                          type="text"
                          value={orderForm.projectName}
                          onChange={(e) => setOrderForm({ ...orderForm, projectName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">规格型号</label>
                        <input
                          type="text"
                          value={orderForm.specification}
                          onChange={(e) => setOrderForm({ ...orderForm, specification: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">数量</label>
                        <input
                          type="text"
                          value={orderForm.quantity}
                          onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">订单交付日期</label>
                        <input
                          type="date"
                          value={orderForm.deliveryDate}
                          onChange={(e) => setOrderForm({ ...orderForm, deliveryDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">实际交付日期</label>
                        <input
                          type="date"
                          value={orderForm.actualDeliveryDate}
                          onChange={(e) => setOrderForm({ ...orderForm, actualDeliveryDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">订单金额</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={orderForm.orderAmount}
                            onChange={(e) => {
                              // 只允许输入数字和一个小数点
                              let value = e.target.value.replace(/[^\d.]/g, '');

                              // 确保只有一个小数点
                              const parts = value.split('.');
                              if (parts.length > 2) {
                                value = parts[0] + '.' + parts.slice(1).join('');
                              }

                              // 限制小数点后最多两位
                              if (parts.length === 2 && parts[1].length > 2) {
                                value = parts[0] + '.' + parts[1].slice(0, 2);
                              }

                              // 自动格式化：如果输入的是整数，自动补全 .00
                              if (value && !value.includes('.')) {
                                value = parseFloat(value).toFixed(2);
                              } else if (value && value.endsWith('.')) {
                                value = value + '00';
                              } else if (value && value.includes('.') && parts[1].length === 1) {
                                value = value + '0';
                              }

                              // 移除前导零（除非是 0.00）
                              if (value !== '0.00' && value.startsWith('0') && !value.startsWith('0.')) {
                                value = value.replace(/^0+/, '');
                                if (value === '' || value === '.') {
                                  value = '0.00';
                                }
                              }

                              setOrderForm({ ...orderForm, orderAmount: value });
                            }}
                            placeholder="0.00"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">付款条件 <span className="text-xs text-gray-500 dark:text-gray-400">(自动生成)</span></label>
                        <input
                          type="text"
                          value={orderForm.paymentTerms}
                          disabled
                          placeholder="根据付款比率自动生成"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">状态</label>
                        <select
                          value={orderForm.status}
                          onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">进行中</option>
                          <option value="completed">完成</option>
                          <option value="paused">暂停</option>
                          <option value="cancelled">取消</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">项目进度</label>
                        <input
                          type="text"
                          value={orderForm.projectProgress}
                          onChange={(e) => setOrderForm({ ...orderForm, projectProgress: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 付款和开票信息 */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">付款和开票信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* 预付款 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">预付款</h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">预付款比率</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.prepayRatio}
                              onChange={(e) => handleRatioChange('prepayRatio', e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">预付金额</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={orderForm.prepayAmount}
                                onChange={(e) => handleAmountChange('prepayAmount', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderForm.prepayReceived}
                                onChange={(e) => setOrderForm({ ...orderForm, prepayReceived: e.target.checked })}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-xs text-green-600 font-medium">已收款</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">付款日期</label>
                          <input
                            type="date"
                            value={orderForm.prepayDate}
                            onChange={(e) => setOrderForm({ ...orderForm, prepayDate: e.target.value })}
                            disabled={!orderForm.prepayReceived}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票金额</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.prepayInvoiceAmount}
                              onChange={(e) => handleAmountChange('prepayInvoiceAmount', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票日期</label>
                          <input
                            type="date"
                            value={orderForm.prepayInvoiceDate}
                            onChange={(e) => setOrderForm({ ...orderForm, prepayInvoiceDate: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">已开票</label>
                          <input
                            type="checkbox"
                            checked={orderForm.prepayInvoiced}
                            onChange={(e) => setOrderForm({ ...orderForm, prepayInvoiced: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* 到货款 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">到货款</h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">到货款比率</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.arrivalRatio}
                              onChange={(e) => handleRatioChange('arrivalRatio', e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">到货金额</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={orderForm.arrivalAmount}
                                onChange={(e) => handleAmountChange('arrivalAmount', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderForm.arrivalReceived}
                                onChange={(e) => setOrderForm({ ...orderForm, arrivalReceived: e.target.checked })}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-xs text-green-600 font-medium">已收款</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">付款日期</label>
                          <input
                            type="date"
                            value={orderForm.arrivalDate}
                            onChange={(e) => setOrderForm({ ...orderForm, arrivalDate: e.target.value })}
                            disabled={!orderForm.arrivalReceived}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票金额</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.arrivalInvoiceAmount}
                              onChange={(e) => handleAmountChange('arrivalInvoiceAmount', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票日期</label>
                          <input
                            type="date"
                            value={orderForm.arrivalInvoiceDate}
                            onChange={(e) => setOrderForm({ ...orderForm, arrivalInvoiceDate: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">已开票</label>
                          <input
                            type="checkbox"
                            checked={orderForm.arrivalInvoiced}
                            onChange={(e) => setOrderForm({ ...orderForm, arrivalInvoiced: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* 验收款 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">验收款</h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">验收款比率</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.acceptanceRatio}
                              onChange={(e) => handleRatioChange('acceptanceRatio', e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">验收金额</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={orderForm.acceptanceAmount}
                                onChange={(e) => handleAmountChange('acceptanceAmount', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderForm.acceptanceReceived}
                                onChange={(e) => setOrderForm({ ...orderForm, acceptanceReceived: e.target.checked })}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-xs text-green-600 font-medium">已收款</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">付款日期</label>
                          <input
                            type="date"
                            value={orderForm.acceptanceDate}
                            onChange={(e) => setOrderForm({ ...orderForm, acceptanceDate: e.target.value })}
                            disabled={!orderForm.acceptanceReceived}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票金额</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.acceptanceInvoiceAmount}
                              onChange={(e) => handleAmountChange('acceptanceInvoiceAmount', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">开票日期</label>
                          <input
                            type="date"
                            value={orderForm.acceptanceInvoiceDate}
                            onChange={(e) => setOrderForm({ ...orderForm, acceptanceInvoiceDate: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">已开票</label>
                          <input
                            type="checkbox"
                            checked={orderForm.acceptanceInvoiced}
                            onChange={(e) => setOrderForm({ ...orderForm, acceptanceInvoiced: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* 质保款 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">质保款</h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">质保款比率</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.warrantyRatio}
                              onChange={(e) => handleRatioChange('warrantyRatio', e.target.value)}
                              placeholder="0"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">质保金额</label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={orderForm.warrantyAmount}
                                onChange={(e) => handleAmountChange('warrantyAmount', e.target.value)}
                                placeholder="0.00"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={orderForm.warrantyReceived}
                                onChange={(e) => setOrderForm({ ...orderForm, warrantyReceived: e.target.checked })}
                                className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                              />
                              <span className="text-xs text-green-600 font-medium">已收款</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">质保金付款日期</label>
                          <input
                            type="date"
                            value={orderForm.warrantyDate}
                            onChange={(e) => setOrderForm({ ...orderForm, warrantyDate: e.target.value })}
                            disabled={!orderForm.warrantyReceived}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">质保款开票金额</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={orderForm.warrantyInvoiceAmount}
                              onChange={(e) => handleAmountChange('warrantyInvoiceAmount', e.target.value)}
                              placeholder="0.00"
                              className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">元</span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">质保款开票日期</label>
                          <input
                            type="date"
                            value={orderForm.warrantyInvoiceDate}
                            onChange={(e) => setOrderForm({ ...orderForm, warrantyInvoiceDate: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">已开票</label>
                          <input
                            type="checkbox"
                            checked={orderForm.warrantyInvoiced}
                            onChange={(e) => setOrderForm({ ...orderForm, warrantyInvoiced: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* 备注 */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">备注</h4>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">备注信息</label>
                          <textarea
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                            rows={8}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => {
                  setShowOrderForm(false);
                  resetOrderForm();
                }}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-4 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                取消
              </button>
              <button
                type="submit"
                form="orderForm"
                className="w-full sm:w-auto rounded-lg bg-green-600 px-4 py-4 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                {editingOrder ? "更新" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
