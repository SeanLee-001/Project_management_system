"use client";

import { useState, useEffect } from "react";

interface IntegrationConfig {
  id: string;
  name: string;
  type: "api" | "webhook" | "database" | "custom";
  description?: string;
  endpoint?: string;
  apiKey?: string;
  secret?: string;
  enabled: boolean;
  createdAt: string;
  lastUsed?: string;
  callCount: number;
}

export default function IntegrationManagement() {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "api_keys" | "webhooks" | "logs">("list");

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    type: "api" as "api" | "webhook" | "database" | "custom",
    description: "",
    endpoint: "",
    apiKey: "",
    secret: "",
    enabled: true,
  });

  // 测试请求状态
  const [testRequest, setTestRequest] = useState({
    method: "GET" as "GET" | "POST" | "PUT" | "DELETE",
    url: "",
    headers: "",
    body: "",
  });
  const [testResponse, setTestResponse] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // API密钥管理状态
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; key: string; createdAt: string; expiresAt?: string }>>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Webhook配置状态
  const [webhooks, setWebhooks] = useState<Array<{ id: string; name: string; url: string; events: string[]; enabled: boolean }>>([]);

  // 日志状态
  const [logs, setLogs] = useState<Array<{ id: string; timestamp: string; endpoint: string; method: string; status: number; duration: number; responseTime: string }>>([]);

  useEffect(() => {
    fetchIntegrations();
    fetchApiKeys();
    fetchWebhooks();
    fetchLogs();
  }, []);

  const fetchIntegrations = async () => {
    try {
      // 模拟API调用
      const mockData: IntegrationConfig[] = [
        {
          id: "1",
          name: "ERP系统对接",
          type: "api",
          description: "与ERP系统进行数据同步",
          endpoint: "https://erp.example.com/api/v1",
          apiKey: "sk-xxxxxxxxxxxx",
          enabled: true,
          createdAt: "2024-01-15T10:00:00Z",
          lastUsed: "2024-01-20T15:30:00Z",
          callCount: 1523,
        },
        {
          id: "2",
          name: "客户CRM集成",
          type: "api",
          description: "同步客户数据到CRM系统",
          endpoint: "https://crm.example.com/api",
          apiKey: "sk-yyyyyyyyyyyy",
          enabled: true,
          createdAt: "2024-01-10T08:00:00Z",
          lastUsed: "2024-01-19T09:45:00Z",
          callCount: 856,
        },
        {
          id: "3",
          name: "订单Webhook",
          type: "webhook",
          description: "订单创建时通知外部系统",
          endpoint: "https://webhook.example.com/order",
          enabled: false,
          createdAt: "2024-01-05T12:00:00Z",
          callCount: 234,
        },
      ];
      setIntegrations(mockData);
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApiKeys = async () => {
    // 模拟数据
    setApiKeys([
      { id: "1", name: "生产环境API密钥", key: "prod_xxxxxxxxxxxxxxxx", createdAt: "2024-01-01T00:00:00Z", expiresAt: "2025-01-01T00:00:00Z" },
      { id: "2", name: "测试环境API密钥", key: "test_yyyyyyyyyyyyyyyy", createdAt: "2024-01-15T00:00:00Z" },
    ]);
  };

  const fetchWebhooks = async () => {
    // 模拟数据
    setWebhooks([
      { id: "1", name: "订单创建通知", url: "https://webhook.example.com/order/created", events: ["order.created"], enabled: true },
      { id: "2", name: "项目状态更新", url: "https://webhook.example.com/project/updated", events: ["project.updated", "project.completed"], enabled: true },
      { id: "3", name: "任务分配通知", url: "https://webhook.example.com/task/assigned", events: ["task.assigned"], enabled: false },
    ]);
  };

  const fetchLogs = async () => {
    // 模拟数据
    const now = new Date();
    setLogs([
      {
        id: "1",
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        endpoint: "/api/erp/sync",
        method: "POST",
        status: 200,
        duration: 234,
        responseTime: "5分钟前",
      },
      {
        id: "2",
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        endpoint: "/api/crm/customers",
        method: "GET",
        status: 200,
        duration: 156,
        responseTime: "15分钟前",
      },
      {
        id: "3",
        timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        endpoint: "/api/webhook/order",
        method: "POST",
        status: 500,
        duration: 89,
        responseTime: "30分钟前",
      },
    ]);
  };

  const handleCreateIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    const newIntegration: IntegrationConfig = {
      id: Date.now().toString(),
      ...formData,
      createdAt: new Date().toISOString(),
      callCount: 0,
    };
    setIntegrations([...integrations, newIntegration]);
    setShowModal(false);
    setFormData({
      name: "",
      type: "api",
      description: "",
      endpoint: "",
      apiKey: "",
      secret: "",
      enabled: true,
    });
    alert("集成配置创建成功！");
  };

  const handleToggleIntegration = (id: string) => {
    setIntegrations(integrations.map(int =>
      int.id === id ? { ...int, enabled: !int.enabled } : int
    ));
  };

  const handleDeleteIntegration = (id: string) => {
    if (confirm("确定要删除这个集成配置吗？")) {
      setIntegrations(integrations.filter(int => int.id !== id));
    }
  };

  const handleTestApiCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResponse("");

    // 模拟API调用
    setTimeout(() => {
      const mockResponse = {
        status: 200,
        message: "API调用成功",
        data: {
          timestamp: new Date().toISOString(),
          endpoint: testRequest.url,
          method: testRequest.method,
        },
      };
      setTestResponse(JSON.stringify(mockResponse, null, 2));
      setTestLoading(false);
    }, 1000);
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const newKey = {
      id: Date.now().toString(),
      name: formData.name,
      key: `sk_${Math.random().toString(36).substring(2, 34)}`,
      createdAt: new Date().toISOString(),
    };
    setApiKeys([...apiKeys, newKey]);
    setShowApiKeyModal(false);
    setFormData({ ...formData, name: "" });
    alert("API密钥创建成功！");
  };

  const handleToggleWebhook = (id: string) => {
    setWebhooks(webhooks.map(wh =>
      wh.id === id ? { ...wh, enabled: !wh.enabled } : wh
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          系统对接管理
        </h2>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-8">
          <button
            onClick={() => setActiveTab("list")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "list"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            集成列表
          </button>
          <button
            onClick={() => setActiveTab("api_keys")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "api_keys"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            API密钥
          </button>
          <button
            onClick={() => setActiveTab("webhooks")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "webhooks"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            Webhook配置
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "logs"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            调用日志
          </button>
        </nav>
      </div>

      {activeTab === "list" && (
        <div className="space-y-6">
          {/* 操作栏 */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
            >
              新建集成
            </button>
            <button
              onClick={() => setShowTestModal(true)}
              className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-sm"
            >
              测试接口
            </button>
          </div>

          {/* 集成列表 */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">序号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    集成名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    端点地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    调用次数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    最后使用
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {integrations.map((integration, idx) => (
                  <tr key={integration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {integration.name}
                        </div>
                        {integration.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {integration.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        integration.type === "api" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        integration.type === "webhook" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        integration.type === "database" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {integration.type === "api" ? "API" :
                         integration.type === "webhook" ? "Webhook" :
                         integration.type === "database" ? "数据库" : "自定义"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {integration.endpoint || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleIntegration(integration.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          integration.enabled
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {integration.enabled ? "已启用" : "已禁用"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {integration.callCount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {integration.lastUsed ? new Date(integration.lastUsed).toLocaleDateString("zh-CN") : "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedIntegration(integration);
                            setShowModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteIntegration(integration.id)}
                          className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "api_keys" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowApiKeyModal(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
            >
              新建API密钥
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">序号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    密钥名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    密钥值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    过期时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {apiKeys.map((apiKey, idx) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {apiKey.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {apiKey.key.substring(0, 20)}...
                        </code>
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                          复制
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(apiKey.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleString("zh-CN") : "永不过期"}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "webhooks" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">序号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Webhook名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    回调URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    事件类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {webhooks.map((webhook, idx) => (
                  <tr key={webhook.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {webhook.name}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {webhook.url}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleWebhook(webhook.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          webhook.enabled
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {webhook.enabled ? "已启用" : "已禁用"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">序号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    端点
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    方法
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    状态码
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    响应时间
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {logs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {log.responseTime}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                      {log.endpoint}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.method === "GET" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        log.method === "POST" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        log.method === "PUT" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" :
                        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.status >= 200 && log.status < 300 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        log.status >= 400 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {log.duration}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 新建/编辑集成对话框 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedIntegration ? "编辑集成" : "新建集成"}
              </h3>
              <form onSubmit={handleCreateIntegration} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    集成名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入集成名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    集成类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="api">API</option>
                    <option value="webhook">Webhook</option>
                    <option value="database">数据库</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="输入描述信息"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    端点地址
                  </label>
                  <input
                    type="url"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/api"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API密钥
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入API密钥"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    密钥Secret
                  </label>
                  <input
                    type="password"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入密钥Secret"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enabled"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <label htmlFor="enabled" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    启用集成
                  </label>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedIntegration(null);
                      setFormData({
                        name: "",
                        type: "api",
                        description: "",
                        endpoint: "",
                        apiKey: "",
                        secret: "",
                        enabled: true,
                      });
                    }}
                    className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 测试接口对话框 */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                测试接口调用
              </h3>
              <form onSubmit={handleTestApiCall} className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      方法
                    </label>
                    <select
                      value={testRequest.method}
                      onChange={(e) => setTestRequest({ ...testRequest, method: e.target.value as any })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL
                    </label>
                    <input
                      type="url"
                      required
                      value={testRequest.url}
                      onChange={(e) => setTestRequest({ ...testRequest, url: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="https://api.example.com/endpoint"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Headers (JSON格式)
                  </label>
                  <textarea
                    value={testRequest.headers}
                    onChange={(e) => setTestRequest({ ...testRequest, headers: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono"
                    rows={3}
                    placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    请求体 (JSON格式)
                  </label>
                  <textarea
                    value={testRequest.body}
                    onChange={(e) => setTestRequest({ ...testRequest, body: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white font-mono"
                    rows={5}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTestModal(false);
                      setTestResponse("");
                    }}
                    className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={testLoading}
                    className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    {testLoading ? "发送中..." : "发送请求"}
                  </button>
                </div>
              </form>

              {testResponse && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    响应结果
                  </h4>
                  <pre className="rounded-md bg-gray-100 dark:bg-gray-900 p-4 text-sm text-gray-900 dark:text-gray-100 overflow-auto max-h-64">
                    {testResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建API密钥对话框 */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                新建API密钥
              </h3>
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    密钥名称
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入密钥名称"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowApiKeyModal(false);
                      setFormData({ ...formData, name: "" });
                    }}
                    className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
