/**
 * 图片 URL 处理工具
 */

/**
 * 将图片 URL 转换为代理 URL
 * 如果已经是代理 URL，则直接返回
 * 如果是签名 URL，则提取 key 并转换为代理 URL
 * 如果是其他格式的 URL，则直接返回
 */
export function convertToProxyUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  // 如果已经是代理 URL，直接返回
  if (imageUrl.startsWith("/api/images/")) {
    return imageUrl;
  }

  // 如果是签名 URL（包含 AWS S3 签名特征），提取 key
  // 典型格式: https://.../uploads/timestamp_random.ext?X-Amz-Signature=...
  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    
    // 提取文件 key（去掉开头的 /）
    const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    
    // 如果路径包含 uploads/，则转换为代理 URL
    if (key.startsWith("uploads/")) {
      return `/api/images/${key}`;
    }
    
    // 如果不是 uploads 路径，可能是公共 URL，直接返回
    return imageUrl;
  } catch (error) {
    // 如果解析失败，可能是相对路径或其他格式，直接返回
    console.warn("[convertToProxyUrl] Failed to parse URL:", imageUrl);
    return imageUrl;
  }
}

/**
 * 批量转换图片 URL
 */
export function convertToProxyUrls<T extends Record<string, any>>(
  items: T[],
  imageUrlField: string = "imageUrl"
): T[] {
  return items.map((item) => {
    const imageUrl = item[imageUrlField];
    if (imageUrl) {
      return {
        ...item,
        [imageUrlField]: convertToProxyUrl(imageUrl),
      };
    }
    return item;
  });
}
