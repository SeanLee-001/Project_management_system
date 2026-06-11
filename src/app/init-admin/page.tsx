"use client";

import { useState } from "react";

export default function InitAdminPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInit = async () => {
    setLoading(true);
    setMessage("正在初始化...");

    try {
      const res = await fetch("/api/init");
      const json = await res.json();

      if (json.success) {
        setMessage(`✅ ${json.message}\n\n用户名: admin\n密码: admin123`);
      } else {
        setMessage(`❌ ${json.error}`);
      }
    } catch (error) {
      setMessage(`❌ 初始化失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          初始化管理员账户
        </h1>

        <div className="space-y-4">
          <button
            onClick={handleInit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "初始化中..." : "创建管理员账户"}
          </button>

          {message && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                {message}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>默认账户信息：</strong>
            </p>
            <ul className="list-disc list-inside">
              <li>用户名: admin</li>
              <li>密码: admin123</li>
              <li>角色: 系统管理员</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
