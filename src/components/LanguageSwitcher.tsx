"use client";

import { useState } from "react";

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (newLocale: string) => {
    if (newLocale === currentLocale || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // 设置 cookie
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: newLocale }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // 强制刷新页面以应用新语言
        window.location.reload();
      } else {
        console.error('Failed to change language:', data.error);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleChange('zh')}
        disabled={isLoading}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          currentLocale === 'zh'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
      >
        {isLoading ? '...' : '中文'}
      </button>
      <span className="text-gray-400">|</span>
      <button
        onClick={() => handleChange('en')}
        disabled={isLoading}
        className={`px-2 py-1 text-sm rounded transition-colors ${
          currentLocale === 'en'
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
        }`}
      >
        {isLoading ? '...' : 'EN'}
      </button>
    </div>
  );
}
