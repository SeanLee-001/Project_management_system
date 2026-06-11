/**
 * 类型定义文件
 */

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate: string;
  endDate: string;
  ownerId: string;
  customerName: string;
  projectManager: string;
  projectManagerPhone?: string;
  iconUrl?: string;
}

export interface Task {
  id: string;
  taskId?: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  startDate?: string;
  endDate?: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface Contract {
  id: string;
  contractCode: string;
  contractName: string;
  customerId: string;
  customerName: string;
  contractDate: string;
  amount: number;
  status: 'active' | 'inactive' | 'expired';
  signDate?: string;
  expiryDate?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  deliveryDate?: string;
  quantity: number;
  amount: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  contractCode?: string;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  specification?: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  subject: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Approval {
  id: string;
  type: 'project' | 'contract' | 'order';
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  status: 'pending' | 'approved' | 'rejected';
  currentStep: number;
  totalSteps: number;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
