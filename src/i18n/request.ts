import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // 从 cookie 获取语言设置，默认中文
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'zh';
  
  // 动态导入翻译文件 - 使用绝对路径
  const messages = locale === 'zh' 
    ? (await import('../locales/zh.json')).default
    : (await import('../locales/en.json')).default;
  
  return {
    locale,
    messages
  };
});
