"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface URLParamsHandlerProps {
  onTabChange: (tab: string) => void;
  onApprovalIdChange: (approvalId: string | null) => void;
  onApprovalTypeChange?: (type: string | null) => void;
}

export default function URLParamsHandler({
  onTabChange,
  onApprovalIdChange,
  onApprovalTypeChange,
}: URLParamsHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const approvalId = searchParams.get("approvalId");
    const type = searchParams.get("type");

    if (tabParam === "approvals") {
      onTabChange("approvals");
      if (approvalId) {
        onApprovalIdChange(approvalId);
      }
      if (onApprovalTypeChange) {
        onApprovalTypeChange(type);
      }
    }
  }, [searchParams, onTabChange, onApprovalIdChange, onApprovalTypeChange]);

  return null;
}
