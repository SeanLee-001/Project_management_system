"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPassword() {
  const router = useRouter();

  // 验证步骤的状态
  const [step, setStep] = useState<"verify" | "reset">("verify");
  const [verifyData, setVerifyData] = useState({
    username: "",
    email: "",
  });
  const [resetData, setResetData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [verifiedUserId, setVerifiedUserId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerifyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerifyData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
  };

  // 验证用户名和邮箱
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证表单
    if (!verifyData.username || !verifyData.email) {
      setError("请填写用户名和邮箱");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: verifyData.username,
          email: verifyData.email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 验证成功，保存用户ID并进入密码修改步骤
        setVerifiedUserId(data.data.id);
        setStep("reset");
        setError("");
      } else {
        setError(data.error || "验证失败，请检查用户名和邮箱");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setError("验证失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证表单
    if (!resetData.newPassword || !resetData.confirmPassword) {
      setError("请填写新密码和确认密码");
      return;
    }

    if (resetData.newPassword.length < 6) {
      setError("新密码至少需要6个字符");
      return;
    }

    if (resetData.newPassword !== resetData.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: verifiedUserId,
          newPassword: resetData.newPassword,
          confirmPassword: resetData.confirmPassword,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("密码重置成功！请使用新密码登录。");
        router.push("/login");
      } else {
        setError(data.error || "密码重置失败，请稍后重试");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("密码重置失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-600 mb-2">忘记密码</h1>
            <p className="text-gray-600">
              {step === "verify" ? "验证您的身份" : "设置新密码"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 步骤1：验证用户名和邮箱 */}
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  用户名 <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={verifyData.username}
                  onChange={handleVerifyChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder="请输入用户名"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  邮箱 <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={verifyData.email}
                  onChange={handleVerifyChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder="请输入注册邮箱"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "验证中..." : "验证身份"}
              </button>
            </form>
          )}

          {/* 步骤2：设置新密码 */}
          {step === "reset" && (
            <form onSubmit={handleReset} className="space-y-6">
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
                  value={resetData.newPassword}
                  onChange={handleResetChange}
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
                  value={resetData.confirmPassword}
                  onChange={handleResetChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder="请再次输入新密码"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("verify")}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition"
                >
                  返回
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "重置中..." : "确认重置"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              记起密码了？{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-red-600 hover:text-red-700 font-medium transition"
              >
                返回登录
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
