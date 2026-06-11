"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SoftwareUploadProps {
  userId: string;
}

export default function SoftwareUpload({ userId }: SoftwareUploadProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // 验证文件类型
      const fileName = selectedFile.name.toLowerCase();
      if (!fileName.endsWith(".exe") && !fileName.endsWith(".dmg") && !fileName.endsWith(".appimage")) {
        alert("请选择 .exe、.dmg 或 .AppImage 文件");
        return;
      }

      // 验证文件大小（500MB）
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        alert("文件大小不能超过 500MB");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert("请选择要上传的文件");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("senderId", userId);
      if (version) {
        formData.append("version", version);
      }
      if (releaseNotes) {
        formData.append("releaseNotes", releaseNotes);
      }

      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const res = await fetch("/api/software-releases/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const json = await res.json();

      if (json.success) {
        alert(`软件发布包上传成功！\n\n文件名：${json.fileName}\n下载链接已发送到消息中心`);
        // 重置表单
        setFile(null);
        setVersion("");
        setReleaseNotes("");
        setUploadProgress(0);
      } else {
        alert("上传失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        软件发布上传
      </h2>

      <form onSubmit={handleUpload} className="space-y-6">
        {/* 文件选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择文件 <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>选择文件</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".exe,.dmg,.AppImage"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">或拖拽文件到这里</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                支持 .exe、.dmg、.AppImage 文件，最大 500MB
              </p>
              {file && (
                <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                  已选择: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 版本号 */}
        <div>
          <label
            htmlFor="version"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            版本号
          </label>
          <input
            type="text"
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="例如: 1.0.0"
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          />
        </div>

        {/* 发布说明 */}
        <div>
          <label
            htmlFor="releaseNotes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            发布说明
          </label>
          <textarea
            id="releaseNotes"
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            rows={4}
            placeholder="输入本次版本的更新内容、修复的问题等..."
            disabled={isUploading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed resize-none"
          />
        </div>

        {/* 上传进度 */}
        {isUploading && (
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 dark:text-gray-300">上传进度</span>
              <span className="text-gray-700 dark:text-gray-300">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isUploading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isUploading || !file}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                上传中...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                上传发布包
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
