/**
 * API Client 辅助函数
 * 统一处理API请求，确保携带认证信息（Cookie）
 */

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 确保携带Cookie
  const fetchOptions: RequestInit = {
    ...options,
    credentials: "include" as RequestCredentials,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
    },
  };

  // 如果有body且是FormData，不设置Content-Type（让浏览器自动设置）
  if (options.body instanceof FormData) {
    delete (fetchOptions.headers as Record<string, string>)["Content-Type"];
  }

  return fetch(url, fetchOptions);
}

/**
 * GET请求
 */
export async function apiGet(url: string): Promise<Response> {
  return apiRequest(url, { method: "GET" });
}

/**
 * POST请求
 */
export async function apiPost(url: string, data?: any): Promise<Response> {
  return apiRequest(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * POST请求（FormData）
 */
export async function apiPostFormData(url: string, formData: FormData): Promise<Response> {
  return apiRequest(url, {
    method: "POST",
    body: formData,
  });
}

/**
 * PUT请求
 */
export async function apiPut(url: string, data?: any): Promise<Response> {
  return apiRequest(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE请求
 */
export async function apiDelete(url: string): Promise<Response> {
  return apiRequest(url, { method: "DELETE" });
}
