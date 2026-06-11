"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';
import { notifyUserChanged } from "./GlobalWatermark";

export default function Login() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [macAddress, setMacAddress] = useState("");
  const [loginMode, setLoginMode] = useState<"password" | "mac">("password");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"normal" | "warning">("normal");
  const [loading, setLoading] = useState(false);
  const [detectingMac, setDetectingMac] = useState(false);
  const [systemVersion, setSystemVersion] = useState("1.0.0");

  // 获取系统版本号
  useEffect(() => {
    const fetchSystemVersion = async () => {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json.success && json.data.systemVersion) {
          setSystemVersion(json.data.systemVersion);
        }
      } catch (error) {
        console.error("Error fetching system version:", error);
      }
    };
    fetchSystemVersion();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("normal");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        // 登录成功，保存用户信息到localStorage
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("token", data.data.token);
        // 重置登录时间
        const now = new Date();
        localStorage.setItem("loginTime", now.toISOString());
        // 通知水印组件用户已切换
        notifyUserChanged();

        // 直接跳转到首页
        router.push("/");
      } else {
        const errorMessage = data.error || "登录失败，请检查用户名和密码";

        // 根据错误信息判断错误类型
        if (
          errorMessage.includes("等待审核") ||
          errorMessage.includes("审核未通过") ||
          errorMessage.includes("Account is deactivated")
        ) {
          // 账号停用或审核相关错误，使用警告样式
          if (errorMessage.includes("Account is deactivated")) {
            setError("该账号被停用不允许登录");
          } else {
            setError(errorMessage);
          }
          setErrorType("warning");
        } else {
          setError(errorMessage);
          setErrorType("normal");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("登录失败，请稍后重试");
      setErrorType("normal");
    } finally {
      setLoading(false);
    }
  };

  const handleMacSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType("normal");

    if (!macAddress.trim()) {
      setError("请输入MAC地址");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/mac-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ macAddress: macAddress.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        // 登录成功，保存用户信息到localStorage
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("token", data.data.token);

        // 保存MAC地址到localStorage
        localStorage.setItem("savedMacAddress", macAddress.trim());
        
        // 重置登录时间
        const now = new Date();
        localStorage.setItem("loginTime", now.toISOString());

        // 通知水印组件用户已切换
        notifyUserChanged();

        // 直接跳转到首页
        router.push("/");
      } else {
        const errorMessage = data.error || "MAC地址登录失败";

        // 根据错误信息判断错误类型
        if (
          errorMessage.includes("等待审核") ||
          errorMessage.includes("审核未通过") ||
          errorMessage.includes("Account is deactivated")
        ) {
          // 账号停用或审核相关错误，使用警告样式
          if (errorMessage.includes("Account is deactivated")) {
            setError("该账号被停用不允许登录");
          } else {
            setError(errorMessage);
          }
          setErrorType("warning");
        } else {
          setError(errorMessage);
          setErrorType("normal");
        }
      }
    } catch (err) {
      console.error("MAC Login error:", err);
      setError("MAC地址登录失败，请稍后重试");
      setErrorType("normal");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectMacAddress = async () => {
    setDetectingMac(true);
    setError("");

    try {
      // 首先检查localStorage中是否有保存的MAC地址
      const savedMac = localStorage.getItem("savedMacAddress");
      if (savedMac) {
        setMacAddress(savedMac);
        setError("已从本地缓存加载MAC地址");
        setDetectingMac(false);
        return;
      }

      // 尝试从API获取MAC地址
      const res = await fetch("/api/auth/mac-address");
      const data = await res.json();

      if (data.success && data.data.macAddress) {
        setMacAddress(data.data.macAddress);
        setError("已自动获取MAC地址");
      } else {
        setError("无法自动获取MAC地址，请手动输入。由于浏览器安全限制，Web应用无法直接获取客户端MAC地址。");
      }
    } catch (err) {
      console.error("Error detecting MAC address:", err);
      setError("自动检测失败，请手动输入。如需MAC地址绑定，请联系管理员。");
    } finally {
      setDetectingMac(false);
    }
  };

  // 切换到MAC地址登录模式时，自动尝试获取MAC地址
  useEffect(() => {
    if (loginMode === "mac") {
      setDetectingMac(true);
      setError("");

      (async () => {
        try {
          // 首先检查localStorage中是否有保存的MAC地址
          const savedMac = localStorage.getItem("savedMacAddress");
          if (savedMac) {
            setMacAddress(savedMac);
            setError("已从本地缓存加载MAC地址");
            return;
          }

          // 尝试从API获取MAC地址
          const res = await fetch("/api/auth/mac-address");
          const data = await res.json();

          if (data.success && data.data.macAddress) {
            setMacAddress(data.data.macAddress);
            setError("已自动获取MAC地址");
          } else {
            setError("无法自动获取MAC地址，请手动输入。由于浏览器安全限制，Web应用无法直接获取客户端MAC地址。");
          }
        } catch (err) {
          console.error("Error detecting MAC address:", err);
          setError("自动检测失败，请手动输入。如需MAC地址绑定，请联系管理员。");
        } finally {
          setDetectingMac(false);
        }
      })();
    }
  }, [loginMode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 sm:mb-4">
              <LanguageSwitcher currentLocale={locale} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">{t('login.title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('login.login')}</p>
            <div className="mt-2 text-xs sm:text-sm text-gray-400">
              {t('setting.systemName') === 'System Name' ? 'System Version' : '系统版本号'}: {systemVersion}
            </div>
          </div>

          {/* Login Mode Toggle */}
          <div className="flex mb-4 sm:mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError("");
              }}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition ${
                loginMode === "password"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {locale === 'zh' ? '用户名登录' : 'Username Login'}
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("mac");
                setError("");
              }}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition ${
                loginMode === "mac"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {locale === 'zh' ? 'MAC地址登录' : 'MAC Address Login'}
            </button>
          </div>

          {loginMode === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-6" autoComplete="off">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {locale === 'zh' ? '用户名/工号' : 'Username/Employee ID'}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder={locale === 'zh' ? '请输入用户名或工号' : 'Enter username or employee ID'}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  placeholder={locale === 'zh' ? '请输入密码' : 'Enter password'}
                />
              </div>

              {error && (
                <div
                  className={`p-3 border rounded-lg ${
                    errorType === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {errorType === "warning" ? (
                      <svg
                        className="w-5 h-5 mt-0.5 text-yellow-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    <p
                      className={`text-sm ${
                        errorType === "warning"
                          ? "text-yellow-700"
                          : "text-red-600"
                      }`}
                    >
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-sm text-red-600 hover:text-red-700 transition"
                >
                  {t('login.forgotPassword')}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (locale === 'zh' ? '登录中...' : 'Logging in...') : t('login.login')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMacSubmit} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="macAddress"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {locale === 'zh' ? 'MAC地址' : 'MAC Address'}
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectMacAddress}
                    disabled={detectingMac}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {detectingMac ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {locale === 'zh' ? '检测中...' : 'Detecting...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {locale === 'zh' ? '自动检测' : 'Auto Detect'}
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="macAddress"
                  name="macAddress"
                  type="text"
                  required
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition font-mono"
                  placeholder="00:11:22:33:44:55"
                  maxLength={17}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {locale === 'zh' ? '格式：XX:XX:XX:XX:XX:XX（使用冒号或连字符分隔）' : 'Format: XX:XX:XX:XX:XX:XX (separated by colon or hyphen)'}
                </p>
              </div>

              {error && (
                <div
                  className={`p-3 border rounded-lg ${
                    errorType === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {errorType === "warning" ? (
                      <svg
                        className="w-5 h-5 mt-0.5 text-yellow-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    <p
                      className={`text-sm ${
                        errorType === "warning"
                          ? "text-yellow-700"
                          : "text-red-600"
                      }`}
                    >
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">{locale === 'zh' ? '说明：' : 'Instructions:'}</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{locale === 'zh' ? 'MAC地址绑定后可免密码登录' : 'MAC address binding allows password-free login'}</li>
                  <li>{locale === 'zh' ? '需要由系统管理员预先绑定' : 'Requires pre-binding by system administrator'}</li>
                  <li>{locale === 'zh' ? '如需绑定MAC地址，请联系管理员' : 'Contact administrator to bind MAC address'}</li>
                  <li>{locale === 'zh' ? '由于浏览器安全限制，自动检测功能可能无法获取真实MAC地址' : 'Due to browser security restrictions, auto-detection may not get real MAC address'}</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || !macAddress.trim()}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (locale === 'zh' ? '登录中...' : 'Logging in...') : (locale === 'zh' ? '使用MAC地址登录' : 'Login with MAC Address')}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {locale === 'zh' ? '还没有账户？' : "Don't have an account?"}{" "}
              <button
                onClick={() => router.push("/register")}
                className="text-red-600 hover:text-red-700 font-medium transition"
              >
                {t('register.register')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
