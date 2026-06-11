"use client";

import { useState, useRef, useEffect } from "react";
import { useAlertDialog, default as AlertDialog } from "./AlertDialog";

interface IconUploadProps {
  currentIconUrl?: string;
  onIconChange: (url: string | null) => void;
  label?: string;
  size?: "sm" | "md" | "lg";
  uploadMode?: "local" | "s3"; // local: 本地上传，s3: 对象存储
}

export default function IconUpload({
  currentIconUrl,
  onIconChange,
  label = "项目图标",
  size = "md",
  uploadMode = "local", // 默认使用本地上传
}: IconUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentIconUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { alert, showAlert, closeAlert, styleId } = useAlertDialog();

  // 当 currentIconUrl 从外部更新时，同步预览
  useEffect(() => {
    setPreviewUrl(currentIconUrl || "");
  }, [currentIconUrl]);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleFileSelect = async (file: File) => {
    // 验证文件类型
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      showAlert("只支持上传 JPEG、PNG、GIF、WebP 格式的图片", "warning");
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      showAlert("图片大小不能超过 5MB", "warning");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 根据模式选择上传 API
      const uploadApi = uploadMode === "local" ? "/api/upload-local" : "/api/upload";

      const res = await fetch(uploadApi, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        // 使用上传返回的 URL
        const fileUrl = json.data.url || json.data.proxyUrl;
        setPreviewUrl(fileUrl);
        onIconChange(fileUrl);
      } else {
        showAlert(json.error || "上传失败", "error");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      showAlert("上传失败，请重试", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreviewUrl("");
    onIconChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            ${sizeClasses[size]}
            flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed
            ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"}
            dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500
            relative overflow-hidden transition-colors
          `}
        >
          {isUploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span className="text-sm text-gray-600 dark:text-gray-300">上传中...</span>
              </div>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="图标预览"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center p-2 text-center">
              <svg
                className="mb-1 h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                点击或拖拽
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                上传图片
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            支持 JPEG、PNG、GIF、WebP
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            最大 5MB
          </p>
          {previewUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              删除图标
            </button>
          )}
        </div>
      </div>
      {alert && (
        <AlertDialog
          message={alert.message}
          type={alert.type}
          styleId={styleId}
          onClose={closeAlert}
        />
      )}
    </div>
  );
}
