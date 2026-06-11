"use client";

import { useState, useEffect } from "react";
import { ResizableTable, Column } from "@/components/ResizableTable";

interface SystemLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  userId: string | null;
  username: string | null;
  fullName: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

const ERROR_DETAIL_MAP: Record<string, string> = {
  "Unauthorized": "未授权访问，请先登录",
  "Forbidden": "权限不足，禁止访问",
  "Not Found": "请求的资源不存在",
  "Internal Server Error": "服务器内部错误",
  "Bad Request": "请求参数错误",
  "Invalid credentials": "用户名或密码错误",
  "Token expired": "登录已过期，请重新登录",
  "Invalid token": "无效的认证令牌",
  "Token 已过期": "登录已过期，请重新登录",
  "无效的 token": "无效的认证令牌",
  "Permission denied": "权限不足，无法执行操作",
  "Resource not found": "资源不存在",
  "Duplicate entry": "数据已存在，请勿重复添加",
  "Foreign key constraint": "关联数据约束冲突",
  "Connection refused": "数据库连接被拒绝",
  "Connection timeout": "数据库连接超时",
  "Network error": "网络错误，请检查网络连接",
  "Rate limit exceeded": "请求频率超限，请稍后再试",
  "File too large": "文件大小超限",
  "Unsupported file type": "不支持的文件类型",
  "Validation error": "数据验证失败，请检查输入",
  "Create failed": "创建操作失败",
  "Update failed": "更新操作失败",
  "Delete failed": "删除操作失败",
  "Query failed": "查询操作失败",
  "Login failed": "登录失败",
  "Logout failed": "登出失败",
  "Password change failed": "密码修改失败",
  "Import failed": "导入失败",
  "Export failed": "导出失败",
  "Upload failed": "上传失败",
  "Download failed": "下载失败",
  "Failed to fetch": "网络请求失败，请检查网络连接",
  "Failed to login": "登录失败，请检查用户名和密码",
  "Failed to create": "创建失败，请稍后重试",
  "Failed to update": "更新失败，请稍后重试",
  "Failed to delete": "删除失败，请稍后重试",
  "Failed to fetch data": "获取数据失败",
  "Failed to save": "保存失败，请稍后重试",
  "Failed to process": "处理失败，请稍后重试",
  "数据库错误": "数据库操作异常",
  "认证失败": "身份验证失败",
  "验证失败": "数据验证失败",
  "参数错误": "请求参数不正确",
  "数据不存在": "请求的数据不存在",
  "数据已存在": "数据已存在，请勿重复添加",
  "操作失败": "操作执行失败",
  "系统繁忙": "系统繁忙，请稍后重试",
  "服务不可用": "服务暂时不可用",
  "请求超时": "请求超时，请重试",
  "ERR_": "系统错误",
  "ECONNREFUSED": "连接被拒绝",
  "ETIMEDOUT": "连接超时",
  "ENOTFOUND": "无法找到服务器",
};

