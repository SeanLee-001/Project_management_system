// 解析用户代理字符串，提取设备和浏览器信息
export function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();

  // 检测设备类型
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      deviceType = "tablet";
    } else {
      deviceType = "mobile";
    }
  }

  // 检测操作系统
  let os = "Unknown";
  if (/windows nt 10/i.test(ua)) os = "Windows 10";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6\.2/i.test(ua)) os = "Windows 8";
  else if (/windows nt 6\.1/i.test(ua)) os = "Windows 7";
  else if (/windows nt 6\.0/i.test(ua)) os = "Windows Vista";
  else if (/windows nt 5\.1|windows xp/i.test(ua)) os = "Windows XP";
  else if (/mac os x/i.test(ua)) {
    const match = ua.match(/mac os x (\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace("_", ".")}` : "macOS";
  }
  else if (/android/i.test(ua)) {
    const match = ua.match(/android (\d+\.?\d*)/);
    os = match ? `Android ${match[1]}` : "Android";
  }
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+[._]\d+)/);
    os = match ? `iOS ${match[1].replace("_", ".")}` : "iOS";
  }
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/ubuntu/i.test(ua)) os = "Ubuntu";

  // 检测浏览器
  let browser = "Unknown";
  if (/edg/i.test(ua)) {
    const match = ua.match(/edg(?:e|a|ios)?\/(\d+\.?\d*)/);
    browser = match ? `Edge ${match[1]}` : "Edge";
  }
  else if (/opr|opera/i.test(ua)) {
    const match = ua.match(/(?:opr|opera)[\s/](\d+\.?\d*)/);
    browser = match ? `Opera ${match[1]}` : "Opera";
  }
  else if (/chrome|crios/i.test(ua)) {
    const match = ua.match(/(?:chrome|crios)[\s/](\d+\.?\d*)/);
    browser = match ? `Chrome ${match[1]}` : "Chrome";
  }
  else if (/firefox|fxios/i.test(ua)) {
    const match = ua.match(/(?:firefox|fxios)[\s/](\d+\.?\d*)/);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  }
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    const match = ua.match(/version\/(\d+\.?\d*)/);
    browser = match ? `Safari ${match[1]}` : "Safari";
  }
  else if (/msie|trident/i.test(ua)) {
    const match = ua.match(/(?:msie |rv:)(\d+\.?\d*)/);
    browser = match ? `IE ${match[1]}` : "IE";
  }

  return { deviceType, browser, os };
}

// 格式化登录时长
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  }
}
