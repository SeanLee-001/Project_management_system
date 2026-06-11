"use client";

import dynamic from "next/dynamic";

// 动态导入全局水印组件，禁用SSR
const GlobalWatermark = dynamic(() => import("./GlobalWatermark"), {
  ssr: false,
});

/**
 * 水印组件包装器
 * 用于在服务端组件中安全地使用需要客户端渲染的GlobalWatermark组件
 */
export default function WatermarkWrapper() {
  return <GlobalWatermark />;
}