function translateDetail(detail: string | null): string {
  if (!detail) return "-";
  
  // 去除前后的空白字符
  detail = detail.trim();
  
  // 如果详情很短且看起来是错误代码，返回友好的错误提示
  if (detail.length < 50 && (detail.startsWith("ERR_") || detail.startsWith("E") || detail.startsWith("Failed"))) {
    // 先尝试精确匹配
    for (const [key, value] of Object.entries(ERROR_DETAIL_MAP)) {
      if (detail === key) return value;
    }
    // 再尝试部分匹配
    for (const [key, value] of Object.entries(ERROR_DETAIL_MAP)) {
      if (detail.includes(key)) {
        return value;
      }
    }
    // 如果是常见错误代码前缀，返回通用提示
    if (detail.startsWith("ERR_")) return "系统内部错误，请稍后查看日志详情";
    if (detail.startsWith("ECONN")) return "网络连接错误";
    if (detail.startsWith("ETIM")) return "请求超时";
    if (detail.startsWith("Failed to")) return "操作执行失败";
  }
  
  // 精确匹配
  if (ERROR_DETAIL_MAP[detail]) return ERROR_DETAIL_MAP[detail];
  
  // 部分匹配 - 找到最长的匹配键
  let bestMatch = "";
  let bestTranslation = "";
  for (const [key, value] of Object.entries(ERROR_DETAIL_MAP)) {
    if (detail.includes(key) && key.length > bestMatch.length) {
      bestMatch = key;
      bestTranslation = value;
    }
  }
  if (bestTranslation) {
    // 如果有额外信息，附加在后面
    const extraInfo = detail.replace(bestMatch, "").trim();
    if (extraInfo && extraInfo.length < 200) {
      return `${bestTranslation}${extraInfo ? ` - ${extraInfo}` : ""}`;
    }
    return bestTranslation;
  }
  
  // 如果详情是技术错误信息，尝试提取关键信息并翻译
  if (detail.includes("Error:") || detail.includes("error:")) {
    const errorPart = detail.split(/Error:|error:/)[1]?.trim();
    if (errorPart) {
      const translated = translateDetail(errorPart);
      return translated !== "-" ? translated : detail;
    }
  }
  
  // 其他情况返回原文 (但限制长度)
  if (detail.length > 300) {
    return detail.substring(0, 280) + "...";
  }
  
  return detail;
}

