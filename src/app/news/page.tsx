"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ExternalLink, Calendar, Tag, Newspaper } from "lucide-react";
import DarkSidebarLayout from "@/components/DarkSidebarLayout";

const CATEGORIES = [
  { key: "", label: "全部" },
  { key: "automation", label: "自动化" },
  { key: "ai", label: "人工智能" },
  { key: "chip", label: "芯片" },
  { key: "electronics", label: "电子技术" },
];

interface NewsItem {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  sourceUrl: string | null;
  category: string;
  publishDate: string;
  imageUrl: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  automation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  ai: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  electronics: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [fetching, setFetching] = useState(false);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", String(pagination.pageSize));
      if (category) params.set("category", category);
      const res = await fetch(`/api/news?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        const filtered = keyword
          ? json.data.filter(
              (n: NewsItem) =>
                n.title.toLowerCase().includes(keyword.toLowerCase()) ||
                (n.summary || "").toLowerCase().includes(keyword.toLowerCase())
            )
          : json.data;
        setNews(filtered);
        setPagination(json.pagination);
      }
    } catch (e) {
      console.error("Failed to load news", e);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, category, keyword]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((p) => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visiblePages = () => {
    const pages: number[] = [];
    const tp = pagination.totalPages;
    const cp = pagination.page;
    if (tp <= 7) {
      for (let i = 1; i <= tp; i++) pages.push(i);
    } else {
      pages.push(1);
      if (cp > 3) pages.push(-1);
      for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
      if (cp < tp - 2) pages.push(-1);
      pages.push(tp);
    }
    return pages;
  };

  return (
    <DarkSidebarLayout>
      <div className="flex-1 min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Newspaper className="w-7 h-7 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">行业新闻</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  覆盖自动化、人工智能、芯片、电子技术等行业动态
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Category tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryChange(cat.key)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      category === cat.key
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索新闻..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
              </div>
            </div>
          </div>

          {/* News count */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? "加载中..." : `共 ${pagination.total} 条新闻`}
            </span>
          </div>

          {/* News grid */}
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>暂无行业新闻</p>
            </div>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <a
                  key={item.id}
                  href={item.sourceUrl || "#"}
                  target={item.sourceUrl ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${CATEGORY_COLORS[item.category] || "bg-gray-100 text-gray-600"}`}
                        >
                          {CATEGORIES.find((c) => c.key === item.category)?.label || item.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                        {item.title}
                        {item.sourceUrl && (
                          <ExternalLink className="inline-block w-3.5 h-3.5 ml-1.5 text-gray-300 group-hover:text-blue-500" />
                        )}
                      </h3>
                      {item.summary && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {item.source}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(item.publishDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                首页
              </button>
              <button
                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              {visiblePages().map((p, idx) =>
                p === -1 ? (
                  <span key={`e-${idx}`} className="px-1 text-gray-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`min-w-[36px] h-9 text-sm rounded-lg ${
                      pagination.page === p
                        ? "bg-blue-500 text-white"
                        : "border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                下一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                末页
              </button>
            </div>
          )}
        </div>
      </div>
    </DarkSidebarLayout>
  );
}
