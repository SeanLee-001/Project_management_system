/**
 * API 工具函数 - 统一处理 fetch 调用
 * 所有 API 调用都应该使用这个函数，确保 credentials 正确设置
 */

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 确保所有请求都包含 credentials
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include",
  };

  // 如果有 body，确保 Content-Type 正确设置
  if (options.body && !options.headers) {
    fetchOptions.headers = {
      "Content-Type": "application/json",
    };
  } else if (options.headers && typeof options.headers === "object") {
    const headers = { ...(options.headers as Record<string, string>) };
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    fetchOptions.headers = headers;
  }

  return fetch(url, fetchOptions);
}
