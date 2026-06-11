"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// 定义动画
const chatStyles = `
  @keyframes chatFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes chatSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isBouncing, setIsBouncing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我是非凡小助手，有什么可以帮助你的吗？",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageHistoryRef = useRef<any[]>([]);
  const streamingContentRef = useRef<string>("");
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 注入动画样式
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = chatStyles;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // 自动滚动到底部 - 使用即时滚动而不是 smooth
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // 按钮弹跳动画
  useEffect(() => {
    const bounceInterval = setInterval(() => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 2000);
    }, 5000);

    return () => clearInterval(bounceInterval);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "你好！我是非凡小助手，有什么可以帮助你的吗？",
        timestamp: new Date(),
      },
    ]);
    messageHistoryRef.current = [];
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // 使用 useMemo 缓存消息列表渲染
  const messagesList = useMemo(() => {
    return messages.map((msg, index) => {
      const timeString = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <div
          key={`${msg.role}-${index}-${msg.timestamp.getTime()}`}
          className={`flex items-end gap-2 ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {msg.role === "assistant" && (
            <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg overflow-hidden ring-4 ring-pink-200">
              {/* 卡通数字美女头像 */}
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* 头发背景 */}
                <circle cx="50" cy="50" r="48" fill="url(#hairGradient)"/>
                {/* 脸 */}
                <ellipse cx="50" cy="52" rx="35" ry="38" fill="#FFE4C4"/>
                {/* 头发刘海 */}
                <path d="M15 40 Q50 20 85 40 L85 55 Q50 35 15 55 Z" fill="url(#hairGradient)"/>
                {/* 左眼睛 */}
                <ellipse cx="38" cy="50" rx="8" ry="10" fill="white"/>
                <circle cx="40" cy="50" r="5" fill="#4A5568"/>
                <circle cx="41" cy="48" r="2" fill="white"/>
                {/* 右眼睛 */}
                <ellipse cx="62" cy="50" rx="8" ry="10" fill="white"/>
                <circle cx="60" cy="50" r="5" fill="#4A5568"/>
                <circle cx="61" cy="48" r="2" fill="white"/>
                {/* 睫毛 */}
                <path d="M30 42 L28 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                <path d="M32 40 L30 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                <path d="M34 38 L33 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                <path d="M70 42 L72 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                <path d="M68 40 L70 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                <path d="M66 38 L67 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
                {/* 腮红 */}
                <ellipse cx="30" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
                <ellipse cx="70" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
                {/* 嘴巴 */}
                <path d="M43 68 Q50 73 57 68" stroke="#E53E3E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                {/* 头发装饰 */}
                <circle cx="25" cy="35" r="4" fill="#FF69B4"/>
                <circle cx="75" cy="35" r="4" fill="#FF69B4"/>
                {/* 头发光泽 */}
                <path d="M20 30 Q30 20 40 30" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
                <path d="M60 30 Q70 20 80 30" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
                {/* 渐变定义 */}
                <defs>
                  <linearGradient id="hairGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333EA"/>
                    <stop offset="100%" stopColor="#EC4899"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          )}
          <div
            className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-lg transform transition-all hover:scale-105 ${
              msg.role === "user"
                ? "bg-gradient-to-br from-blue-500 to-cyan-400 text-white rounded-br-md"
                : "bg-gradient-to-br from-white to-pink-50 text-gray-800 rounded-bl-md border-2 border-pink-200"
            }`}
          >
            <div className="whitespace-pre-wrap break-words text-sm font-medium">
              {msg.content}
            </div>
            <div
              className={`text-xs mt-1 font-semibold ${
                msg.role === "user"
                  ? "text-blue-100"
                  : "text-pink-400"
              }`}
            >
              {timeString}
            </div>
          </div>
          {msg.role === "user" && (
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg shadow-lg">
              😊
            </div>
          )}
        </div>
      );
    });
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading || isStreaming) return;

    const userMessage = message.trim();
    setMessage("");

    // 添加用户消息
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // 更新消息历史（用于发送给AI）
    const recentHistory = messages.slice(-6).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    messageHistoryRef.current = [...recentHistory, { role: "user", content: userMessage }];

    setIsLoading(true);
    setIsStreaming(true);
    streamingContentRef.current = "";

    // 创建AI助手消息占位符
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage,
          history: messageHistoryRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "请求失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                // 清除定时器，确保最后的内容被更新
                if (updateTimerRef.current) {
                  clearTimeout(updateTimerRef.current);
                  updateTimerRef.current = null;
                }
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  streamingContentRef.current = `错误：${parsed.error}`;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: streamingContentRef.current,
                    };
                    return newMessages;
                  });
                  break;
                }
                if (parsed.content) {
                  streamingContentRef.current += parsed.content;

                  // 使用防抖更新UI，减少渲染频率
                  if (updateTimerRef.current) {
                    clearTimeout(updateTimerRef.current);
                  }

                  updateTimerRef.current = setTimeout(() => {
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        ...newMessages[newMessages.length - 1],
                        content: streamingContentRef.current,
                      };
                      return newMessages;
                    });
                  }, 50); // 50ms 节流
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }

        // 确保最后的内容被更新
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: streamingContentRef.current,
          };
          return newMessages;
        });
      }

      // 更新消息历史，添加AI的回复
      messageHistoryRef.current.push({ role: "assistant", content: streamingContentRef.current });
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `抱歉，发生错误：${error instanceof Error ? error.message : "未知错误"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    }
  }, [message, isLoading, isStreaming, messages]);

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-400 hover:via-purple-400 hover:to-indigo-400 text-white rounded-full p-1 shadow-2xl transition-all duration-300 hover:scale-110 ${isBouncing ? 'animate-bounce' : ''}`}
        title="打开非凡小助手"
      >
        {/* 卡通数字美女头像 */}
        <svg
          className="w-14 h-14 drop-shadow-lg"
          viewBox="0 0 100 100"
        >
          {/* 头发背景 */}
          <circle cx="50" cy="50" r="48" fill="url(#hairGradient2)"/>
          {/* 脸 */}
          <ellipse cx="50" cy="52" rx="35" ry="38" fill="#FFE4C4"/>
          {/* 头发刘海 */}
          <path d="M15 40 Q50 20 85 40 L85 55 Q50 35 15 55 Z" fill="url(#hairGradient2)"/>
          {/* 左眼睛 */}
          <ellipse cx="38" cy="50" rx="8" ry="10" fill="white"/>
          <circle cx="40" cy="50" r="5" fill="#4A5568"/>
          <circle cx="41" cy="48" r="2" fill="white"/>
          {/* 右眼睛 */}
          <ellipse cx="62" cy="50" rx="8" ry="10" fill="white"/>
          <circle cx="60" cy="50" r="5" fill="#4A5568"/>
          <circle cx="61" cy="48" r="2" fill="white"/>
          {/* 睫毛 */}
          <path d="M30 42 L28 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          <path d="M32 40 L30 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          <path d="M34 38 L33 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          <path d="M70 42 L72 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          <path d="M68 40 L70 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          <path d="M66 38 L67 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
          {/* 腮红 */}
          <ellipse cx="30" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
          <ellipse cx="70" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
          {/* 嘴巴 */}
          <path d="M43 68 Q50 73 57 68" stroke="#E53E3E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          {/* 头发装饰 */}
          <circle cx="25" cy="35" r="4" fill="#FF69B4"/>
          <circle cx="75" cy="35" r="4" fill="#FF69B4"/>
          {/* 头发光泽 */}
          <path d="M20 30 Q30 20 40 30" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
          <path d="M60 30 Q70 20 80 30" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="hairGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9333EA"/>
              <stop offset="100%" stopColor="#EC4899"/>
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] flex flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-3xl shadow-2xl border-4 border-pink-200 overflow-hidden transform transition-all duration-500 animate-[chatSlideIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-t-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl animate-[chatFloat_3s_ease-in-out_infinite] overflow-hidden">
            {/* 卡通数字美女小头像 */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* 头发背景 */}
              <circle cx="50" cy="50" r="48" fill="url(#hairGradient3)"/>
              {/* 脸 */}
              <ellipse cx="50" cy="52" rx="35" ry="38" fill="#FFE4C4"/>
              {/* 头发刘海 */}
              <path d="M15 40 Q50 20 85 40 L85 55 Q50 35 15 55 Z" fill="url(#hairGradient3)"/>
              {/* 左眼睛 */}
              <ellipse cx="38" cy="50" rx="8" ry="10" fill="white"/>
              <circle cx="40" cy="50" r="5" fill="#4A5568"/>
              <circle cx="41" cy="48" r="2" fill="white"/>
              {/* 右眼睛 */}
              <ellipse cx="62" cy="50" rx="8" ry="10" fill="white"/>
              <circle cx="60" cy="50" r="5" fill="#4A5568"/>
              <circle cx="61" cy="48" r="2" fill="white"/>
              {/* 睫毛 */}
              <path d="M30 42 L28 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              <path d="M32 40 L30 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              <path d="M34 38 L33 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              <path d="M70 42 L72 38" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              <path d="M68 40 L70 36" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              <path d="M66 38 L67 34" stroke="#2D3748" strokeWidth="1.5" fill="none"/>
              {/* 腮红 */}
              <ellipse cx="30" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
              <ellipse cx="70" cy="60" rx="6" ry="4" fill="#FFB6C1" opacity="0.6"/>
              {/* 嘴巴 */}
              <path d="M43 68 Q50 73 57 68" stroke="#E53E3E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              {/* 头发装饰 */}
              <circle cx="25" cy="35" r="4" fill="#FF69B4"/>
              <circle cx="75" cy="35" r="4" fill="#FF69B4"/>
              {/* 渐变定义 */}
              <defs>
                <linearGradient id="hairGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9333EA"/>
                  <stop offset="100%" stopColor="#EC4899"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg drop-shadow-md">非凡小助手</span>
            <div className="text-xs text-pink-100">随时为您服务</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:scale-110"
            title="清空对话"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          <button
            onClick={toggleChat}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:scale-110"
            title="关闭"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96 min-h-[300px] space-y-4 bg-white/50 backdrop-blur-sm">
        {messagesList}
        {(isLoading || isStreaming) && (
          <div className="flex items-start gap-2">
            <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-lg shadow-lg">
              🤖
            </div>
            <div className="bg-gradient-to-br from-white to-pink-50 border-2 border-pink-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-3 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t-4 border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入问题..."
            disabled={isLoading || isStreaming}
            className="flex-1 px-4 py-3 border-2 border-pink-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-300 focus:border-pink-400 text-sm font-medium bg-white shadow-inner transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading || isStreaming}
            className="px-6 py-2 bg-gradient-to-br from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:scale-100 flex items-center gap-2 font-semibold"
          >
            <span>发送</span>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
