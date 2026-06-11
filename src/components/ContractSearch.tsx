"use client";

import { useState, useEffect, useRef } from "react";
import type { Contract } from "@/storage/database/shared/schema";

interface ContractSearchProps {
  value: string;
  onChange: (value: string) => void;
  onContractSelect: (contract: Contract) => void;
  disabled?: boolean;
}

export default function ContractSearch({
  value,
  onChange,
  onContractSelect,
  disabled = false,
}: ContractSearchProps) {
  const [searchResults, setSearchResults] = useState<Contract[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // 搜索合同
  const searchContracts = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/search?contractCode=${encodeURIComponent(keyword)}&mode=fuzzy`);
      const json = await res.json();
      if (json.success) {
        const contracts = Array.isArray(json.data) ? json.data : [json.data];
        setSearchResults(contracts);
      }
    } catch (error) {
      console.error("Error searching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  // 防抖搜索
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        searchContracts(value);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value]);

  // 处理合同选择
  const handleSelectContract = (contract: Contract) => {
    onChange(contract.contractCode || "");
    setShowDropdown(false);
    onContractSelect(contract);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim() && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
        disabled={disabled}
        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        placeholder="输入合同编码进行搜索..."
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
        </div>
      )}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同编码</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同名称</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">合同日期</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">客户信息</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.map((contract) => (
                <tr
                  key={contract.id}
                  onClick={() => handleSelectContract(contract)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 border-b dark:border-gray-700 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{contract.contractCode || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{contract.contractName || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {contract.contractDate
                      ? new Date(contract.contractDate).toLocaleDateString('zh-CN')
                      : "-"
                    }
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{contract.customerName || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showDropdown && !loading && searchResults.length === 0 && value.trim() && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
          未找到匹配的合同
        </div>
      )}
    </div>
  );
}
