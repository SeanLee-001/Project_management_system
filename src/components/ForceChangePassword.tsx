"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForceChangePassword() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 从 localStorage 获取当前用户信息
  const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证表单
    if (!formData.newPassword || !formData.confirmPassword) {
      setError("请填写所有必填字段");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("密码长度至少为6位");
      return;
    }

    if (formData.newPassword === "admin123") {
      setError("新密码不能与默认密码相同");
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setError("用户信息丢失，请重新登录");
      router.push("/login");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/force-change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 更新 localStorage 中的用户信息
        localStorage.setItem("user", JSON.stringify(data.data.user));

        alert("密码修改成功！欢迎使用系统");
        router.push("/");
      } else {
        setError(data.error || "修改密码失败，请稍后重试");
      }
    } catch (err) {
      console.error("Force change password error:", err);
      setError("修改密码失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">首次登录</h1>
            <p className="text-gray-600">为了安全起见，请修改您的默认密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                新密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder="请输入新密码（至少6位）"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                确认新密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                placeholder="请再次输入新密码"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "修改中..." : "修改密码"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full text-gray-600 hover:text-gray-700 transition"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
