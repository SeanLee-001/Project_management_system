"use client";

import { useEffect, useRef, useState } from "react";

interface WatermarkImageProps {
  src: string;
  alt?: string;
  className?: string;
  companyName?: string;
  style?: React.CSSProperties;
}

/**
 * 带水印的图片组件
 * 水印呈45度斜放，白色半透明字体
 */
export default function WatermarkImage({
  src,
  alt = "",
  className = "",
  companyName = "",
  style = {},
}: WatermarkImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 预加载图片
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
  }, [src]);

  if (!src) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block overflow-hidden ${className}`}
      style={style}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain"
        loading="lazy"
      />
      {/* 水印层 - 仅保留水印文字，无斜线装饰 */}
      {loaded && companyName && (
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {/* 水印文字 - 45度斜放 */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: "rotate(-45deg)",
              transformOrigin: "center center",
            }}
          >
            <span
              className="text-white font-bold whitespace-nowrap"
              style={{
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                fontSize: "clamp(12px, 3vw, 24px)",
                opacity: 0.5,
              }}
            >
              {companyName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 添加水印到图片（使用Canvas）
 * 返回水印后的图片DataURL
 */
export async function addWatermarkToImage(
  imageUrl: string,
  companyName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("无法获取Canvas上下文"));
        return;
      }

      // 设置画布大小为图片大小
      canvas.width = img.width;
      canvas.height = img.height;

      // 绘制原图
      ctx.drawImage(img, 0, 0);

      // 设置水印样式
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((-45 * Math.PI) / 180); // 45度

      // 水印字体大小（根据图片大小调整）
      const fontSize = Math.max(canvas.width, canvas.height) / 15;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // 绘制水印文字
      ctx.fillText(companyName, 0, 0);

      ctx.restore();

      // 返回水印图片
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      reject(new Error("图片加载失败"));
    };

    img.src = imageUrl;
  });
}
