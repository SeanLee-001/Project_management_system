import { cookies } from 'next/headers';

/**
 * 从请求 cookie 中获取认证 token
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value;
}

/**
 * 解析 multipart/form-data 请求体
 * 适用于文件上传和 CSV/Excel 导入
 */
export async function parseFormData(request: Request): Promise<{
  file?: File;
  fields: Record<string, string>;
}> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  let file: File | undefined;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      file = value;
    } else {
      fields[key] = String(value);
    }
  }

  return { file, fields };
}

/**
 * 创建标准化 API 响应
 */
export function apiResponse(success: boolean, data?: unknown, error?: string) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 统一错误处理装饰器
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  moduleName: string
): Promise<Response> {
  try {
    const result = await handler();
    return Response.json(apiResponse(true, result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error(`[${moduleName}]`, message);
    return Response.json(
      apiResponse(false, undefined, message),
      { status: 500 }
    );
  }
}

/**
 * 防抖函数 (用于前端事件优化)
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 安全地解析 JSON，失败返回默认值
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
