"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ResizableTable, Column } from "@/components/ResizableTable";
import UserMultiSelect from "@/components/UserMultiSelect";

interface Message {
  id: string;
  type: "personal" | "announcement" | "system_document" | "knowledge_base";
  title: string;
  content: string;
  senderId: string | null;
  receiverId: string | null;
  isRead: boolean;
  readAt: string | null;
  isPinned: boolean;
  documentUrl: string | null;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

interface MessageWithSender extends Message {
  senderName?: string;
  senderFullName?: string;
}

interface User {
  id: string;
  username: string;
  fullName: string | null;
  employeeNumber: string | null;
  email: string;
  phone: string | null;
}

export default function MessageCenter({ userId, userRole: role }: { userId: string, userRole: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateMessage, setShowCreateMessage] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [showAppUpload, setShowAppUpload] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithSender | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [latestAppVersion, setLatestAppVersion] = useState<any>(null);
  const [resolvedApprovalIds, setResolvedApprovalIds] = useState<Set<string>>(new Set());

  const [messageForm, setMessageForm] = useState({
    title: "",
    content: "",
    receiverIds: [] as User[],
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    content: "",
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const [appUploadForm, setAppUploadForm] = useState({
    version: "1.0.0",
    description: "",
    file: null as File | null,
  });

  // 检查当前用户是否是管理员
  const isAdmin = [
    "system_admin",
    "department_manager",
    "project_manager",
  ].includes(role);

  useEffect(() => {
    fetchMessages();
    fetchLatestApp();
    // 打开消息中心时自动标记所有消息为已读
    markAllAsReadOnOpen();
  }, [userId]);

  const fetchLatestApp = async () => {
    try {
      const res = await fetch("/api/mobile-app/list");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        // 获取最新的APP版本
        setLatestAppVersion(json.data[0]);
      }
    } catch (error) {
      console.error("获取APP信息失败:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/user/${userId}`);
      const json = await res.json();
      if (json.success) {
        // 为每条消息添加发送者信息
        const messagesWithSender = await Promise.all(
          json.data.map(async (msg: Message) => {
            if (msg.senderId) {
              try {
                const userRes = await fetch(`/api/users/${msg.senderId}`);
                const userJson = await userRes.json();
                if (userJson.success) {
                  return {
                    ...msg,
                    senderName: userJson.data.username,
                    senderFullName: userJson.data.fullName,
                  };
                }
              } catch (error) {
                console.error("获取发送者信息失败:", error);
              }
            }
            return msg;
          })
        );
        setMessages(messagesWithSender);
        // 检查审批类消息的审批状态（通用审批和项目审批）
        const approvalMessages = messagesWithSender.filter(m =>
          (m.relatedType === "approval" || m.relatedType === "project_approval") && m.relatedId
        );
        if (approvalMessages.length > 0) {
          const statusChecks = await Promise.allSettled(
            approvalMessages.map(async (m) => {
              try {
                const apiPath = m.relatedType === "project_approval"
                  ? `/api/project-approvals/${m.relatedId}`
                  : `/api/approvals/${m.relatedId}`;
                const aRes = await fetch(apiPath);
                const aJson = await aRes.json();
                return { id: m.relatedId!, pending: aJson.success && aJson.data?.status === "pending" };
              } catch { return { id: m.relatedId!, pending: true }; }
            })
          );
          const nonPending = new Set<string>();
          statusChecks.forEach(r => {
            if (r.status === "fulfilled" && !r.value.pending) {
              nonPending.add(r.value.id);
            }
          });
          setResolvedApprovalIds(nonPending);
        }
      }
    } catch (error) {
      console.error("获取消息列表失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsReadOnOpen = async () => {
    try {
      const res = await fetch("/api/messages/mark-all-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        // 静默标记成功，不需要重新获取消息
        // 触发消息已读事件，通知MessageNotification组件刷新未读数量
        window.dispatchEvent(new Event('messages-read'));
      }
    } catch (error) {
      console.error("自动标记所有为已读失败:", error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/read`, {
        method: "PUT",
      });
      if (res.ok) {
        await fetchMessages();
        // 触发消息已读事件，通知MessageNotification组件刷新未读数量
        window.dispatchEvent(new Event('messages-read'));
      }
    } catch (error) {
      console.error("标记为已读失败:", error);
    }
  };

  const handleMessageClick = async (message: MessageWithSender) => {
    // 先标记为已读
    if (!message.isRead) {
      await handleMarkAsRead(message.id);
    }

    // 项目审批消息跳转到项目审批页面（查询 project_approvals 表）
    if (message.relatedType === "project_approval" && message.relatedId) {
      router.push(`/app?tab=approvals&approvalId=${message.relatedId}`);
    } 
    // 通用审批（订单、合同等）跳转到审批管理页面（查询 approval_requests 表）
    else if (message.relatedType === "approval" && message.relatedId) {
      // 使用 URL 参数指定是通用审批
      router.push(`/app?tab=approvals&type=general&approvalId=${message.relatedId}`);
    }
  };

  const handleViewDetail = async (message: MessageWithSender) => {
    // 先标记为已读
    if (!message.isRead) {
      await handleMarkAsRead(message.id);
    }
    // 显示详情对话框
    setSelectedMessage(message);
    setShowMessageDetail(true);
  };

  const handleMarkAllAsRead = async () => {
    if (!confirm("确定要标记所有消息为已读吗？")) return;

    try {
      const res = await fetch("/api/messages/mark-all-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchMessages();
        // 触发消息已读事件，通知MessageNotification组件刷新未读数量
        window.dispatchEvent(new Event('messages-read'));
      }
    } catch (error) {
      console.error("标记所有为已读失败:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("确定要删除此消息吗？")) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMessages();
        // 触发消息已读事件，通知MessageNotification组件刷新未读数量
        window.dispatchEvent(new Event('messages-read'));
      }
    } catch (error) {
      console.error("删除消息失败:", error);
    }
  };

  // 从消息标题或URL提取文件名
  const extractFilenameFromTitle = (title: string, url?: string): string => {
    // 如果有URL，尝试从URL中提取文件名和扩展名
    if (url) {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // 提取文件名部分（最后一个/之后的内容）
        const filename = pathname.split('/').pop() || '';
        // 解码URL编码的文件名
        const decodedFilename = decodeURIComponent(filename);
        // 如果文件名包含有效的扩展名，直接使用
        if (decodedFilename && /\.[a-zA-Z0-9]+$/.test(decodedFilename)) {
          // 提取实际的扩展名
          const extension = decodedFilename.split('.').pop()?.toLowerCase() || '';
          // 使用标题作为文件名，但保留原始扩展名
          return `${title}.${extension}`;
        }
      } catch (e) {
        // URL解析失败，继续使用默认逻辑
      }
    }
    
    // 尝试匹配版本号格式：项目管理系统 v1.0.0 版本发布
    const versionMatch = title.match(/项目管理系统\s+v?(\d+[\d.]*)\s+版本发布/);
    if (versionMatch) {
      const version = versionMatch[1];
      // 根据标题中的文件类型判断扩展名
      let extension = '.exe';
      if (title.toLowerCase().includes('.dmg')) {
        extension = '.dmg';
      } else if (title.toLowerCase().includes('.appimage')) {
        extension = '.AppImage';
      }
      return `项目管理系统-v${version}${extension}`;
    }
    
    // 默认返回带.pptx扩展名的标题
    return `${title}.pptx`;
  };

  // 下载文件（使用 fetch + blob 模式，支持跨域签名URL）
  const handleDownloadFile = async (url: string, title: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: ${response.statusText}`);
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = extractFilenameFromTitle(title, url);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("下载文件失败:", error);
      alert("下载文件失败，请稍后重试");
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageForm.receiverIds.length === 0) {
      alert("请至少选择一个接收者");
      return;
    }
    try {
      // 为每个接收者发送消息
      const promises = messageForm.receiverIds.map((user) =>
        fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: userId,
            receiverId: user.id,
            title: messageForm.title,
            content: messageForm.content,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every((res) => res.ok);

      if (allSuccess) {
        await fetchMessages();
        setShowCreateMessage(false);
        setMessageForm({ title: "", content: "", receiverIds: [] });
        alert(`成功发送给 ${messageForm.receiverIds.length} 个接收者`);
      } else {
        alert("部分消息发送失败，请重试");
      }
    } catch (error) {
      console.error("发送消息失败:", error);
      alert("发送消息失败");
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/messages/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          ...announcementForm,
        }),
      });
      if (res.ok) {
        await fetchMessages();
        setShowCreateAnnouncement(false);
        setAnnouncementForm({ title: "", content: "" });
        alert("通告发送成功");
      }
    } catch (error) {
      console.error("发送通告失败:", error);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      alert("请选择要上传的文件");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("senderId", userId);

      const res = await fetch("/api/system-documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        await fetchMessages();
        setShowUploadDocument(false);
        setDocumentFile(null);
        alert(json.message || "系统文档上传成功");
      } else {
        alert(json.error || "上传失败");
      }
    } catch (error) {
      console.error("上传系统文档失败:", error);
      alert("上传系统文档失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appUploadForm.file) {
      alert("请选择APK文件");
      return;
    }

    if (!appUploadForm.file.name.endsWith(".apk")) {
      alert("仅支持APK文件");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", appUploadForm.file);
      formData.append("version", appUploadForm.version);
      formData.append("description", appUploadForm.description);
      formData.append("userId", userId);

      const res = await fetch("/api/mobile-app/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        await fetchMessages();
        await fetchLatestApp();
        setShowAppUpload(false);
        setAppUploadForm({ version: "1.0.0", description: "", file: null });
        alert("APP上传成功，已发送系统通告");
      } else {
        alert(json.error || "上传失败");
      }
    } catch (error) {
      console.error("上传APP失败:", error);
      alert("上传APP失败");
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const messageColumns: Column<MessageWithSender>[] = [
    {
      key: "type",
      title: "类型",
      width: 100,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.isPinned && (
            <svg className="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              value === "announcement"
                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                : value === "system_document"
                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                : value === "knowledge_base"
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            }`}
          >
            {!row.isRead && row.type !== "system_document" && row.type !== "knowledge_base" && "新 "}
            {value === "announcement" ? "通告" : value === "system_document" ? "文档" : value === "knowledge_base" ? "知识库" : "消息"}
          </span>
        </div>
      ),
    },
    {
      key: "title",
      title: "标题",
      width: 200,
      sortable: true,
      render: (value, row) => (
        <div className="whitespace-normal break-words">
          <button
            onClick={() => handleViewDetail(row)}
            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-left"
          >
            {value}
          </button>
          {!row.isRead && row.type !== "system_document" && (
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" />
          )}
        </div>
      ),
    },
    {
      key: "content",
      title: "内容预览",
      width: 75,
      sortable: false,
      render: (value) => {
        const preview = value.length > 50 ? value.substring(0, 50) + "..." : value;
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-normal break-words line-clamp-3">
            {preview}
          </span>
        );
      },
    },
    {
      key: "sender",
      title: "发送者",
      width: 120,
      sortable: false,
      render: (_, row) => {
        if (row.type === "announcement" || row.type === "system_document") {
          return (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              系统
            </span>
          );
        }
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {row.senderFullName || row.senderName}
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      title: "时间",
      width: 150,
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 250,
      sortable: false,
      render: (_, row) => (
        <div className="flex gap-2 justify-end flex-wrap">
          {/* 审批消息显示前往审批按钮（已完成审批的不显示） */}
          {(row.relatedType === "project_approval" || row.relatedType === "approval") && row.relatedId && !resolvedApprovalIds.has(row.relatedId) && (
            <button
              onClick={() => handleMessageClick(row)}
              className="rounded-md bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
            >
              前往审批
            </button>
          )}
          {/* 系统文档类型显示下载按钮 */}
          {row.type === "system_document" && row.documentUrl && (
            <>
              <a
                href={`/api/system-documents/download/${row.id}`}
                download="生产系统操作说明书.md"
                className="rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              >
                下载
              </a>
              {/* 管理员可以更新文档 */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowUploadDocument(true);
                  }}
                  className="rounded-md bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
                >
                  更新
                </button>
              )}
            </>
          )}
          {/* 软件发布消息显示下载按钮 */}
          {row.type === "announcement" && row.documentUrl && (
            <button
              onClick={() => handleDownloadFile(row.documentUrl!, row.title)}
              className="rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              下载
            </button>
          )}
          {/* 知识库文档显示下载按钮 */}
          {row.type === "knowledge_base" && row.documentUrl && (
            <button
              onClick={() => handleDownloadFile(row.documentUrl!, row.title)}
              className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              下载文档
            </button>
          )}
          {/* 系统文档只有管理员可以删除 */}
          {(row.type !== "system_document" || isAdmin) && (
            <button
              onClick={() => handleDeleteMessage(row.id)}
              className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              删除
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            消息中心
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            查看和管理您的消息
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleMarkAllAsRead}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
          >
            全部标记已读
          </button>
          <button
            onClick={() => {
              setMessageForm({ title: "", content: "", receiverIds: [] });
              setShowCreateMessage(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            发送消息
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setAnnouncementForm({ title: "", content: "" });
                  setShowCreateAnnouncement(true);
                }}
                className="rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                发送通告
              </button>
              <button
                onClick={() => {
                  setAppUploadForm({ version: "1.0.0", description: "", file: null });
                  setShowAppUpload(true);
                }}
                className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                上传APP
              </button>
              <button
                onClick={() => {
                  setShowUploadDocument(true);
                }}
                className="rounded-lg bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                更新系统文档
              </button>
            </>
          )}
        </div>
      </div>

      {/* APP下载卡片 */}
      {latestAppVersion && (
        <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">📱</span>
                <h3 className="text-xl font-bold">移动端APP</h3>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm">
                  v{latestAppVersion.version}
                </span>
              </div>
              <p className="mb-4 text-sm opacity-90">
                {latestAppVersion.description || "随时随地管理您的项目"}
              </p>
              <div className="flex gap-3">
                {latestAppVersion.exists && latestAppVersion.downloadUrl ? (
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = latestAppVersion.downloadUrl;
                      link.download = latestAppVersion.filename;
                      link.click();
                    }}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-600 transition-colors hover:bg-gray-100"
                  >
                    立即下载
                  </button>
                ) : (
                  <span className="rounded-lg bg-white/20 px-4 py-2 text-sm">
                    文件暂不可用
                  </span>
                )}
                <span className="rounded-lg bg-white/10 px-3 py-2 text-sm opacity-75">
                  发布于: {new Date(latestAppVersion.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
            <div className="ml-4 text-5xl opacity-20">
              📲
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            暂无消息
          </p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            您还没有收到任何消息
          </p>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <ResizableTable
            columns={messageColumns}
            data={messages}
            storageKey="messages"
            rowClassName={(msg) => {
              // 未读消息使用蓝色背景，已读消息使用浅灰色背景
              if (!(msg as any).isRead) {
                return "bg-blue-50/80 dark:bg-blue-900/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/50";
              }
              return "bg-gray-50 dark:bg-gray-800";
            }}
          />
        </div>
      )}

      {/* 发送消息对话框 */}
      {showCreateMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 w-full max-w-lg relative mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              发送消息
            </h3>
            <form onSubmit={handleCreateMessage}>
              <div className="mb-4 relative z-[200]">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  接收者（支持多人）
                </label>
                <div className="z-[200]">
                  <UserMultiSelect
                    selectedUsers={messageForm.receiverIds}
                    onSelectionChange={(users) =>
                      setMessageForm({ ...messageForm, receiverIds: users })
                    }
                    excludeUserIds={[userId]} // 排除自己
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  标题
                </label>
                <input
                  type="text"
                  value={messageForm.title}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, title: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  内容
                </label>
                <textarea
                  value={messageForm.content}
                  onChange={(e) =>
                    setMessageForm({ ...messageForm, content: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateMessage(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  发送
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 发送通告对话框 */}
      {showCreateAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              发送系统通告
            </h3>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  标题
                </label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  内容
                </label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) =>
                    setAnnouncementForm({
                      ...announcementForm,
                      content: e.target.value,
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateAnnouncement(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  发送通告
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 上传系统文档对话框 */}
      {showUploadDocument && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              更新生产系统操作说明书
            </h3>
            <form onSubmit={handleUploadDocument}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  选择文件（仅支持Markdown格式）
                </label>
                <input
                  type="file"
                  accept=".md,text/markdown"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDocumentFile(file);
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
                {documentFile && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    已选择: {documentFile.name} ({(documentFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  注意：上传后将覆盖现有的系统文档，所有用户将看到最新版本。
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadDocument(false);
                    setDocumentFile(null);
                  }}
                  disabled={isUploading}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="rounded-md bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 disabled:opacity-50"
                >
                  {isUploading ? "上传中..." : "更新文档"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APP上传对话框 */}
      {showAppUpload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 w-full max-w-lg relative mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              上传移动端APP
            </h3>
            <form onSubmit={handleUploadApp}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  版本号
                </label>
                <input
                  type="text"
                  value={appUploadForm.version}
                  onChange={(e) =>
                    setAppUploadForm({ ...appUploadForm, version: e.target.value })
                  }
                  placeholder="例如: 1.0.0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  更新说明
                </label>
                <textarea
                  value={appUploadForm.description}
                  onChange={(e) =>
                    setAppUploadForm({ ...appUploadForm, description: e.target.value })
                  }
                  placeholder="请输入本次更新的内容..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  APK文件
                </label>
                <input
                  type="file"
                  accept=".apk"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAppUploadForm({ ...appUploadForm, file });
                    }
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
                {appUploadForm.file && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    已选择: {appUploadForm.file.name} ({(appUploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 dark:bg-blue-900/20 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  注意：上传后系统将自动发送版本更新通告，所有用户均可下载最新版本。
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAppUpload(false);
                    setAppUploadForm({ version: "1.0.0", description: "", file: null });
                  }}
                  disabled={isUploading}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:opacity-50"
                >
                  {isUploading ? "上传中..." : "上传APP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 消息详情对话框 */}
      {showMessageDetail && selectedMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                {selectedMessage.title}
              </h3>
              <button
                onClick={() => setShowMessageDetail(false)}
                className="ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 消息头部信息 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">类型：</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                      selectedMessage.type === "announcement"
                        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                        : selectedMessage.type === "system_document"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                        : selectedMessage.type === "knowledge_base"
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {selectedMessage.type === "announcement" ? "通告" : selectedMessage.type === "system_document" ? "文档" : selectedMessage.type === "knowledge_base" ? "知识库" : "消息"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">发送者：</span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {selectedMessage.type === "announcement" || selectedMessage.type === "system_document" || selectedMessage.type === "knowledge_base"
                      ? "系统"
                      : (selectedMessage.senderFullName || selectedMessage.senderName)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">发送时间：</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{formatDate(selectedMessage.createdAt)}</span>
                </div>
                {selectedMessage.readAt && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">阅读时间：</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{formatDate(selectedMessage.readAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 消息内容 */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {selectedMessage.content}
              </p>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3">
              {/* 审批消息显示前往审批按钮（已完成审批的不显示） */}
              {(selectedMessage.relatedType === "project_approval" || selectedMessage.relatedType === "approval") && selectedMessage.relatedId && !resolvedApprovalIds.has(selectedMessage.relatedId) && (
                <button
                  onClick={() => {
                    setShowMessageDetail(false);
                    handleMessageClick(selectedMessage);
                  }}
                  className="rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                >
                  前往审批
                </button>
              )}
              {/* 系统文档类型显示下载按钮 */}
              {selectedMessage.type === "system_document" && selectedMessage.documentUrl && (
                <a
                  href={`/api/system-documents/download/${selectedMessage.id}`}
                  download="生产系统操作说明书.md"
                  className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  下载文档
                </a>
              )}
              {/* 软件发布消息显示下载按钮 */}
              {selectedMessage.type === "announcement" && selectedMessage.documentUrl && (
                <button
                  onClick={() => handleDownloadFile(selectedMessage.documentUrl!, selectedMessage.title)}
                  className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  下载软件
                </button>
              )}
              {/* 知识库文档显示下载按钮 */}
              {selectedMessage.type === "knowledge_base" && selectedMessage.documentUrl && (
                <button
                  onClick={() => handleDownloadFile(selectedMessage.documentUrl!, selectedMessage.title)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  下载文档
                </button>
              )}
              {/* 系统文档只有管理员可以删除 */}
              {(selectedMessage.type !== "system_document" || isAdmin) && (
                <button
                  onClick={async () => {
                    if (!confirm("确定要删除此消息吗？")) return;
                    await handleDeleteMessage(selectedMessage.id);
                    setShowMessageDetail(false);
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                >
                  删除
                </button>
              )}
              <button
                onClick={() => setShowMessageDetail(false)}
                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
