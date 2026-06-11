"use client";

import { useState, useEffect, useRef } from "react";
import type { Customer, CustomerContact } from "@/storage/database";
import { generateImportTemplate, customerImportColumns } from "@/utils/excelImport";
import { Users, Pencil, Ban, CheckCircle, Trash2 } from "lucide-react";
import { ResizableTable, Column } from "@/components/ResizableTable";
import { checkPermission, showNoPermissionAlert } from "@/lib/permissionUtils";

type CustomerType = "terminal" | "agent";
type CustomerStatus = "active" | "inactive";
type ContactType = "procurement" | "technical";

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null);
  const [hasEditPermission, setHasEditPermission] = useState<boolean | null>(null);
  const [hasDeletePermission, setHasDeletePermission] = useState<boolean | null>(null);
  const [hasContactPermission, setHasContactPermission] = useState<boolean | null>(null);

  // 检查权限
  useEffect(() => {
    const checkPermissions = async () => {
      const edit = await checkPermission("customers", "edit");
      const deletePerm = await checkPermission("customers", "delete");
      const contact = await checkPermission("customer_contacts", "view");
      setHasEditPermission(edit);
      setHasDeletePermission(deletePerm);
      setHasContactPermission(contact);
    };
    checkPermissions();
  }, []);

  const [customerForm, setCustomerForm] = useState({
    customerCode: "",
    customerName: "",
    phone: "",
    address: "",
    customerType: "terminal" as CustomerType,
    status: "active" as CustomerStatus,
  });

  const [contactForm, setContactForm] = useState({
    contactType: "procurement" as ContactType,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    position: "",
  });

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("customers-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 视图状态
  const [viewType, setViewType] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("customers-view-type");
      if (saved === "table" || saved === "card") return saved;
    }
    return "table";
  });

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("customers-page-size", pageSize.toString());
  }, [pageSize]);

  // 保存viewType到localStorage
  useEffect(() => {
    localStorage.setItem("customers-view-type", viewType);
  }, [viewType]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async (keyword?: string) => {
    try {
      const url = keyword
        ? `/api/customers?search=${encodeURIComponent(keyword)}`
        : "/api/customers";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    fetchCustomers(keyword);
  };

  const fetchContacts = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/contacts`);
      const json = await res.json();
      if (json.success) {
        setCustomerContacts(json.data);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      if (res.ok) {
        await fetchCustomers(searchKeyword);
        setShowCustomerForm(false);
        resetCustomerForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("创建客户失败");
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      if (res.ok) {
        await fetchCustomers(searchKeyword);
        setEditingCustomer(null);
        setShowCustomerForm(false);
        resetCustomerForm();
      } else {
        const json = await res.json();
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("更新客户失败");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("确定要删除此客户吗？")) return;
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCustomers(searchKeyword);
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      alert("删除客户失败");
    }
  };

  const handleDownloadTemplate = () => {
    generateImportTemplate(customerImportColumns, "客户", "客户导入");
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
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const { total, success, failed, errors } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${success} 条\n失败：${failed} 条`;
        if (errors && errors.length > 0) {
          message += '\n\n失败详情：\n' + errors.map((e: any) => `客户编码：${e.customerCode}，错误：${e.error}`).join('\n');
        }
        alert(message);
        await fetchCustomers(searchKeyword);
      } else {
        alert(json.error || '导入失败');
      }
    } catch (error) {
      console.error('Error importing customers:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      phone: customer.phone || "",
      address: customer.address || "",
      customerType: customer.customerType as CustomerType,
      status: customer.status as CustomerStatus,
    });
    setShowCustomerForm(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "恢复合作" : "停止合作";
    if (!confirm(`确定要${action}此客户吗？`)) return;

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCustomers(searchKeyword);
      } else {
        const json = await res.json();
        alert(json.error || "操作失败");
      }
    } catch (error) {
      console.error("Error toggling customer status:", error);
      alert("操作失败");
    }
  };

  const handleManageContacts = (customer: Customer) => {
    setSelectedCustomer(customer);
    fetchContacts(customer.id);
    setShowContactForm(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        await fetchContacts(selectedCustomer.id);
        resetContactForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating contact:", error);
      alert("创建联系人失败");
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("确定要删除此联系人吗？")) return;
    if (!selectedCustomer) return;
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchContacts(selectedCustomer.id);
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      alert("删除联系人失败");
    }
  };

  const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setContactForm({
      contactType: contact.contactType as ContactType,
      contactName: contact.contactName,
      contactPhone: contact.contactPhone || "",
      contactEmail: contact.contactEmail || "",
      position: contact.position || "",
    });
  };

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !editingContact) return;
    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/contacts/${editingContact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        await fetchContacts(selectedCustomer.id);
        setEditingContact(null);
        resetContactForm();
      } else {
        const json = await res.json();
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating contact:", error);
      alert("更新联系人失败");
    }
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      customerCode: "",
      customerName: "",
      phone: "",
      address: "",
      customerType: "terminal",
      status: "active",
    });
    setEditingCustomer(null);
  };

  const resetContactForm = () => {
    setContactForm({
      contactType: "procurement",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      position: "",
    });
    setEditingContact(null);
  };

  const getCustomerTypeText = (type: string) => {
    return type === "terminal" ? "终端" : "中介";
  };

  const getCustomerTypeColor = (type: string) => {
    return type === "terminal"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
  };

  const getContactTypeText = (type: string) => {
    return type === "procurement" ? "采购" : "技术";
  };

  const getContactTypeColor = (type: string) => {
    return type === "procurement"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  };

  // 定义客户表格列配置
  const customerColumns: Column<Customer>[] = [
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
      key: "customerCode",
      title: "客户编号",
      width: 150,
      sortable: true,
      render: (value, row) => (
        <button
          type="button"
          onClick={async () => {
            setDetailCustomer(row);
            setShowCustomerDetail(true);
            // 加载联系人数据
            setLoadingContacts(true);
            try {
              const res = await fetch(`/api/customers/${row.id}/contacts`);
              const json = await res.json();
              if (json.success) {
                setCustomerContacts(json.data || []);
              } else {
                setCustomerContacts([]);
              }
            } catch (error) {
              console.error("获取联系人失败:", error);
              setCustomerContacts([]);
            } finally {
              setLoadingContacts(false);
            }
          }}
          className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          {value}
        </button>
      ),
    },
    {
      key: "customerName",
      title: "客户名称",
      width: 200,
      sortable: true,
      render: (_, row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{row.customerName}</span>
          {row.status === "inactive" && (
            <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              该客户已停止合作，禁止交易
            </div>
          )}
        </div>
      ),
    },
    {
      key: "customerType",
      title: "客户类型",
      width: 120,
      sortable: true,
      render: (value) => (
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getCustomerTypeColor(value)}`}>
          {getCustomerTypeText(value)}
        </span>
      ),
    },
    {
      key: "phone",
      title: "联系电话",
      width: 150,
      sortable: false,
      render: (value) => value || "-",
    },
    {
      key: "address",
      title: "地址",
      width: 250,
      sortable: false,
      render: (value) => value || "-",
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      sortable: true,
      render: (value) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            value === "active"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {value === "active" ? "合作中" : "停止合作"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 160,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-1 items-center justify-end">
          <button
            onClick={() => { if (hasContactPermission === false) { showNoPermissionAlert(); return; } handleManageContacts(row); }}
            disabled={hasContactPermission === false}
            className={`p-1.5 rounded-md transition-colors ${hasContactPermission === false ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' : 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/30'}`}
            title={hasContactPermission === false ? '无操作权限' : '联系人'}
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditCustomer(row); }}
            disabled={hasEditPermission === false}
            className={`p-1.5 rounded-md transition-colors ${hasEditPermission === false ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30'}`}
            title={hasEditPermission === false ? '无操作权限' : '编辑'}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleToggleStatus(row); }}
            disabled={hasEditPermission === false}
            className={`p-1.5 rounded-md transition-colors ${
              hasEditPermission === false
                ? 'text-gray-300 cursor-not-allowed dark:text-gray-600'
                : row.status === "active"
                  ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
            }`}
            title={hasEditPermission === false ? '无操作权限' : row.status === "active" ? '停止' : '恢复'}
          >
            {row.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteCustomer(row.id); }}
            disabled={hasDeletePermission === false}
            className={`p-1.5 rounded-md transition-colors ${hasDeletePermission === false ? 'text-gray-300 cursor-not-allowed dark:text-gray-600' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30'}`}
            title={hasDeletePermission === false ? '无操作权限' : '删除'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            客户管理
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            管理客户信息和联系人
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
            onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } resetCustomerForm(); setShowCustomerForm(true); }}
            disabled={hasEditPermission === false}
            className={`rounded-lg px-4 py-2 text-white transition-colors ${hasEditPermission === false ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'}`}
            title={hasEditPermission === false ? '无操作权限' : '新建客户'}
          >
            新建客户
          </button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          value={searchKeyword}
          onChange={handleSearch}
          placeholder="搜索客户编号、客户名称、联系电话或地址..."
          className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* 视图切换和操作栏 */}
      {!isLoading && customers.length > 0 && (
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
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {searchKeyword ? "未找到匹配的客户" : "暂无客户"}
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {searchKeyword
              ? "尝试其他搜索关键词"
              : "点击上方\"新建客户\"按钮创建第一个客户"}
          </p>
        </div>
      ) : (
        <>
          {viewType === "table" ? (
            <ResizableTable
              columns={customerColumns}
              data={customers.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
              storageKey="customers"
            />
          ) : (
            /* 卡片视图 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {customer.customerName}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getCustomerTypeColor(
                            customer.customerType
                          )}`}
                        >
                          {getCustomerTypeText(customer.customerType)}
                        </span>
                      </div>
                      {customer.status === "inactive" && (
                        <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                          该客户已停止合作，禁止交易
                        </div>
                      )}
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        编号: {customer.customerCode}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        customer.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {customer.status === "active" ? "合作中" : "停止合作"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {customer.phone && (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="line-clamp-2">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => { if (hasContactPermission === false) { showNoPermissionAlert(); return; } handleManageContacts(customer); }}
                      disabled={hasContactPermission === false}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasContactPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'}`}
                      title={hasContactPermission === false ? '无操作权限' : '联系人'}
                    >
                      联系人
                    </button>
                    <button
                      onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditCustomer(customer); }}
                      disabled={hasEditPermission === false}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'}`}
                      title={hasEditPermission === false ? '无操作权限' : '编辑'}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleToggleStatus(customer); }}
                      disabled={hasEditPermission === false}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (customer.status === "active" ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50')}`}
                      title={hasEditPermission === false ? '无操作权限' : (customer.status === "active" ? '停止' : '恢复')}
                    >
                      {customer.status === "active" ? "停止" : "恢复"}
                    </button>
                    <button
                      onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteCustomer(customer.id); }}
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

          {/* 分页控制 */}
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
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

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                共 {customers.length} 条记录
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
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  第 {currentPage} / {Math.ceil(customers.length / pageSize) || 1} 页
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(Math.ceil(customers.length / pageSize) || 1, prev + 1)
                    )
                  }
                  disabled={currentPage >= Math.ceil(customers.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  下一页
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.ceil(customers.length / pageSize) || 1)
                  }
                  disabled={currentPage >= Math.ceil(customers.length / pageSize)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {editingCustomer ? "编辑客户" : "新建客户"}
            </h2>
            <form onSubmit={editingCustomer ? handleUpdateCustomer : handleCreateCustomer}>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  客户编号 *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCustomer}
                  value={customerForm.customerCode}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, customerCode: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                  placeholder="例如：C001"
                />
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  客户名称 *
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.customerName}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, customerName: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="输入客户名称"
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    客户类型
                  </label>
                  <select
                    value={customerForm.customerType}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        customerType: e.target.value as CustomerType,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="terminal">终端</option>
                    <option value="agent">中介</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    状态
                  </label>
                  <select
                    value={customerForm.status}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        status: e.target.value as CustomerStatus,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">合作中</option>
                    <option value="inactive">停止合作</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  联系电话
                </label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="输入联系电话"
                />
              </div>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  地址
                </label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, address: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="输入客户地址"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerForm(false);
                    resetCustomerForm();
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {editingCustomer ? "更新" : "创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Management Modal */}
      {showContactForm && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  联系人管理
                </h2>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {selectedCustomer.customerName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowContactForm(false);
                  setSelectedCustomer(null);
                  setEditingContact(null);
                  resetContactForm();
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                关闭
              </button>
            </div>

            <div className="mb-4">
              <form onSubmit={editingContact ? handleUpdateContact : handleCreateContact} className="mb-4">
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      联系人类型
                    </label>
                    <select
                      value={contactForm.contactType}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          contactType: e.target.value as ContactType,
                        })
                      }
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="procurement">采购</option>
                      <option value="technical">技术</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      姓名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactForm.contactName}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, contactName: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="姓名"
                    />
                  </div>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      电话
                    </label>
                    <input
                      type="tel"
                      value={contactForm.contactPhone}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, contactPhone: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="电话"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={contactForm.contactEmail}
                      onChange={(e) =>
                        setContactForm({ ...contactForm, contactEmail: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="邮箱"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    职位
                  </label>
                  <input
                    type="text"
                    value={contactForm.position}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, position: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="职位"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {editingContact && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact(null);
                        resetContactForm();
                      }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                      取消编辑
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {editingContact ? "更新" : "添加"}
                  </button>
                </div>
              </form>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h3 className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  联系人列表
                </h3>
                {customerContacts.length === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-500 dark:text-gray-400">
                    暂无联系人
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {customerContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${getContactTypeColor(
                                  contact.contactType
                                )}`}
                              >
                                {getContactTypeText(contact.contactType)}
                              </span>
                              <span className="font-medium text-sm text-gray-900 dark:text-white">
                                {contact.contactName}
                              </span>
                              {contact.position && (
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  ({contact.position})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                              {contact.contactPhone && <div className="truncate">📞 {contact.contactPhone}</div>}
                              {contact.contactEmail && <div className="truncate">✉️ {contact.contactEmail}</div>}
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleEditContact(contact)}
                              className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id)}
                              className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 客户详情弹窗 */}
      {showCustomerDetail && detailCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">客户详情</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {detailCustomer.customerCode}
                </p>
              </div>
              <button
                onClick={() => setShowCustomerDetail(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* 基本信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                  基本信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">客户编号</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">{detailCustomer.customerCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">客户名称</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">{detailCustomer.customerName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">客户类型</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {detailCustomer.customerType === "terminal" ? "终端客户" : "代理商"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">客户状态</p>
                    <p className="text-sm mt-0.5">
                      {detailCustomer.status === "active" ? (
                        <span className="text-green-600 dark:text-green-400">正常</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">已停止合作</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">联系电话</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">{detailCustomer.phone || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">地址</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">{detailCustomer.address || "-"}</p>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                  统计信息
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">创建时间</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {detailCustomer.createdAt ? new Date(detailCustomer.createdAt).toLocaleString("zh-CN") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">最后更新时间</p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {detailCustomer.updatedAt ? new Date(detailCustomer.updatedAt).toLocaleString("zh-CN") : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 联系人信息 - 需要客户联系人查看权限 */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                  联系人信息
                </h3>
                {hasContactPermission === false ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      无权限查看联系人信息
                    </p>
                  </div>
                ) : loadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-sm text-gray-500">加载中...</span>
                  </div>
                ) : customerContacts.length > 0 ? (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">姓名</th>
                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">部门</th>
                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">职位</th>
                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">电话</th>
                          <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-300 font-medium">邮箱</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerContacts.map((contact, idx) => (
                          <tr key={contact.id || idx} className="border-t border-gray-100 dark:border-gray-600">
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{contact.contactName || "-"}</td>
                            <td className="py-2 px-3 text-gray-900 dark:text-white">-</td>
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{contact.position || "-"}</td>
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{contact.contactPhone || "-"}</td>
                            <td className="py-2 px-3 text-gray-900 dark:text-white">{contact.contactEmail || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">暂无联系人</p>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setShowCustomerDetail(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
