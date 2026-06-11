"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface URLParamsHandlerProps {
  onTabChange: (tab: string) => void;
  onApprovalIdChange: (approvalId: string | null) => void;
}

export default function URLParamsHandler({
  onTabChange,
  onApprovalIdChange,
}: URLParamsHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const approvalId = searchParams.get("approvalId");

    if (tabParam === "approvals") {
      onTabChange("approvals");
      // 设置目标审批 ID（统一审批管理会自动高亮）
      if (approvalId) {
        onApprovalIdChange(approvalId);
      }
    }
  }, [searchParams, onTabChange, onApprovalIdChange]);

  return null;
}
