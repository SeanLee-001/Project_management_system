"use client";

import { useState, useEffect } from "react";

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionName: string;
  description: string;
}

interface ConfigFile {
  name: string;
  content: string;
  createdAt: string;
}

export default function DatabaseConfigManagement() {
  const [config, setConfig] = useState<DatabaseConfig>({
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    ssl: false,
    connectionName: "remote_database",
    description: "",
  });

  const [savedConfigs, setSavedConfigs] = useState<ConfigFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeConfigName, setActiveConfigName] = useState<string | null>(null);

  // 获取已保存的配置文件列表
  useEffect(() => {
    fetchSavedConfigs();
  }, []);

  const fetchSavedConfigs = async () => {
    try {
      const res = await fetch("/api/database-config");
      const json = await res.json();
      if (json.success) {
        setSavedConfigs(json.data || []);
      }
    } catch (error) {
      console.error("获取配置列表失败:", error);
    }
  };

  // 测试数据库连接
  const handleTestConnection = async () => {
    if (!config.host || !config.database || !config.username) {
      setTestResult({ success: false, message: "请填写完整的连接信息" });
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/database-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const json = await res.json();
      setTestResult({
        success: json.success,
        message: json.message || (json.success ? "连接成功！" : "连接失败"),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: "测试连接失败: " + String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置并生成配置文件
  const handleSaveConfig = async () => {
    if (!config.host || !config.database || !config.username || !config.connectionName) {
      alert("请填写必要的信息（主机、数据库、用户名、配置名称）");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/database-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const json = await res.json();

      if (json.success) {
        alert("配置保存成功！配置文件已生成。");
        fetchSavedConfigs();
        setActiveConfigName(config.connectionName);
      } else {
        alert("保存失败: " + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      alert("保存配置失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 加载已保存的配置
  const handleLoadConfig = async (configName: string) => {
    try {
      const res = await fetch(`/api/database-config/${encodeURIComponent(configName)}`);
      const json = await res.json();

      if (json.success && json.data) {
        setConfig({
          ...json.data.config,
          password: "", // 密码不回显
        });
        setActiveConfigName(configName);
        setTestResult(null);
      }
    } catch (error) {
      console.error("加载配置失败:", error);
      alert("加载配置失败");
    }
  };

  // 删除配置文件
  const handleDeleteConfig = async (configName: string) => {
    if (!confirm(`确定要删除配置 "${configName}" 吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/database-config/${encodeURIComponent(configName)}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (json.success) {
        alert("配置已删除");
        fetchSavedConfigs();
        if (activeConfigName === configName) {
          setActiveConfigName(null);
        }
      } else {
        alert("删除失败: " + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("删除配置失败:", error);
      alert("删除配置失败");
    }
  };

  // 下载配置文件
  const handleDownloadConfig = async (configName: string) => {
    try {
      // 获取认证token
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/database-config/${encodeURIComponent(configName)}/download`, {
        headers,
      });
      
      if (res.status === 401) {
        alert("登录已过期，请重新登录");
        return;
      }
      
      if (!res.ok) {
        alert("下载失败");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-config-${configName}.env`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("下载配置失败:", error);
      alert("下载配置失败");
    }
  };

  // 应用配置（切换数据库连接）
  const handleApplyConfig = async (configName: string) => {
    if (!confirm(`确定要应用配置 "${configName}" 吗？\n\n应用后系统将使用此数据库连接，请确保配置正确。`)) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/database-config/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configName }),
      });

      const json = await res.json();

      if (json.success) {
        alert("配置已应用！\n\n系统将在重启后使用新的数据库连接。");
      } else {
        alert("应用失败: " + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("应用配置失败:", error);
      alert("应用配置失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          远程数据库配置
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          配置远程数据库连接，实现多电脑数据同步
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：配置表单 */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {activeConfigName ? `编辑配置: ${activeConfigName}` : "新建配置"}
            </h3>

            <div className="space-y-4">
              {/* 配置名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  配置名称 *
                </label>
                <input
                  type="text"
                  value={config.connectionName}
                  onChange={(e) => setConfig({ ...config, connectionName: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="例如：remote_database、office_main"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  用于识别不同的数据库配置
                </p>
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="例如：公司主数据库、测试环境数据库"
                />
              </div>

              {/* 主机和端口 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    数据库主机 *
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="例如：192.168.1.100 或 db.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    端口
                  </label>
                  <input
                    type="text"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="5432"
                  />
                </div>
              </div>

              {/* 数据库名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  数据库名称 *
                </label>
                <input
                  type="text"
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="例如：project_management"
                />
              </div>

              {/* 用户名和密码 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    用户名 *
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="数据库用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    密码
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="数据库密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
              </div>

              {/* SSL */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={config.ssl}
                  onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="ssl" className="text-sm text-gray-700 dark:text-gray-300">
                  启用 SSL 连接
                </label>
              </div>

              {/* 测试结果 */}
              {testResult && (
                <div
                  className={`p-4 rounded-md ${
                    testResult.success
                      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{testResult.success ? "✅" : "❌"}</span>
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                >
                  {isLoading ? "测试中..." : "测试连接"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  保存配置
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfig({
                      host: "",
                      port: "5432",
                      database: "",
                      username: "",
                      password: "",
                      ssl: false,
                      connectionName: "",
                      description: "",
                    });
                    setActiveConfigName(null);
                    setTestResult(null);
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  重置
                </button>
              </div>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              使用说明
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>1. 填写远程数据库的连接信息</li>
              <li>2. 点击"测试连接"验证配置是否正确</li>
              <li>3. 测试成功后点击"保存配置"生成配置文件</li>
              <li>4. 在其他电脑上导入相同的配置文件即可同步数据</li>
              <li>5. 点击"应用配置"可以切换当前使用的数据库</li>
            </ul>
          </div>
        </div>

        {/* 右侧：已保存的配置列表 */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              已保存的配置
            </h3>

            {savedConfigs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                暂无已保存的配置
              </p>
            ) : (
              <div className="space-y-4">
                {savedConfigs.map((cfg) => {
                  // 提取配置信息
                  const configLines = cfg.content.split("\n");
                  const getLineValue = (prefix: string) => 
                    configLines.find(l => l.startsWith(prefix))?.replace(prefix, "") || "-";
                  
                  const host = getLineValue("DB_HOST=");
                  const database = getLineValue("DB_NAME=");
                  const username = getLineValue("DB_USER=");
                  const description = getLineValue("DB_DESCRIPTION=");
                  
                  return (
                    <div
                      key={cfg.name}
                      className={`p-4 rounded-lg border ${
                        activeConfigName === cfg.name
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-lg">
                            {cfg.name}
                          </div>
                          {description && description !== "-" && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {description}
                            </div>
                          )}
                        </div>
                        {activeConfigName === cfg.name && (
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-500 text-white">
                            当前编辑
                          </span>
                        )}
                      </div>
                      
                      {/* 配置详情 */}
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">主机:</span> {host}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">数据库:</span> {database}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">用户名:</span> {username}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">创建时间:</span> {new Date(cfg.createdAt).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleLoadConfig(cfg.name)}
                          className="text-xs px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                        >
                          📝 编辑
                        </button>
                        <button
                          onClick={() => handleDownloadConfig(cfg.name)}
                          className="text-xs px-3 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 font-medium"
                        >
                          📥 下载配置
                        </button>
                        <button
                          onClick={() => handleApplyConfig(cfg.name)}
                          className="text-xs px-3 py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 font-medium"
                        >
                          🔄 应用
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(cfg.name)}
                          className="text-xs px-3 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 font-medium"
                        >
                          🗑️ 删除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 导入配置 */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                  导入配置文件
                </span>
                <input
                  type="file"
                  accept=".env,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const text = await file.text();
                      const res = await fetch("/api/database-config/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          filename: file.name,
                          content: text,
                        }),
                      });

                      const json = await res.json();
                      if (json.success) {
                        alert("导入成功！");
                        fetchSavedConfigs();
                      } else {
                        alert("导入失败: " + (json.error || "未知错误"));
                      }
                    } catch (error) {
                      console.error("导入失败:", error);
                      alert("导入失败");
                    }
                  }}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                />
              </label>
            </div>
          </div>

          {/* 当前连接状态 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              当前连接
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                已连接
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              当前使用的是系统默认数据库连接
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
