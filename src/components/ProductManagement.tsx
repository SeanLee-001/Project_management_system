"use client";

import { useState, useEffect, useRef } from "react";
import type { Product } from "@/storage/database";
import IconUpload from "./IconUpload";
import ProductCodeManagement from "./ProductCodeManagement";
import { Pencil, Ban, CheckCircle, Trash2 } from "lucide-react";
import { generateImportTemplate, productImportColumns } from "@/utils/excelImport";
import { ResizableTable, Column } from "@/components/ResizableTable";
import { convertToProxyUrls } from "@/lib/imageUtils";
import { checkPermission, showNoPermissionAlert, clearPermissionCache } from "@/lib/permissionUtils";
import WatermarkImage from "./WatermarkImage";

type ProductStatus = "active" | "inactive";
type ProductViewType = "management" | "code";

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [hasConfigPermission, setHasConfigPermission] = useState<boolean | null>(null);
  const [hasEditPermission, setHasEditPermission] = useState<boolean | null>(null);
  const [hasDeletePermission, setHasDeletePermission] = useState<boolean | null>(null);

  // 公司名称（水印使用）
  const [companyName, setCompanyName] = useState<string>("");

  // 检查各种权限
  useEffect(() => {
    const checkPermissions = async () => {
      const config = await checkPermission("config", "use");
      const edit = await checkPermission("products", "edit");
      const deletePerm = await checkPermission("products", "delete");
      setHasConfigPermission(config);
      setHasEditPermission(edit);
      setHasDeletePermission(deletePerm);
    };
    checkPermissions();
  }, []);

  // 页面类型切换状态
  const [pageType, setPageType] = useState<ProductViewType>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("products-page-type");
      if (saved === "management" || saved === "code") return saved;
    }
    return "management";
  });

  // 保存pageType到localStorage
  useEffect(() => {
    localStorage.setItem("products-page-type", pageType);
  }, [pageType]);

  const [productForm, setProductForm] = useState({
    materialCode: "",
    projectName: "",
    specification: "",
    description: "",
    imageUrl: "",
    status: "active" as ProductStatus,
  });

  // 物料编码搜索相关状态
  const [showCodeSearch, setShowCodeSearch] = useState(false);
  const [searchCodeKeyword, setSearchCodeKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const codeSearchRef = useRef<HTMLDivElement>(null);

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 分页状态
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("products-page-size");
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // 视图状态
  const [viewType, setViewType] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("products-view-type");
      if (saved === "table" || saved === "card") return saved;
    }
    return "table";
  });

  // 保存pageSize到localStorage
  useEffect(() => {
    localStorage.setItem("products-page-size", pageSize.toString());
  }, [pageSize]);

  // 保存viewType到localStorage
  useEffect(() => {
    localStorage.setItem("products-view-type", viewType);
  }, [viewType]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // 获取系统设置中的公司名称（水印用）
  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success && data.data.companyName) {
          setCompanyName(data.data.companyName);
        }
      } catch (error) {
        console.error("获取公司名称失败:", error);
      }
    };
    fetchCompanyName();
  }, []);

  const handleDownloadTemplate = () => {
    generateImportTemplate(productImportColumns, "产品", "产品导入");
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
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        const { total, success, failed, errors } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${success} 条\n失败：${failed} 条`;
        if (errors && errors.length > 0) {
          message += '\n\n失败详情：\n' + errors.map((e: any) => `物料编码：${e.materialCode}，错误：${e.error}`).join('\n');
        }
        alert(message);
        await fetchProducts();
      } else {
        alert(json.error || '导入失败');
      }
    } catch (error) {
      console.error('Error importing products:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (codeSearchRef.current && !codeSearchRef.current.contains(event.target as Node)) {
        setShowCodeSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const json = await res.json();
      if (json.success) {
        // 转换图片 URL 为代理 URL
        const convertedProducts = convertToProxyUrls<Product>(json.data);
        setProducts(convertedProducts);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 搜索编码记录
  const searchGeneratedCodes = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/generated-codes-v2?keyword=${encodeURIComponent(keyword)}&limit=10`);
      const json = await res.json();
      if (json.data) {
        setSearchResults(json.data);
      }
    } catch (error) {
      console.error("Error searching codes:", error);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      if (res.ok) {
        await fetchProducts();
        setShowProductForm(false);
        resetProductForm();
      } else {
        const json = await res.json();
        alert(json.error || "创建失败");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      alert("创建产品失败");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      if (res.ok) {
        await fetchProducts();
        setEditingProduct(null);
        setShowProductForm(false);
        resetProductForm();
      } else {
        const json = await res.json();
        alert(json.error || "更新失败");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("更新产品失败");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("确定要删除此产品吗？")) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchProducts();
      } else {
        const json = await res.json();
        alert(json.error || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("删除产品失败");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      materialCode: product.materialCode,
      projectName: product.projectName,
      specification: product.specification || "",
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      status: product.status as ProductStatus,
    });
    setShowProductForm(true);
  };

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    const action = newStatus === "active" ? "启用" : "停用";
    if (!confirm(`确定要${action}此产品吗？`)) return;

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchProducts();
      } else {
        const json = await res.json();
        alert(json.error || "操作失败");
      }
    } catch (error) {
      console.error("Error toggling product status:", error);
      alert("操作失败");
    }
  };

  const resetProductForm = () => {
    setProductForm({
      materialCode: "",
      projectName: "",
      specification: "",
      description: "",
      imageUrl: "",
      status: "active",
    });
    setEditingProduct(null);
    setShowCodeSearch(false);
    setSearchCodeKeyword('');
    setSearchResults([]);
  };

  const getStatusText = (status: string) => {
    return status === "active" ? "启用" : "停用";
  };

  const getStatusColor = (status: string) => {
    return status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };

  // 定义表格列配置
  const productColumns: Column<Product>[] = [
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
      key: "materialCode",
      title: "物料编码",
      width: 180,
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: "projectName",
      title: "项目名称",
      width: 200,
      sortable: true,
      render: (_, row) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-white">{row.projectName}</span>
          {row.status === "inactive" && (
            <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              该产品已停用，禁止交易
            </div>
          )}
        </div>
      ),
    },
    {
      key: "specification",
      title: "规格型号",
      width: 150,
      sortable: true,
      render: (value) => value || "-",
    },
    {
      key: "imageUrl",
      title: "产品图片",
      width: 100,
      sortable: false,
      render: (value, row) => (
        value ? (
          <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            <WatermarkImage
              src={value}
              alt={row.materialCode}
              companyName={companyName}
            />
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-600">-</span>
        )
      ),
    },
    {
      key: "description",
      title: "描述",
      width: 250,
      sortable: true,
      render: (value) => (
        <div className="whitespace-normal break-words text-sm leading-relaxed">
          {value || "-"}
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
            value
          )}`}
        >
          {getStatusText(value)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 120,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-1 items-center justify-end">
          <button
            onClick={() => {
              if (hasEditPermission === false) {
                showNoPermissionAlert();
                return;
              }
              handleEditProduct(row);
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
              if (hasEditPermission === false) {
                showNoPermissionAlert();
                return;
              }
              handleToggleStatus(row);
            }}
            disabled={hasEditPermission === false}
            className={`p-1.5 rounded-md transition-colors ${
              hasEditPermission === false
                ? "text-gray-300 cursor-not-allowed dark:text-gray-600"
                : row.status === "active"
                  ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30"
                  : "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30"
            }`}
            title={hasEditPermission === false ? "无操作权限" : row.status === "active" ? "停用" : "启用"}
          >
            {row.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              if (hasDeletePermission === false) {
                showNoPermissionAlert();
                return;
              }
              handleDeleteProduct(row.id);
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
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* 标题区域 */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageType === "management" ? "产品管理" : "产品编码"}
            </h2>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {pageType === "management"
                ? "管理产品信息、规格和图片"
                : "生成和管理产品编码"}
            </p>
          </div>
          {/* 页面类型切换按钮 */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
            <button
              onClick={() => setPageType("management")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pageType === "management"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              产品管理
            </button>
            <button
              onClick={() => setPageType("code")}
              disabled={hasConfigPermission === false}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pageType === "code"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                  : hasConfigPermission === false
                    ? "text-gray-400 cursor-not-allowed dark:text-gray-500"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
              title={hasConfigPermission === false ? "您没有产品编码使用权限" : ""}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              产品编码
            </button>
          </div>
        </div>
        {pageType === "management" && (
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
              onClick={() => {
                if (hasEditPermission === false) {
                  showNoPermissionAlert();
                  return;
                }
                resetProductForm();
                setShowProductForm(true);
              }}
              disabled={hasEditPermission === false}
              className={`rounded-lg px-4 py-2 text-white transition-colors ${
                hasEditPermission === false
                  ? "bg-gray-400 cursor-not-allowed hover:bg-gray-400"
                  : "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              }`}
              title={hasEditPermission === false ? "无操作权限" : "新建产品"}
            >
              新建产品
            </button>
          </div>
        )}
      </div>

      {/* 根据页面类型显示不同内容 */}
      {pageType === "code" ? (
        <ProductCodeManagement />
      ) : (
        <>
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            暂无产品
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            点击上方"新建产品"按钮创建第一个产品
          </p>
        </div>
      ) : (
        <div>
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
              columns={productColumns}
              data={products.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
              storageKey="products"
            />
          ) : (
            /* 卡片视图 */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="aspect-video w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden relative">
                    {product.imageUrl ? (
                      <WatermarkImage
                        src={product.imageUrl}
                        alt={product.materialCode}
                        companyName={companyName}
                        className="max-w-full max-h-full w-auto h-auto object-contain p-2"
                      />
                    ) : (
                      <div className="text-gray-400 dark:text-gray-600">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {product.projectName}
                        </h3>
                        {product.status === "inactive" && (
                          <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                            该产品已停用，禁止交易
                          </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {product.materialCode}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                          product.status
                        )}`}
                      >
                        {getStatusText(product.status)}
                      </span>
                    </div>
                    {product.specification && (
                      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                        {product.specification}
                      </p>
                    )}
                    {product.description && (
                      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleEditProduct(product); }}
                        disabled={hasEditPermission === false}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'}`}
                        title={hasEditPermission === false ? '无操作权限' : '编辑'}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => { if (hasEditPermission === false) { showNoPermissionAlert(); return; } handleToggleStatus(product); }}
                        disabled={hasEditPermission === false}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasEditPermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : (product.status === "active" ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50')}`}
                        title={hasEditPermission === false ? '无操作权限' : (product.status === "active" ? '停用' : '启用')}
                      >
                        {product.status === "active" ? "停用" : "启用"}
                      </button>
                      <button
                        onClick={() => { if (hasDeletePermission === false) { showNoPermissionAlert(); return; } handleDeleteProduct(product.id); }}
                        disabled={hasDeletePermission === false}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${hasDeletePermission === false ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500' : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50'}`}
                        title={hasDeletePermission === false ? '无操作权限' : '删除'}
                      >
                        删除
                      </button>
                    </div>
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
              共 {products.length} 条记录
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
                第 {currentPage} / {Math.ceil(products.length / pageSize) || 1} 页
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(Math.ceil(products.length / pageSize) || 1, prev + 1)
                  )
                }
                disabled={currentPage >= Math.ceil(products.length / pageSize)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                下一页
              </button>
              <button
                onClick={() =>
                  setCurrentPage(Math.ceil(products.length / pageSize) || 1)
                }
                disabled={currentPage >= Math.ceil(products.length / pageSize)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                末页
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
      </>
      )}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50 dark:bg-black/70 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto rounded-lg bg-white shadow-lg dark:bg-gray-800 flex flex-col max-h-[95vh]">
            <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingProduct ? "编辑产品" : "新建产品"}
              </h2>
            </div>
            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="flex flex-col max-h-[85vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="relative" ref={codeSearchRef}>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    物料编码 *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.materialCode}
                    onChange={(e) => {
                      setProductForm({ ...productForm, materialCode: e.target.value });
                      setSearchCodeKeyword(e.target.value);
                      if (e.target.value.trim()) {
                        searchGeneratedCodes(e.target.value);
                        setShowCodeSearch(true);
                      } else {
                        setShowCodeSearch(false);
                        setSearchResults([]);
                      }
                    }}
                    disabled={!!editingProduct}
                    placeholder="输入关键字搜索物料编码..."
                    onFocus={() => {
                      if (productForm.materialCode.trim()) {
                        setShowCodeSearch(true);
                        searchGeneratedCodes(productForm.materialCode);
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {/* 搜索结果下拉框 */}
                  {!editingProduct && showCodeSearch && searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">编码</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">物料名称</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">项目名称</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">产品大类</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">版本</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchResults.map((result) => (
                            <tr
                              key={result.record_id}
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                              onClick={() => {
                                setProductForm({
                                  ...productForm,
                                  materialCode: result.code,
                                  projectName: result.project_name || result.material_name || '',
                                });
                                setShowCodeSearch(false);
                                setSearchResults([]);
                              }}
                            >
                              <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{result.code}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.material_name}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.project_name || result.material_name || '-'}</td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.second_category_name || '-'}</td>
                              <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{result.version || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    项目名称 *
                  </label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={productForm.projectName}
                    onChange={(e) =>
                      setProductForm({ ...productForm, projectName: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                    placeholder="请先选择产品编码"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    规格型号
                  </label>
                  <input
                    type="text"
                    value={productForm.specification}
                    onChange={(e) =>
                      setProductForm({ ...productForm, specification: e.target.value })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    产品描述
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
                <IconUpload
                  currentIconUrl={productForm.imageUrl}
                  onIconChange={(url) => setProductForm({ ...productForm, imageUrl: url || "" })}
                  label="产品图片"
                  size="lg"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    状态
                  </label>
                  <select
                    value={productForm.status}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        status: e.target.value as ProductStatus,
                      })
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div className="flex-none p-4 md:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductForm(false);
                      resetProductForm();
                    }}
                    className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-3 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 font-medium shadow-sm"
                  >
                    {editingProduct ? "保存" : "创建"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
