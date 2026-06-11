/**
 * API服务文件
 * 处理所有后端API请求
 */
import axios, {AxiosInstance, AxiosRequestConfig} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Project,
  Task,
  Customer,
  Contract,
  Order,
  Product,
  Message,
  Approval,
  ApiResponse,
} from '../types';

// 配置基础URL - 根据实际部署环境修改
const BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加token
    this.client.interceptors.request.use(
      async config => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error reading token:', error);
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理错误
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          // Token过期，清除本地存储
          await AsyncStorage.multiRemove(['token', 'user']);
        }
        return Promise.reject(error);
      }
    );
  }

  // 通用请求方法
  private async request<T>(
    config: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || '请求失败',
        };
      } else if (error.request) {
        return {
          success: false,
          error: '网络错误，请检查网络连接',
        };
      } else {
        return {
          success: false,
          error: '请求配置错误',
        };
      }
    }
  }

  // ========== 认证相关 ==========
  async login(username: string, password: string): Promise<ApiResponse<User>> {
    const response = await this.request<User>({
      method: 'POST',
      url: '/auth/login',
      data: {username, password},
    });

    if (response.success && response.data) {
      // 保存token和用户信息
      const {token} = (response as any).token || '';
      await AsyncStorage.setItem('token', token || '');
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }

    return response;
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['token', 'user']);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  // ========== 项目相关 ==========
  async getProjects(params?: {
    keyword?: string;
    status?: string;
  }): Promise<ApiResponse<Project[]>> {
    return this.request<Project[]>({
      method: 'GET',
      url: '/projects',
      params,
    });
  }

  async getProjectById(id: string): Promise<ApiResponse<Project>> {
    return this.request<Project>({
      method: 'GET',
      url: `/projects/${id}`,
    });
  }

  async createProject(project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.request<Project>({
      method: 'POST',
      url: '/projects',
      data: project,
    });
  }

  async updateProject(
    id: string,
    project: Partial<Project>
  ): Promise<ApiResponse<Project>> {
    return this.request<Project>({
      method: 'PUT',
      url: `/projects/${id}`,
      data: project,
    });
  }

  // ========== 任务相关 ==========
  async getTasks(projectId: string): Promise<ApiResponse<Task[]>> {
    return this.request<Task[]>({
      method: 'GET',
      url: `/tasks?projectId=${projectId}`,
    });
  }

  async updateTask(
    id: string,
    task: Partial<Task>
  ): Promise<ApiResponse<Task>> {
    return this.request<Task>({
      method: 'PUT',
      url: `/tasks/${id}`,
      data: task,
    });
  }

  // ========== 客户相关 ==========
  async getCustomers(params?: {
    keyword?: string;
  }): Promise<ApiResponse<Customer[]>> {
    return this.request<Customer[]>({
      method: 'GET',
      url: '/customers',
      params,
    });
  }

  // ========== 合同相关 ==========
  async getContracts(params?: {
    keyword?: string;
  }): Promise<ApiResponse<Contract[]>> {
    return this.request<Contract[]>({
      method: 'GET',
      url: '/contracts',
      params,
    });
  }

  // ========== 订单相关 ==========
  async getOrders(params?: {
    keyword?: string;
    status?: string;
  }): Promise<ApiResponse<Order[]>> {
    return this.request<Order[]>({
      method: 'GET',
      url: '/orders',
      params,
    });
  }

  // ========== 产品相关 ==========
  async getProducts(params?: {
    keyword?: string;
  }): Promise<ApiResponse<Product[]>> {
    return this.request<Product[]>({
      method: 'GET',
      url: '/products',
      params,
    });
  }

  // ========== 消息相关 ==========
  async getMessages(userId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>({
      method: 'GET',
      url: `/messages?userId=${userId}`,
    });
  }

  async markMessageAsRead(id: string): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'PUT',
      url: `/messages/${id}/read`,
    });
  }

  // ========== 审批相关 ==========
  async getApprovals(userId: string): Promise<ApiResponse<Approval[]>> {
    return this.request<Approval[]>({
      method: 'GET',
      url: `/approvals?userId=${userId}`,
    });
  }

  async approveApproval(
    id: string,
    comment?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'PUT',
      url: `/approvals/${id}/approve`,
      data: {comment},
    });
  }

  async rejectApproval(
    id: string,
    comment?: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>({
      method: 'PUT',
      url: `/approvals/${id}/reject`,
      data: {comment},
    });
  }
}

export const apiService = new ApiService();
