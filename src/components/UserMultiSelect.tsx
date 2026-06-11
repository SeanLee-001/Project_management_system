"use client";

import { useState, useEffect, useRef } from "react";

interface User {
  id: string;
  username: string;
  fullName: string | null;
  employeeNumber: string | null;
  email: string;
  phone: string | null;
}

interface UserMultiSelectProps {
  selectedUsers: User[];
  onSelectionChange: (users: User[]) => void;
  excludeUserIds?: string[]; // 排除的用户ID（如当前用户自己）
}

export default function UserMultiSelect({
  selectedUsers,
  onSelectionChange,
  excludeUserIds = [],
}: UserMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 模糊查询用户
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        fetchUsers(query);
      } else {
        setSearchResults([]);
      }
    }, 300); // 添加300ms防抖，避免频繁请求

    return () => clearTimeout(timer);
  }, [query, selectedUsers, excludeUserIds]); // 添加依赖确保搜索结果正确过滤

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchUsers = async (searchQuery: string) => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json.success) {
        // 过滤掉已选用户和排除的用户
        const filteredResults = json.data.filter(
          (user: User) =>
            !selectedUsers.some((selected) => selected.id === user.id) &&
            !excludeUserIds.includes(user.id)
        );
        setSearchResults(filteredResults);
        setShowDropdown(true);
        console.log("查询结果:", filteredResults);
      } else {
        console.error("查询失败:", json.error);
      }
    } catch (error) {
      console.error("查询用户失败:", error);
      setSearchResults([]);
    }
  };

  const handleSelectUser = (user: User) => {
    onSelectionChange([...selectedUsers, user]);
    setQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleRemoveUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter((u) => u.id !== userId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 已选用户标签 */}
      {selectedUsers.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 z-[200] relative">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-sm dark:bg-blue-900/30 dark:text-blue-300"
            >
              <span>{user.fullName || user.username}</span>
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 搜索输入框 */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const newValue = e.target.value;
            setQuery(newValue);
            if (newValue.trim().length > 0) {
              setShowDropdown(true);
            } else {
              setShowDropdown(false);
            }
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // 延迟关闭下拉框，让点击事件先触发
            setTimeout(() => {
              setShowDropdown(false);
            }, 200);
          }}
          placeholder={
            selectedUsers.length === 0
              ? "输入工号、用户名、全名、邮箱或手机搜索..."
              : "继续添加更多接收者..."
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />

        {/* 下拉搜索结果 */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">工号</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">用户名</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">全名</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">邮箱</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{user.employeeNumber || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">@{user.username}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{user.fullName || '-'}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{user.email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showDropdown && query.trim().length > 0 && searchResults.length === 0 && (
          <div className="absolute z-[200] mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-4 text-sm text-gray-500 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 text-center">
            <div className="flex flex-col items-center gap-2">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>未找到匹配的用户</p>
              <p className="text-xs text-gray-400">请尝试使用工号、用户名、全名、邮箱或手机搜索</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
