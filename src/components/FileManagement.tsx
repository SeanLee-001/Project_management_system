"use client";

import React, { useState, useEffect } from "react";
import type { AssetFile } from "@/storage/database/shared/schema";
import { projectManager } from "@/storage/database";

interface FileManagementProps {
  projectId: string | null;
}

export default function FileManagement({ projectId }: FileManagementProps) {
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFile, setEditingFile] = useState<AssetFile | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editForm, setEditForm] = useState({
    fileName: "",
    filePath: "",
    description: "",
  });

  useEffect(() => {
    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  const fetchFiles = async () => {
    if (!projectId) {
      console.warn("No project ID provided, skipping file fetch");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        console.error("Failed to fetch files:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile) {
      alert("请先选择文件");
      return;
    }

    if (!projectId) {
      alert("请先选择项目");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("path", "/");

      const response = await fetch(`/api/projects/${projectId}/files/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        fetchFiles();
        alert("文件上传成功");
      } else {
        alert(`文件上传失败：${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`文件上传失败：${error instanceof Error ? error.message : "网络错误"}`);
    }
  };

  // 处理文件选择
  const handleFileSelect = (file: File | null) => {
    setUploadFile(file);
  };

  // 拖拽相关处理
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      // 检查文件类型
      const validExtensions = [
        ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx",
        ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif",
        ".bmp", ".zip", ".rar", ".7z"
      ];
      const fileName = file.name.toLowerCase();
      const isValid = validExtensions.some(ext => fileName.endsWith(ext));

      if (isValid) {
        setUploadFile(file);
      } else {
        alert("不支持的文件格式");
      }
    }
  };

  const handleDownload = async (file: AssetFile) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files/${file.id}/download`);
      if (response.ok) {
        const data = await response.json();
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = file.fileName;
        link.click();
      } else {
        alert("下载失败");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("下载失败");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("确定要删除这个文件吗？")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchFiles();
        alert("删除成功");
      } else {
        alert("删除失败");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("删除失败");
    }
  };

  const handleMove = async (file: AssetFile) => {
    const newPath = prompt("输入新的文件路径:", file.filePath);
    if (!newPath || newPath === file.filePath) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: newPath }),
      });

      if (response.ok) {
        fetchFiles();
        alert("移动成功");
      } else {
        alert("移动失败");
      }
    } catch (error) {
      console.error("Error moving file:", error);
      alert("移动失败");
    }
  };

  const handleEdit = (file: AssetFile) => {
    setEditingFile(file);
    setEditForm({
      fileName: file.fileName,
      filePath: file.filePath,
      description: file.description || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile || !projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${editingFile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingFile(null);
        fetchFiles();
        alert("修改成功");
      } else {
        alert("修改失败");
      }
    } catch (error) {
      console.error("Error updating file:", error);
      alert("修改失败");
    }
  };

  const formatFileSize = (size: string | null) => {
    if (!size) return "-";
    const bytes = parseInt(size);
    if (isNaN(bytes)) return size;
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    if (kb >= 1) return `${kb.toFixed(2)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="space-y-4">
      {!projectId ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📁</div>
          <p>请先选择一个项目</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">文件管理</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                上传文件
              </button>
              <button
                onClick={fetchFiles}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                刷新
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无文件</div>
          ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  路径
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  上传时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{file.fileName}</div>
                    {file.description && (
                      <div className="text-sm text-gray-500">{file.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{file.fileType || "-"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatFileSize(file.fileSize)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{file.filePath}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(file.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDownload(file)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      下载
                    </button>
                    <button
                      onClick={() => handleMove(file)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      移动
                    </button>
                    <button
                      onClick={() => handleEdit(file)}
                      className="text-yellow-600 hover:text-yellow-900 mr-3"
                    >
                      修改
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {/* 上传文件模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">上传文件</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择或拖拽文件
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    const input = document.getElementById('fileInput') as HTMLInputElement;
                    if (input) {
                      input.click();
                    }
                  }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : uploadFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {uploadFile ? (
                    <div className="space-y-2">
                      <div className="text-4xl">📄</div>
                      <div className="text-sm font-medium text-gray-900">
                        {uploadFile.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(uploadFile.size / 1024).toFixed(2)} KB
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                        }}
                        className="text-red-500 text-sm hover:text-red-700 cursor-pointer"
                      >
                        点击重新选择
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl">📁</div>
                      <div className="text-sm font-medium text-gray-700">
                        点击选择文件或拖拽文件到此处
                      </div>
                      <div className="text-xs text-gray-500">
                        支持格式：PDF、Word、Excel、PPT、TXT、图片（JPG/PNG/GIF/BMP）、压缩包（ZIP/RAR/7Z）
                      </div>
                    </div>
                  )}
                  <input
                    id="fileInput"
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.zip,.rar,.7z"
                    className="hidden"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  上传
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 修改文件模态框 */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">修改文件</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件名
                </label>
                <input
                  type="text"
                  value={editForm.fileName}
                  onChange={(e) => setEditForm({ ...editForm, fileName: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  文件路径
                </label>
                <input
                  type="text"
                  value={editForm.filePath}
                  onChange={(e) => setEditForm({ ...editForm, filePath: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingFile(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
