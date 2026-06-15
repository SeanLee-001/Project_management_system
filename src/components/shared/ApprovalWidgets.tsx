/**
 * 优化后的审批数据组件
 * 使用 React.memo 避免不必要的重渲染
 */
'use client';

import React, { memo, useMemo } from 'react';
import { Badge, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface ApprovalItem {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  applicant: string;
}

const StatusBadge = memo(({ status }: { status: ApprovalItem['status'] }) => {
  const config = {
    pending: { label: '审批中', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: '已通过', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    rejected: { label: '已拒绝', icon: XCircle, color: 'bg-red-100 text-red-800' },
  };
  
  const { label, icon: Icon, color } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

const StatCard = memo(({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className={`p-4 rounded-lg ${color}`}>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm opacity-80">{label}</div>
  </div>
));

StatCard.displayName = 'StatCard';

export function ApprovalDashboard({ items }: { items: ApprovalItem[] }) {
  const stats = useMemo<ApprovalStats>(() => ({
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length,
  }), [items]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总计" value={stats.total} color="bg-blue-100 text-blue-800" />
        <StatCard label="审批中" value={stats.pending} color="bg-yellow-100 text-yellow-800" />
        <StatCard label="已通过" value={stats.approved} color="bg-green-100 text-green-800" />
        <StatCard label="已拒绝" value={stats.rejected} color="bg-red-100 text-red-800" />
      </div>
      
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-sm text-gray-500">{item.applicant} - {item.createdAt}</div>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