export default function SystemLogManagement() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 过滤条件
  const [filters, setFilters] = useState({
    action: "",
    resource: "",
    status: "",
    search: "",
  });

  // 操作类型选项
  const actionOptions = [
    { value: "", label: "全部操作" },
    { value: "login", label: "登录" },
    { value: "logout", label: "登出" },
    { value: "create", label: "创建" },
    { value: "update", label: "更新" },
    { value: "delete", label: "删除" },
    { value: "approve", label: "审核通过" },
    { value: "reject", label: "审核拒绝" },
    { value: "reset_password", label: "重置密码" },
    { value: "change_password", label: "修改密码" },
    { value: "import", label: "导入" },
    { value: "export", label: "导出" },
  ];

  // 资源类型选项
  const resourceOptions = [
    { value: "", label: "全部资源" },
    { value: "user", label: "用户" },
    { value: "project", label: "项目" },
    { value: "task", label: "任务" },
    { value: "customer", label: "客户" },
    { value: "contract", label: "合同" },
    { value: "order", label: "订单" },
    { value: "product", label: "产品" },
    { value: "message", label: "消息" },
    { value: "system", label: "系统" },
  ];

  // 状态选项
  const statusOptions = [
    { value: "", label: "全部状态" },
    { value: "success", label: "成功" },
    { value: "failed", label: "失败" },
  ];

  useEffect(() => {
    fetchLogs();
  }, [page, limit, filters]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const res = await fetch(`/api/system-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (error) {
      console.error("获取系统日志失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("确定要删除这条日志吗？")) return;

    try {
      const res = await fetch(`/api/system-logs/${logId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchLogs();
      }
    } catch (error) {
      console.error("删除日志失败:", error);
      alert("删除日志失败");
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!confirm("确定要清空所有日志吗？此操作不可恢复！")) return;

    try {
      const res = await fetch("/api/system-logs", {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        alert(`已清空 ${json.count} 条日志`);
        await fetchLogs();
      } else {
        alert("清空日志失败");
      }
    } catch (error) {
      console.error("清空日志失败:", error);
      alert("清空日志失败");
    }
  };

  const handleDeleteOldLogs = async (days: number) => {
    if (
      !confirm(
        `确定要删除 ${days} 天前的日志吗？此操作不可恢复！`
      )
    )
      return;

    try {
      const res = await fetch(`/api/system-logs?days=${days}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        alert(`已删除 ${json.count} 条日志`);
        await fetchLogs();
      } else {
        alert("删除旧日志失败");
      }
    } catch (error) {
      console.error("删除旧日志失败:", error);
      alert("删除旧日志失败");
    }
  };

  const handleExportLogs = async () => {
    if (total === 0) {
      alert("没有可导出的日志");
      return;
    }

    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });

      const res = await fetch(`/api/system-logs/export?${params}`);

      if (!res.ok) {
        throw new Error("导出失败");
      }

      // 下载文件
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || `系统日志_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert("导出成功！");
    } catch (error) {
      console.error("导出日志失败:", error);
      alert("导出日志失败");
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatAction = (action: string) => {
    const option = actionOptions.find((opt) => opt.value === action);
    return option?.label || action;
  };

  const formatResource = (resource: string | null) => {
    if (!resource) return "-";
    const option = resourceOptions.find((opt) => opt.value === resource);
    return option?.label || resource;
  };

  const formatStatus = (status: string) => {
    return status === "success" ? "成功" : status === "failed" ? "失败" : status;
  };

  // 获取操作中文名称
  const getActionLabel = (action: string) => {
    const labelMap: Record<string, string> = {
      login: "登录",
      logout: "登出",
      create: "创建",
      update: "更新",
      delete: "删除",
      approve: "审核通过",
      reject: "审核拒绝",
      reset_password: "重置密码",
      change_password: "修改密码",
      import: "导入",
      export: "导出",
    };
    return labelMap[action] || action;
  };

  // 获取资源中文名称
  const getResourceLabel = (resource: string | null) => {
    if (!resource) return "-";
    const labelMap: Record<string, string> = {
      user: "用户",
      project: "项目",
      task: "任务",
      customer: "客户",
      contract: "合同",
      order: "订单",
      product: "产品",
      message: "消息",
      system: "系统",
    };
    return labelMap[resource] || resource;
  };

  const columns: Column<SystemLog>[] = [
    {
      key: "action",
      title: "操作",
      width: 120,
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {getActionLabel(value)}
        </span>
      ),
    },
    {
      key: "resource",
      title: "资源",
      width: 100,
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getResourceLabel(value)}
        </span>
      ),
    },
    {
      key: "user",
      title: "操作人",
      width: 150,
      sortable: false,
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.fullName || row.username || "-"}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.username ? `@${row.username}` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "details",
      title: "详情",
      width: 250,
      sortable: false,
      render: (value, row) => {
        let detailText = translateDetail(value);
        if (row.resourceId) {
          detailText = detailText !== "-" ? `${detailText} (ID: ${row.resourceId})` : row.resourceId || "-";
        }
        return (
          <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {detailText}
          </div>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            value === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : value === "failed"
              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
          }`}
        >
          {formatStatus(value)}
        </span>
      ),
    },
    {
      key: "ipAddress",
      title: "IP地址",
      width: 140,
      sortable: false,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "操作时间",
      width: 180,
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 100,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => handleDeleteLog(row.id)}
            className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            系统日志
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            查看和管理系统操作日志
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportLogs}
            disabled={isExporting || total === 0}
            className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-500 dark:hover:bg-green-600"
          >
            {isExporting ? "导出中..." : "导出Excel"}
          </button>
          <button
            onClick={() => handleDeleteOldLogs(30)}
            className="rounded-md bg-yellow-600 px-4 py-2 text-white transition-colors hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
          >
            删除30天前日志
          </button>
          <button
            onClick={() => handleDeleteOldLogs(90)}
            className="rounded-md bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
          >
            删除90天前日志
          </button>
          <button
            onClick={handleDeleteAllLogs}
            className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            清空所有日志
          </button>
        </div>
      </div>

      {/* 过滤条件 */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              操作类型
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              资源类型
            </label>
            <select
              value={filters.resource}
              onChange={(e) =>
                setFilters({ ...filters, resource: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {resourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              状态
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              搜索
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              placeholder="用户名、全名、资源ID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            暂无日志
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            还没有系统操作日志
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <ResizableTable
              columns={columns}
              data={logs}
              storageKey="system-logs"
            />
          </div>

          {/* 分页 */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="10">10条/页</option>
                <option value="20">20条/页</option>
                <option value="50">50条/页</option>
                <option value="100">100条/页</option>
              </select>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-gray-700 disabled:opacity-50 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                上一页
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-gray-700 disabled:opacity-50 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
