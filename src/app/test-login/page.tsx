"use client";

import { useState } from "react";

export default function TestLoginPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" }),
      });
      const data = await res.json();
      setResult({ status: res.status, data, success: data.success });
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const clearLocalStorage = () => {
    localStorage.clear();
    setResult({ message: "LocalStorage 已清除，请刷新页面后重新登录" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">登录问题诊断工具</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">测试步骤</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>点击下方"测试登录API"按钮</li>
            <li>查看返回结果是否成功</li>
            <li>如果成功，点击"清除LocalStorage"按钮</li>
            <li>然后返回正常登录页面重新登录</li>
          </ol>
        </div>

        <div className="space-y-4">
          <button
            onClick={testLogin}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "测试中..." : "测试登录API"}
          </button>

          <button
            onClick={clearLocalStorage}
            className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 ml-4"
          >
            清除 LocalStorage
          </button>
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">测试结果</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">手动登录测试</h2>
          <div className="space-y-2 text-sm">
            <p><strong>API URL:</strong> /api/auth</p>
            <p><strong>方法:</strong> POST</p>
            <p><strong>Content-Type:</strong> application/json</p>
            <p><strong>请求体:</strong></p>
            <pre className="bg-gray-100 p-4 rounded">
{`{
  "username": "admin",
  "password": "admin123"
}`}
            </pre>
          </div>
        </div>

        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">常见问题</h2>
          <ul className="list-disc list-inside space-y-2 text-red-700">
            <li>如果API测试成功但登录失败，可能是浏览器缓存问题</li>
            <li>请检查浏览器控制台是否有JavaScript错误</li>
            <li>尝试使用无痕/隐私模式重新登录</li>
            <li>确认输入的用户名和密码正确（区分大小写）</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
