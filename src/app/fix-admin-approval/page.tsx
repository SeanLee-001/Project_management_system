"use client";

import { useState } from "react";

export default function FixAdminApprovalPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFix = async () => {
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const res = await fetch("/api/migrate/fix-admin-approval", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();

      if (json.success) {
        setMessage(`✅ ${json.message}\n\n${JSON.stringify(json.data, null, 2)}`);
        setSuccess(true);
      } else {
        setMessage(`❌ ${json.error}`);
        setSuccess(false);
      }
    } catch (error) {
      setMessage(`❌ 请求失败: ${error instanceof Error ? error.message : "未知错误"}`);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          修复Admin用户审核状态
        </h1>

        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-900">
            功能说明
          </h2>
          <p className="text-sm text-blue-800 mb-2">
            此工具用于修复admin用户的审核状态，将其从"待审核"（pending）更新为"已通过"（approved）。
          </p>
          <p className="text-sm text-blue-800">
            修复后，admin用户即可正常登录系统。
          </p>
        </div>

        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-yellow-900">
            使用场景
          </h2>
          <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
            <li>部署后admin用户无法登录，提示"等待审核"</li>
            <li>admin用户被误设置为"待审核"状态</li>
            <li>需要批量重置admin用户的审核状态</li>
          </ul>
        </div>

        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-900">
            Admin账户信息
          </h2>
          <ul className="text-sm text-gray-800 list-disc list-inside">
            <li>用户名: admin</li>
            <li>默认密码: admin123</li>
            <li>角色: 系统管理员</li>
          </ul>
        </div>

        <button
          onClick={handleFix}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {loading ? "修复中..." : "开始修复"}
        </button>

        {message && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <pre className="text-sm whitespace-pre-wrap">{message}</pre>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p className="mb-2">
            提示：修复完成后，可以使用以下信息登录：
          </p>
          <code className="bg-gray-100 px-2 py-1 rounded block whitespace-pre">
            {`{"username": "admin", "password": "admin123"}`}
          </code>
        </div>
      </div>
    </div>
  );
}
