/**
 * 工具函数
 */

/**
 * 格式化日期
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

/**
 * 计算两个日期之间的天数
 */
export const calculateDuration = (
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * 计算延期天数
 */
export const getOverdueDays = (endDate: string): number | null => {
  const end = new Date(endDate);
  const today = new Date();

  // 设置时间为0点，只比较日期
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (end < today) {
    const diffTime = today.getTime() - end.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  return null;
};

/**
 * 获取状态显示文本
 */
export const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    paused: '已暂停',
    cancelled: '已取消',
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝',
    todo: '待办',
    in_progress: '进行中',
  };
  return statusMap[status] || status;
};

/**
 * 获取优先级显示文本
 */
export const getPriorityText = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  return priorityMap[priority] || priority;
};

/**
 * 格式化金额
 */
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
