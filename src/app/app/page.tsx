"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Pencil, Trash2, Undo2, Clock } from "lucide-react";
import type { Project, Task, User, Contract, CustomMember } from "@/storage/database/shared/schema";

// 动态导入重型组件，按需加载，大幅提升首屏启动速度
const CustomerManagement = dynamic(() => import("@/components/CustomerManagement"), { ssr: false });
const ContractManagement = dynamic(() => import("@/components/ContractManagement"), { ssr: false });
const ApprovalManagement = dynamic(() => import("@/components/ApprovalManagement"), { ssr: false });
const OrderManagement = dynamic(() => import("@/components/OrderManagement"), { ssr: false });
const ProductManagement = dynamic(() => import("@/components/ProductManagement"), { ssr: false });
const DeliveryManagement = dynamic(() => import("@/components/DeliveryManagement"), { ssr: false });
const KnowledgeBaseManagement = dynamic(() => import("@/components/KnowledgeBaseManagement"), { ssr: false });
const MessageCenter = dynamic(() => import("@/components/MessageCenter"), { ssr: false });
const ProjectApproval = dynamic(() => import("@/components/ProjectApproval"), { ssr: false });
const ProgressPlanTable = dynamic(() => import("@/components/ProgressPlanTable"), { ssr: false });
const EditableProgressPlanTable = dynamic(() => import("@/components/EditableProgressPlanTable"), { ssr: false });
const ChatAssistant = dynamic(() => import("@/components/ChatAssistant"), { ssr: false });
const CustomerSearch = dynamic(() => import("@/components/CustomerSearch"), { ssr: false });
const ProductSearch = dynamic(() => import("@/components/ProductSearch"), { ssr: false });
const OrderSearch = dynamic(() => import("@/components/OrderSearch"), { ssr: false });
const ContractSearch = dynamic(() => import("@/components/ContractSearch"), { ssr: false });
const FileManagement = dynamic(() => import("@/components/FileManagement"), { ssr: false });
const UtilityTools = dynamic(() => import("@/components/UtilityTools"), { ssr: false });
const Dashboard = dynamic(() => import("@/components/Dashboard"), { ssr: false });
const ContractDashboard = dynamic(() => import("@/components/ContractDashboard"), { ssr: false });
const KnowledgeBasePanel = dynamic(() => import("@/components/knowledge-base/KnowledgeBasePanel"), { ssr: false });
const TaskProfilePage = dynamic(() => import("@/app/app/task-profile/page"), { ssr: false });

// 轻量组件保持静态导入
import MessageNotification from "@/components/MessageNotification";
import { notifyUserChanged } from "@/components/GlobalWatermark";
import URLParamsHandler from "@/components/URLParamsHandler";
import AppDownloadQRCode from "@/components/AppDownloadQRCode";
import { ResizableTable, type Column } from "@/components/ResizableTable";
import { UserRoleDisplayNames, UserRole } from "@/storage/database/shared/schema";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { convertToProxyUrl } from "@/lib/imageUtils";

type Status = "active" | "completed" | "paused" | "cancelled";
type TaskStatus = "todo" | "in_progress" | "completed";
type Priority = "low" | "medium" | "high";
type Tab = "dashboard" | "orders_dashboard" | "contracts_dashboard" | "projects" | "tasks" | "customers" | "contracts" | "orders" | "products" | "deliveries" | "messages" | "approvals" | "knowledge_base" | "task_profile";

// Tab与资源的映射关系（用于权限控制）
const TAB_RESOURCE_MAP: Record<Tab, string | null> = {
  dashboard: null, // 看板不需要权限
  orders_dashboard: null, // 订单看板不需要权限
  contracts_dashboard: null, // 合同看板不需要权限
  projects: "projects",
  tasks: "tasks",
  customers: "customers",
  contracts: "contracts",
  orders: "orders", // 订单管理需要权限
  products: "products", // 产品管理需要权限
  deliveries: "deliveries", // 送货管理需要权限
  messages: null, // 消息中心不需要权限
  approvals: null, // 审批中心不需要权限
  knowledge_base: null, // 知识库不需要权限
  task_profile: null, // 任务画像不需要权限
};

// 计算项目持续时间
const calculateDuration = (startDate: string | Date | null, endDate: string | Date | null): string => {
  if (!startDate || !endDate) return '';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} 天`;
};

// 项目状态映射
const PROJECT_STATUS_MAP: Record<string, { text: string; className: string }> = {
  completed: { text: '已完成', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  cancelled: { text: '已取消', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  paused: { text: '已暂停', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  active: { text: '进行中', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' }
};

// 任务优先级映射
const TASK_PRIORITY_MAP: Record<string, { text: string; className: string }> = {
  high: { text: '高', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  medium: { text: '中', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  low: { text: '低', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
};

// 任务状态映射
const TASK_STATUS_MAP: Record<string, { text: string; className: string }> = {
  todo: { text: '待办', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  in_progress: { text: '进行中', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { text: '已完成', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' }
};

// 计算项目延期天数
const getOverdueDays = (project: Project): number | null => {
  // 如果项目已完成，不算延期
  if (project.status === "completed") return null;

  // 如果没有结束日期，不算延期
  if (!project.endDate) return null;

  const endDate = new Date(project.endDate);
  const today = new Date();

  // 设置时间为0点，只比较日期
  endDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // 如果结束日期小于当前日期，计算延期天数
  if (endDate < today) {
    const diffTime = today.getTime() - endDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  return null;
};

// 角色代码到中文名称的映射
const ROLE_CODE_MAP: Record<string, string> = {
  'projectManager': '项目经理',
  'projectManagement': '项目管理',
  'mechanicalLead': '机械负责人',
  'electricalLead': '电气负责人',
  'visualLead': '视觉负责人',
  'softwareLead': '软件负责人',
  'algorithmLead': '算法负责人',
  'procurement': '采购',
  'planning': '计划',
  'production': '生产',
  'quality': '质量',
  'fieldProjectLead': '现场项目经理',
  'business': '商务',
  'safety': '安全',
  'project_manager': '项目经理',
  'mechanical_lead': '机械负责人',
  'electrical_lead': '电气负责人',
  'visual_lead': '视觉负责人',
  'software_lead': '软件负责人',
  'algorithm_lead': '算法负责人',
  'field_project_lead': '现场项目经理',
};

export default function AppPage() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [targetApprovalId, setTargetApprovalId] = useState<string | null>(null);
  const [loginTime, setLoginTime] = useState<Date | null>(null);
  const [loginDuration, setLoginDuration] = useState<string>("");

  // 使用 useCallback 包装回调函数，避免在 URLParamsHandler 中造成无限循环
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as Tab);
  }, []);

  const handleApprovalIdChange = useCallback((approvalId: string | null) => {
    setTargetApprovalId(approvalId);
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboardProjects, setDashboardProjects] = useState<Project[]>([]); // 项目看板的独立数据
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]); // 角色列表
  const [taskViewMode, setTaskViewMode] = useState<"card" | "table">("table");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // 项目物料编码搜索状态
  const [codeSearchResults, setCodeSearchResults] = useState<any[]>([]);
  const [showCodeSearchDropdown, setShowCodeSearchDropdown] = useState(false);
  const [isSearchingCodes, setIsSearchingCodes] = useState(false);
  const codeSearchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [editingCodeSearchResults, setEditingCodeSearchResults] = useState<any[]>([]);
  const [showEditingCodeSearchDropdown, setShowEditingCodeSearchDropdown] = useState(false);
  const [isSearchingEditingCodes, setIsSearchingEditingCodes] = useState(false);
  const editingCodeSearchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 看板状态
  const [dashboardType, setDashboardType] = useState<"project" | "stats">("project" as any); // 项目看板 vs 数据统计看板
  const [dashboardFilterStatus, setDashboardFilterStatus] = useState<"all" | "active" | "completed" | "paused" | "cancelled">("all");
  const [dashboardViewMode, setDashboardViewMode] = useState<"table" | "card">("table");
  const [showDashboardSearch, setShowDashboardSearch] = useState(false);
  const [dashboardSearchParams, setDashboardSearchParams] = useState({
    projectName: "",
    projectCode: "",
    year: "",
    month: "",
    startDate: "",
    endDate: "",
    projectManager: "",
    status: "",
  });

  // 看板分页状态
  const [dashboardCurrentPage, setDashboardCurrentPage] = useState(1);
  const [dashboardItemsPerPage, setDashboardItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard-items-per-page");
      if (saved) return parseInt(saved, 10);
    }
    return 10;
  });

  // 项目列表列定义（在组件内部定义以访问currentUser）
  const projectColumns: Column<Project>[] = [
    {
      key: "createdAt",
      title: "创建时间",
      width: 160,
      sortable: true,
      render: (value, row) => row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : '-'
    },
    {
      key: "projectCode",
      title: "项目编号",
      width: 120,
      sortable: true,
      render: (value, row) => (row as any).projectCode || '-'
    },
    {
      key: "name",
      title: "项目名称",
      width: 200,
      sortable: true,
      render: (value, row) => {
        const approvalStatus = (row as any).approvalStatus;

        // 计算延期天数
        let overdueInfo = null;
        if (row.status !== "completed" && row.endDate) {
          const endDate = new Date(row.endDate);
          const currentDate = new Date();
          endDate.setHours(0, 0, 0, 0);
          currentDate.setHours(0, 0, 0, 0);
          if (currentDate > endDate) {
            const diffTime = currentDate.getTime() - endDate.getTime();
            const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            overdueInfo = (
              <span className="ml-2 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                延期{overdueDays}天
              </span>
            );
          }
        }

        // 判断是否为新项目（7天内创建）
        const isNewProject = row.createdAt && new Date(row.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        return (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer underline"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('select-project', { detail: row }));
                }}
              >
                {row.name}
              </span>
              {isNewProject && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  新
                </span>
              )}
              {approvalStatus && approvalStatus.status === "pending" && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                  审批中
                </span>
              )}
              {overdueInfo}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.description}
            </div>
          </div>
        );
      }
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      sortable: true,
      render: (value, row) => {
        const { text, className } = PROJECT_STATUS_MAP[row.status] || PROJECT_STATUS_MAP.active;
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${className}`}>{text}</span>;
      }
    },
    {
      key: "customerName",
      title: "客户名称",
      width: 150,
      sortable: true,
      render: (value, row) => (row as any).customerName || '-'
    },
    {
      key: "startDate",
      title: "开始日期",
      width: 120,
      sortable: true,
      render: (value, row) => row.startDate ? new Date(row.startDate).toLocaleDateString('zh-CN') : '-'
    },
    {
      key: "endDate",
      title: "结束日期",
      width: 120,
      sortable: true,
      render: (value, row) => row.endDate ? new Date(row.endDate).toLocaleDateString('zh-CN') : '-'
    },
    {
      key: "duration",
      title: "持续时间",
      width: 100,
      sortable: false,
      render: (value, row) => calculateDuration(row.startDate, row.endDate) || '-'
    },
    {
      key: "actions",
      title: "操作",
      width: 120,
      sortable: false,
      render: (value, row) => {
        const approvalStatus = (row as any).approvalStatus;
        const approvalRequestId = (row as any).approvalRequestId;
        const isPending = approvalStatus && approvalStatus.status === "pending";
        const isApproved = approvalStatus && approvalStatus.status === "approved";
        const currentLevel = approvalStatus?.currentLevel || "";
        const isOwner = row.ownerId === currentUser?.id;

        // 判断审批状态和层级
        let canEdit = false;
        let canDelete = false;
        let canCancel = false;
        let showInApprovalMessage = false;

        if (!isPending && !isApproved) {
          // 无需审批的项目，可以进行正常操作
          canEdit = true;
          canDelete = true;
        } else if (isApproved) {
          // 审批完成，可以进行正常操作
          canEdit = true;
          canDelete = true;
        } else if (isPending && isOwner) {
          // 待审批且是项目拥有者
          if (currentLevel === "level_1") {
            // 还在一级审核前，可以撤销和修改
            canCancel = true;
            canEdit = true;
          } else {
            // 一级审核后，未完成最终审批，不能进行相关操作
            showInApprovalMessage = true;
          }
        }

        return (
          <div className="flex gap-1 items-center">
            {canEdit && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('edit-project', { detail: row }));
                }}
                className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                title="编辑"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('delete-project', { detail: row }));
                }}
                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {canCancel && approvalRequestId && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('cancel-project-approval', {
                    detail: {
                      projectId: row.id,
                      approvalRequestId: approvalRequestId
                    }
                  }));
                }}
                className="p-1.5 rounded-md text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-colors"
                title="撤销审批"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {showInApprovalMessage && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400" title="审批中">
                <Clock className="w-4 h-4" />
              </span>
            )}
          </div>
        );
      }
    }
  ];

  // 订单看板状态
  const [ordersDashboardFilterStatus, setOrdersDashboardFilterStatus] = useState<"all" | "active" | "completed" | "paused" | "cancelled">("all");
  const [ordersDashboardViewMode, setOrdersDashboardViewMode] = useState<"table" | "card">("table");
  const [showOrdersDashboardSearch, setShowOrdersDashboardSearch] = useState(false);
  const [ordersDashboardSearchParams, setOrdersDashboardSearchParams] = useState({
    year: "",
    month: "",
    startDate: "",
    endDate: "",
    customerCode: "",
    customerName: "",
  });

  // 合同看板状态
  const [contractsDashboardType, setContractsDashboardType] = useState<"contracts" | "stats">("contracts" as any); // 合同列表 vs 合同统计看板

  // 订单看板分页状态
  const [ordersDashboardCurrentPage, setOrdersDashboardCurrentPage] = useState(1);
  const [ordersDashboardItemsPerPage, setOrdersDashboardItemsPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("orders-dashboard-items-per-page");
      if (saved) return parseInt(saved, 10);
    }
    return 10;
  });

  // 项目搜索和分页状态
  const [projectSearchKeyword, setProjectSearchKeyword] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchParams, setAdvancedSearchParams] = useState({
    year: "",
    month: "",
    startDate: "",
    endDate: "",
    customerName: "",
  });
  const [projectViewMode, setProjectViewMode] = useState<"table" | "card">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditProjectForm, setShowEditProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 任务表格列宽状态
  const [taskColumnWidths, setTaskColumnWidths] = useState({
    taskCode: 120,
    title: 200,
    assignee: 150,
    status: 100,
    priority: 100,
    actions: 150,
  });

  // 任务表格排序状态
  const [taskSortField, setTaskSortField] = useState<keyof Task | "taskCode">("title");
  const [taskSortOrder, setTaskSortOrder] = useState<"asc" | "desc">("asc");

  const [systemSettings, setSystemSettings] = useState({
    companyName: "",
    companyLogo: "",
    systemVersion: "",
  });
  const [technicalProtocolDisplayUrl, setTechnicalProtocolDisplayUrl] = useState("");
  const [showUtilityTools, setShowUtilityTools] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    status: "active" as Status,
    startDate: "",
    endDate: "",
    ownerId: "",
    iconUrl: "",
    projectCode: "",
    materialCode: "",
    productName: "",
    specification: "",
    productImageUrl: "",
    customerId: "",
    customerName: "",
    technicalContactName: "",
    technicalContactPhone: "",
    technicalContactEmail: "",
    projectManager: "",
    projectManagerPhone: "",
    projectManagement: "",
    mechanicalLead: "",
    mechanicalLeadPhone: "",
    electricalLead: "",
    electricalLeadPhone: "",
    visualLead: "",
    visualLeadPhone: "",
    softwareLead: "",
    softwareLeadPhone: "",
    algorithmLead: "",
    algorithmLeadPhone: "",
    procurement: "",
    planning: "",
    production: "",
    quality: "",
    fieldProjectLead: "",
    business: "",
    safety: "",
    safetyLeadPhone: "",
    orderNumber: "",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    contractCode: "",
    contractName: "",
    contractDate: "",
    technicalProtocolUrl: "",
    progressPlan: "",
    customMembers: "",
  });
  const [taskForm, setTaskForm] = useState({
    projectId: "",
    taskCode: "",
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as Priority,
    assigneeId: "",
    assignees: "", // 多选指派人
    taskMembers: "",
    plannedStartDate: "",
    actualStartDate: "",
    plannedEndDate: "",
    actualEndDate: "",
  });
  const [editTaskForm, setEditTaskForm] = useState({
    taskCode: "",
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as Priority,
    assigneeId: "",
    assignees: "", // 多选指派人
    taskMembers: "",
    plannedStartDate: "",
    actualStartDate: "",
    plannedEndDate: "",
    actualEndDate: "",
  });
  const [editProjectForm, setEditProjectForm] = useState({
    name: "",
    description: "",
    status: "active" as Status,
    startDate: "",
    endDate: "",
    ownerId: "",
    iconUrl: "",
    projectCode: "",
    materialCode: "",
    productName: "",
    specification: "",
    productImageUrl: "",
    customerId: "",
    customerName: "",
    technicalContactName: "",
    technicalContactPhone: "",
    technicalContactEmail: "",
    projectManager: "",
    projectManagerPhone: "",
    projectManagement: "",
    mechanicalLead: "",
    mechanicalLeadPhone: "",
    electricalLead: "",
    electricalLeadPhone: "",
    visualLead: "",
    visualLeadPhone: "",
    softwareLead: "",
    softwareLeadPhone: "",
    algorithmLead: "",
    algorithmLeadPhone: "",
    procurement: "",
    planning: "",
    production: "",
    quality: "",
    fieldProjectLead: "",
    business: "",
    safety: "",
    safetyLeadPhone: "",
    orderNumber: "",
    orderDate: "",
    deliveryDate: "",
    quantity: "",
    contractCode: "",
    contractName: "",
    contractDate: "",
    technicalProtocolUrl: "",
    progressPlan: "",
    customMembers: "",
  });

  // 自定义成员管理
  const [customMembersList, setCustomMembersList] = useState<CustomMember[]>([]);
  const [newCustomMember, setNewCustomMember] = useState<CustomMember>({
    id: "",
    role: "",
    name: "",
    phone: "",
  });
  const [editingCustomMember, setEditingCustomMember] = useState<CustomMember | null>(null);
  const [showEditCustomMemberForm, setShowEditCustomMemberForm] = useState(false);
  const [roleUsers, setRoleUsers] = useState<any[]>([]); // 按角色查询的用户列表
  const [showUserDropdown, setShowUserDropdown] = useState(false); // 是否显示用户下拉列表

  // 解析customMembers JSON字符串为数组
  const parseCustomMembers = (jsonString: string): CustomMember[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  // 添加自定义成员
  const handleAddCustomMember = () => {
    if (!newCustomMember.role || !newCustomMember.name || !newCustomMember.phone) {
      alert("请填写完整的成员信息（角色、姓名、电话）");
      return;
    }

    const member: CustomMember = {
      // 为自定义成员生成唯一ID，避免与预设角色成员ID冲突
      id: newCustomMember.id ? `custom_user_${newCustomMember.id}` : `custom_${Date.now()}`,
      role: newCustomMember.role,
      name: newCustomMember.name,
      phone: newCustomMember.phone,
    };

    const updatedMembers = [...customMembersList, member];
    setCustomMembersList(updatedMembers);
    setProjectForm({ ...projectForm, customMembers: JSON.stringify(updatedMembers) });
    setNewCustomMember({ id: "", role: "", name: "", phone: "" });
    setRoleUsers([]);
    setShowUserDropdown(false);
  };

  // 删除自定义成员
  const handleDeleteCustomMember = (id: string) => {
    const updatedMembers = customMembersList.filter((m) => m.id !== id);
    setCustomMembersList(updatedMembers);
    setProjectForm({ ...projectForm, customMembers: JSON.stringify(updatedMembers) });
  };

  // 开始编辑自定义成员
  const handleEditCustomMember = (member: CustomMember) => {
    setEditingCustomMember(member);
    setShowEditCustomMemberForm(true);
  };

  // 保存编辑的自定义成员
  const handleSaveEditCustomMember = () => {
    if (!editingCustomMember) return;
    if (!editingCustomMember.role || !editingCustomMember.name || !editingCustomMember.phone) {
      alert("请填写完整的成员信息（角色、姓名、电话）");
      return;
    }

    const updatedMembers = customMembersList.map((m) =>
      m.id === editingCustomMember.id ? editingCustomMember : m
    );
    setCustomMembersList(updatedMembers);
    setProjectForm({ ...projectForm, customMembers: JSON.stringify(updatedMembers) });
    setEditingCustomMember(null);
    setShowEditCustomMemberForm(false);
  };

  // 取消编辑自定义成员
  const handleCancelEditCustomMember = () => {
    setEditingCustomMember(null);
    setShowEditCustomMemberForm(false);
  };

  // 根据角色查询用户
  const fetchUsersByRole = async (roleCode: string) => {
    if (!roleCode) {
      setRoleUsers([]);
      setShowUserDropdown(false);
      return;
    }

    try {
      // 使用roleCode查询用户
      const res = await fetch(`/api/users?role=${roleCode}`);
      const json = await res.json();
      if (json.success) {
        const users = json.data || [];
        setRoleUsers(users);
        // 如果有用户，自动显示下拉菜单
        setShowUserDropdown(users.length > 0);
      } else {
        setRoleUsers([]);
        setShowUserDropdown(false);
      }
    } catch (error) {
      console.error("Error fetching users by role:", error);
      setRoleUsers([]);
      setShowUserDropdown(false);
    }
  };

  // 选择用户后自动填充信息
  const handleUserSelect = (userId: string, userName: string, userPhone: string) => {
    setNewCustomMember({
      id: userId,
      role: newCustomMember.role,
      name: userName,
      phone: userPhone,
    });
    setShowUserDropdown(false);
  };

  // 过滤用户列表
  const getFilteredRoleUsers = () => {
    if (!newCustomMember.name) {
      return roleUsers;
    }
    return roleUsers.filter(user => 
      (user.fullName && user.fullName.toLowerCase().includes(newCustomMember.name.toLowerCase())) ||
      (user.username && user.username.toLowerCase().includes(newCustomMember.name.toLowerCase()))
    );
  };

  // 将角色代码转换为角色名称
  const getRoleDisplayName = useCallback((roleCode: string): string => {
    // 优先从 roles 数组中查找
    const role = roles.find(r => r.roleCode === roleCode);
    if (role) {
      return role.roleName;
    }
    // 如果找不到，使用全局映射
    return ROLE_CODE_MAP[roleCode] || roleCode;
  }, [roles]);

  // 获取项目成员列表（包括固定角色成员和自定义成员）
  const getProjectMembers = (project: Project | null) => {
    if (!project) return [];

    const membersMap = new Map<string, { id: string; name: string; role: string }>();

    // 固定角色成员（完整角色列表）
    const roleMap = [
      { userId: project.projectManager, role: "项目经理", phone: (project as any).projectManagerPhone },
      { userId: project.projectManagement, role: "项目管理", phone: null },
      { userId: project.mechanicalLead, role: "机械负责人", phone: (project as any).mechanicalLeadPhone },
      { userId: project.electricalLead, role: "电气负责人", phone: (project as any).electricalLeadPhone },
      { userId: project.visualLead, role: "视觉负责人", phone: (project as any).visualLeadPhone },
      { userId: project.softwareLead, role: "软件负责人", phone: (project as any).softwareLeadPhone },
      { userId: (project as any).algorithmLead, role: "算法负责人", phone: (project as any).algorithmLeadPhone },
      { userId: project.procurement, role: "采购", phone: null },
      { userId: project.planning, role: "计划", phone: null },
      { userId: project.production, role: "生产", phone: null },
      { userId: project.quality, role: "质量", phone: null },
      { userId: project.fieldProjectLead, role: "现场项目经理", phone: null },
      { userId: project.business, role: "商务", phone: null },
      { userId: project.safety, role: "安全负责人", phone: (project as any).safetyLeadPhone },
    ];

    roleMap.forEach(({ userId, role }) => {
      if (userId) {
        const user = users.find((u) => u.id === userId);
        if (user) {
          const existingMember = membersMap.get(user.id);
          if (existingMember) {
            // 如果用户已存在，合并角色
            existingMember.role = `${existingMember.role}、${role}`;
          } else {
            membersMap.set(user.id, {
              id: user.id,
              name: user.fullName || user.username,
              role,
            });
          }
        }
      }
    });

    // 自定义成员
    const customMembers = parseCustomMembers((project as any).customMembers || "");
    // 角色代码到中文名称的映射
    const roleCodeToName: Record<string, string> = {
      'projectManager': '项目经理',
      'projectManagement': '项目管理',
      'mechanicalLead': '机械负责人',
      'electricalLead': '电气负责人',
      'visualLead': '视觉负责人',
      'softwareLead': '软件负责人',
      'algorithmLead': '算法负责人',
      'procurement': '采购',
      'planning': '计划',
      'production': '生产',
      'quality': '质量',
      'fieldProjectLead': '现场项目经理',
      'business': '商务',
      'safety': '安全负责人',
    };
    customMembers.forEach((member: CustomMember) => {
      // 自定义成员的ID已经带有 custom_ 或 custom_user_ 前缀，直接使用
      // 如果是旧数据没有前缀，则添加前缀
      let customId = member.id;
      if (!customId.startsWith('custom_')) {
        customId = `custom_${member.id || member.name}`;
      }
      if (!membersMap.has(customId)) {
        // 如果角色是角色代码，转换为中文名称
        let roleName = member.role;
        if (roleCodeToName[member.role]) {
          roleName = roleCodeToName[member.role];
        }
        membersMap.set(customId, {
          id: customId,
          name: member.name,
          role: roleName,
        });
      }
    });

    return Array.from(membersMap.values());
  };

  // 处理负责人多选
  const handleTaskMembersChange = (memberId: string) => {
    const currentMembers = parseCustomMembers(taskForm.taskMembers || "");
    const isSelected = currentMembers.some((m: CustomMember) => m.id === memberId);

    let updatedMembers: CustomMember[];
    if (isSelected) {
      // 取消选择
      updatedMembers = currentMembers.filter((m: CustomMember) => m.id !== memberId);
    } else {
      // 添加选择
      const allMembers = getProjectMembers(selectedProject);
      const member = allMembers.find((m) => m.id === memberId);
      if (member) {
        updatedMembers = [
          ...currentMembers,
          {
            id: memberId,
            name: member.name,
            role: member.role,
            phone: "",
          },
        ];
      } else {
        updatedMembers = currentMembers;
      }
    }

    setTaskForm({ ...taskForm, taskMembers: JSON.stringify(updatedMembers) });
  };

  // 处理指派人多选
  const handleAssigneesChange = (memberId: string) => {
    const currentAssignees = parseCustomMembers(taskForm.assignees || "");
    const isSelected = currentAssignees.some((m: CustomMember) => m.id === memberId);

    let updatedAssignees: CustomMember[];
    if (isSelected) {
      // 取消选择
      updatedAssignees = currentAssignees.filter((m: CustomMember) => m.id !== memberId);
    } else {
      // 添加选择
      const allMembers = getProjectMembers(selectedProject);
      const member = allMembers.find((m) => m.id === memberId);
      if (member) {
        updatedAssignees = [
          ...currentAssignees,
          {
            id: memberId,
            name: member.name,
            role: member.role,
            phone: "",
          },
        ];
      } else {
        updatedAssignees = currentAssignees;
      }
    }

    setTaskForm({ ...taskForm, assignees: JSON.stringify(updatedAssignees) });
  };


  useEffect(() => {
    checkLoginStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProjects(); // 项目管理页面的数据
      fetchDashboardProjects(); // 项目看板的数据
      fetchUsers();
      fetchRoles();
      fetchCustomers();
      fetchOrders();
      fetchSystemSettings();
      fetchUserPermissions();
    }
  }, [currentUser]);

  // 确保当前Tab在用户的权限范围内
  useEffect(() => {
    if (!hasTabPermission(activeTab)) {
      // 查找第一个有权限的Tab
      const tabs: Tab[] = ["dashboard", "orders_dashboard", "projects", "tasks", "customers", "contracts", "orders", "products", "messages"];
      const firstAllowedTab = tabs.find(tab => hasTabPermission(tab));
      if (firstAllowedTab) {
        setActiveTab(firstAllowedTab);
      }
    }
  }, [userPermissions]);

  // 当选中的项目变化时，加载该项目的任务列表
  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id);
    } else {
      setTasks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // 监听项目操作事件
  useEffect(() => {
    const handleSelectProject = (e: Event) => {
      const customEvent = e as CustomEvent<Project>;
      setSelectedProject(customEvent.detail);
      setActiveTab("tasks");
    };

    const handleEditProject = (e: Event) => {
      const customEvent = e as CustomEvent<Project>;
      const project = customEvent.detail;

      // 检查审批状态，只有none、rejected状态的项目才能编辑
      const approvalStatus = (project as any).approvalStatus;
      if (approvalStatus && approvalStatus.status === "pending") {
        alert("该项目正在审批中，不允许编辑。请先撤销审批后再编辑。");
        return;
      }

      setEditingProject(project);
      setEditProjectForm({
        name: project.name,
        description: project.description || "",
        status: project.status as Status,
        startDate: formatDate(project.startDate),
        endDate: formatDate(project.endDate),
        ownerId: project.ownerId || "",
        iconUrl: project.iconUrl || "",
        projectCode: (project as any).projectCode || "",
        materialCode: (project as any).materialCode || "",
        productName: (project as any).productName || "",
        specification: (project as any).specification || "",
        productImageUrl: (project as any).productImageUrl || "",
        customerId: (project as any).customerId || "",
        customerName: (project as any).customerName || "",
        technicalContactName: (project as any).technicalContactName || "",
        technicalContactPhone: (project as any).technicalContactPhone || "",
        technicalContactEmail: (project as any).technicalContactEmail || "",
        projectManager: project.projectManager || "",
        projectManagerPhone: (project as any).projectManagerPhone || "",
        projectManagement: project.projectManagement || "",
        mechanicalLead: project.mechanicalLead || "",
        mechanicalLeadPhone: (project as any).mechanicalLeadPhone || "",
        electricalLead: project.electricalLead || "",
        electricalLeadPhone: (project as any).electricalLeadPhone || "",
        visualLead: project.visualLead || "",
        visualLeadPhone: (project as any).visualLeadPhone || "",
        softwareLead: project.softwareLead || "",
        softwareLeadPhone: (project as any).softwareLeadPhone || "",
        algorithmLead: (project as any).algorithmLead || "",
        algorithmLeadPhone: (project as any).algorithmLeadPhone || "",
        procurement: project.procurement || "",
        planning: project.planning || "",
        production: project.production || "",
        quality: project.quality || "",
        fieldProjectLead: project.fieldProjectLead || "",
        business: project.business || "",
        safety: project.safety || "",
        safetyLeadPhone: (project as any).safetyLeadPhone || "",
        orderNumber: (project as any).orderNumber || "",
        orderDate: (project as any).orderDate ? formatDate((project as any).orderDate) : "",
        deliveryDate: (project as any).deliveryDate ? formatDate((project as any).deliveryDate) : "",
        quantity: (project as any).quantity || "",
        contractCode: (project as any).contractCode || "",
        contractName: (project as any).contractName || "",
        contractDate: (project as any).contractDate ? formatDate((project as any).contractDate) : "",
        technicalProtocolUrl: (project as any).technicalProtocolUrl || "",
        progressPlan: project.progressPlan || "",
        customMembers: (project as any).customMembers || "",
      });
      setTechnicalProtocolDisplayUrl((project as any).technicalProtocolUrl || "");
      setCustomMembersList(parseCustomMembers((project as any).customMembers || ""));
      setShowEditProjectForm(true);
    };

    const handleDeleteProjectEvent = async (e: Event) => {
      const customEvent = e as CustomEvent<Project>;

      if (!currentUser) {
        alert("请先登录");
        return;
      }

      // 获取项目详情用于审批数据
      const projectRes = await fetch(`/api/projects/${customEvent.detail.id}`);
      const projectJson = await projectRes.json();
      if (!projectJson.success) {
        alert("获取项目信息失败");
        return;
      }
      const project = projectJson.data;

      if (confirm(`确定要删除这个项目吗？\n\n项目名称：${project.name}\n项目编号：${project.projectCode || '-'}\n\n此操作将提交审批，审批通过后项目将被删除！`)) {
        try {
          // 创建删除项目审批记录
          const approvalRes = await fetch("/api/project-approvals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              projectId: customEvent.detail.id,
              approvalType: "delete_project",
              applicantId: currentUser.id,
              applicantName: currentUser.username || currentUser.id,
              approvalData: {
                projectName: project.name,
                projectCode: project.projectCode,
                operation: "delete",
              },
            }),
          });

          const approvalJson = await approvalRes.json();
          if (approvalJson.success) {
            alert("删除申请已提交，等待审批");
            fetchProjects();
          } else {
            alert("提交审批失败：" + (approvalJson.error || "未知错误"));
          }
        } catch (error) {
          console.error("Error creating delete approval:", error);
          alert("提交审批失败，请稍后重试");
        }
      }
    };

    const handleCancelProjectApproval = async (e: Event) => {
      const customEvent = e as CustomEvent<{ projectId: string; approvalRequestId: string }>;

      if (!currentUser) {
        alert("请先登录");
        return;
      }

      const { projectId, approvalRequestId } = customEvent.detail;

      if (!confirm("确定要撤销该项目的审批吗？\n\n撤销后可以重新编辑并再次提交审批。")) {
        return;
      }

      try {
        const res = await fetch(`/api/project-approvals/${approvalRequestId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        const json = await res.json();
        if (json.success) {
          alert("审批已撤销");
          fetchProjects();
        } else {
          alert("撤销审批失败：" + (json.error || "未知错误"));
        }
      } catch (error) {
        console.error("Error cancelling approval:", error);
        alert("撤销审批失败，请稍后重试");
      }
    };

    window.addEventListener('select-project', handleSelectProject);
    window.addEventListener('edit-project', handleEditProject);
    window.addEventListener('delete-project', handleDeleteProjectEvent);
    window.addEventListener('cancel-project-approval', handleCancelProjectApproval);

    return () => {
      window.removeEventListener('select-project', handleSelectProject);
      window.removeEventListener('edit-project', handleEditProject);
      window.removeEventListener('delete-project', handleDeleteProjectEvent);
      window.removeEventListener('cancel-project-approval', handleCancelProjectApproval);
    };
  }, [currentUser]);

  // 保存看板分页设置到 localStorage
  useEffect(() => {
    localStorage.setItem("dashboard-items-per-page", dashboardItemsPerPage.toString());
  }, [dashboardItemsPerPage]);

  // 保存订单看板分页设置到 localStorage
  useEffect(() => {
    localStorage.setItem("orders-dashboard-items-per-page", ordersDashboardItemsPerPage.toString());
  }, [ordersDashboardItemsPerPage]);

  // 当过滤状态改变时重置页码
  useEffect(() => {
    setDashboardCurrentPage(1);
  }, [dashboardFilterStatus]);

  // 当订单看板过滤状态改变时重置页码
  useEffect(() => {
    setOrdersDashboardCurrentPage(1);
  }, [ordersDashboardFilterStatus]);

  // 监听从数据统计看板返回项目看板的事件
  useEffect(() => {
    const handleNavigateToProjectBoard = () => {
      setDashboardType("project");
    };

    window.addEventListener("navigateToProjectBoard", handleNavigateToProjectBoard);

    return () => {
      window.removeEventListener("navigateToProjectBoard", handleNavigateToProjectBoard);
    };
  }, []);

  // 监听项目看板切换，如果切换到项目看板且没有数据，则加载数据
  useEffect(() => {
    if (dashboardType === "project" && dashboardProjects.length === 0) {
      fetchDashboardProjects();
    }
  }, [dashboardType]);

  // 监听从合同统计看板返回合同管理的事件
  useEffect(() => {
    const handleNavigateToContractManagement = () => {
      setContractsDashboardType("contracts");
    };

    window.addEventListener("navigateToContractManagement", handleNavigateToContractManagement);

    return () => {
      window.removeEventListener("navigateToContractManagement", handleNavigateToContractManagement);
    };
  }, []);

  const handleAutoLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
    console.log("由于长时间无操作，已自动登出");
  };

  useAutoLogout({
    timeout: 30 * 60 * 1000, // 30分钟无操作自动登出
    onTimeout: handleAutoLogout,
    enabled: !!currentUser,
  });

  const checkLoginStatus = async () => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      
      // 验证 token 是否有效
      try {
        const res = await fetch("/api/auth/verify", { 
          credentials: "include",
          cache: "no-store" 
        });
        
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setCurrentUser(json.data);
            // 如果是新的登录，设置登录时间
            if (!loginTime) {
              const storedLoginTime = localStorage.getItem("loginTime");
              if (storedLoginTime) {
                setLoginTime(new Date(storedLoginTime));
              } else {
                const now = new Date();
                setLoginTime(now);
                localStorage.setItem("loginTime", now.toISOString());
              }
            }
          } else {
            // Token 无效，清除本地存储并跳转到登录页
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("loginTime");
            window.location.href = "/login";
            return;
          }
        } else {
          // API 请求失败，清除本地存储并跳转到登录页
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("loginTime");
          window.location.href = "/login";
          return;
        }
      } catch (error) {
        console.error("验证登录状态失败:", error);
        // 网络错误时，保留本地用户数据，等待网络恢复
        setCurrentUser(userData);
      }
    }
    setIsLoading(false);
  };

  const fetchUserPermissions = async () => {
    try {
      const res = await fetch("/api/user-permissions", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        // API返回格式: { data: { "userId": { resource: ["view","edit"] } } }
        // 优先使用当前用户的权限
        const userId = currentUser?.id;
        const perms = userId ? json.data?.[userId] : undefined;
        if (perms) {
          setUserPermissions(perms);
        } else {
          const firstUserId = Object.keys(json.data || {})[0];
          setUserPermissions(json.data?.[firstUserId] || {});
        }
      }
    } catch (error) {
      console.error("Error fetching user permissions:", error);
    }
  };

  // 更新登录时长
  useEffect(() => {
    if (!loginTime) return;

    const updateLoginDuration = () => {
      const now = new Date();
      const diff = now.getTime() - loginTime.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      setLoginDuration(`您已经登录系统${minutes}分钟`);
    };

    // 立即更新一次
    updateLoginDuration();

    // 每分钟更新一次
    const interval = setInterval(updateLoginDuration, 60000);

    return () => clearInterval(interval);
  }, [loginTime]);

  // 检查用户是否有权限查看某个Tab
  const hasTabPermission = (tab: Tab): boolean => {
    const resource = TAB_RESOURCE_MAP[tab];
    // 如果Tab不需要权限控制，返回true
    if (!resource) {
      return true;
    }
    // 系统管理员拥有所有权限
    if (currentUser?.role === "system_admin" || currentUser?.role === "SYSTEM_ADMIN") {
      return true;
    }
    // 检查用户是否有该资源的view权限
    const permissions = userPermissions[resource] || [];
    return permissions.includes("view");
  };

  // 根据用户ID获取用户名
  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return "-";
    const user = users.find((u) => u.id === userId);
    return user?.fullName || user?.username || userId;
  };

  // 过滤项目函数（与项目列表过滤逻辑一致）
  const filterProjects = (projectsToFilter: Project[]): Project[] => {
    let filteredProjects = projectsToFilter;

    // 可见性控制：只有创建者能看到待审批项目
    filteredProjects = filteredProjects.filter((p) => {
      const approvalStatus = (p as any).approvalStatus;
      const isPending = approvalStatus && approvalStatus.status === "pending";
      
      // 如果项目待审批，只有创建者可见（使用ownerId作为创建者）
      if (isPending) {
        return p.ownerId === currentUser?.id;
      }
      // 其他项目所有人可见
      return true;
    });

    // 按状态过滤
    if (dashboardFilterStatus !== "all") {
      filteredProjects = filteredProjects.filter((p) => p.status === dashboardFilterStatus);
    }

    // 按项目名称过滤
    if (dashboardSearchParams.projectName) {
      filteredProjects = filteredProjects.filter((p) => {
        return p.name.toLowerCase().includes(dashboardSearchParams.projectName.toLowerCase());
      });
    }

    // 按项目编码过滤
    if (dashboardSearchParams.projectCode) {
      filteredProjects = filteredProjects.filter((p) => {
        const code = (p as any).projectCode || "";
        return code.toLowerCase().includes(dashboardSearchParams.projectCode.toLowerCase());
      });
    }

    // 按年度过滤（仅查询startDate不为null的项目）
    if (dashboardSearchParams.year) {
      filteredProjects = filteredProjects.filter((p) => {
        if (!p.startDate) return false;
        const projectYear = new Date(p.startDate).getFullYear();
        return projectYear.toString() === dashboardSearchParams.year;
      });
    }

    // 按月度过滤
    if (dashboardSearchParams.month) {
      filteredProjects = filteredProjects.filter((p) => {
        if (!p.startDate) return false;
        const projectMonth = new Date(p.startDate).getMonth() + 1;
        return projectMonth.toString() === dashboardSearchParams.month;
      });
    }

    // 按开始日期过滤
    if (dashboardSearchParams.startDate) {
      filteredProjects = filteredProjects.filter((p) => {
        if (!p.startDate) return false;
        return new Date(p.startDate) >= new Date(dashboardSearchParams.startDate);
      });
    }

    // 按结束日期过滤
    if (dashboardSearchParams.endDate) {
      filteredProjects = filteredProjects.filter((p) => {
        if (!p.endDate) return false;
        return new Date(p.endDate) <= new Date(dashboardSearchParams.endDate);
      });
    }

    // 按项目经理过滤
    if (dashboardSearchParams.projectManager) {
      filteredProjects = filteredProjects.filter((p) => {
        const managerName = getUserName(p.projectManager);
        return managerName.toLowerCase().includes(dashboardSearchParams.projectManager.toLowerCase());
      });
    }

    // 按项目状态过滤（高级查询中的状态）
    if (dashboardSearchParams.status) {
      filteredProjects = filteredProjects.filter((p) => p.status === dashboardSearchParams.status);
    }

    // 排序逻辑：
    // 1. 新项目（7天内）排在最前面
    // 2. 待审批项目（非新项目）排在第二
    // 3. 其他项目按创建时间排序
    filteredProjects.sort((a, b) => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 判断是否为新项目（7天内创建）
      const isNewProjectA = a.createdAt && new Date(a.createdAt) >= oneWeekAgo;
      const isNewProjectB = b.createdAt && new Date(b.createdAt) >= oneWeekAgo;

      const approvalStatusA = (a as any).approvalStatus;
      const approvalStatusB = (b as any).approvalStatus;
      const isPendingA = approvalStatusA && approvalStatusA.status === "pending";
      const isPendingB = approvalStatusB && approvalStatusB.status === "pending";

      // 优先级1：新项目排在最前面
      if (isNewProjectA && !isNewProjectB) return -1;
      if (!isNewProjectA && isNewProjectB) return 1;

      // 优先级2：如果都不是新项目，待审批项目排在前面
      if (!isNewProjectA && !isNewProjectB) {
        if (isPendingA && !isPendingB) return -1;
        if (!isPendingA && isPendingB) return 1;
      }

      // 优先级3：都是新项目或都不是新项目且都不是待审批，按创建时间排序（新的在前）
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return filteredProjects;
  };

  // 订单过滤函数
  const filterOrders = (orders: any[]) => {
    let filteredOrders = [...orders];

    // 按状态过滤
    if (ordersDashboardFilterStatus !== "all") {
      filteredOrders = filteredOrders.filter((o) => o.status === ordersDashboardFilterStatus);
    }

    // 按年度过滤
    if (ordersDashboardSearchParams.year) {
      filteredOrders = filteredOrders.filter((o) => {
        if (!o.orderDate) return false;
        const orderYear = new Date(o.orderDate).getFullYear();
        return orderYear.toString() === ordersDashboardSearchParams.year;
      });
    }

    // 按月度过滤
    if (ordersDashboardSearchParams.month) {
      filteredOrders = filteredOrders.filter((o) => {
        if (!o.orderDate) return false;
        const orderMonth = new Date(o.orderDate).getMonth() + 1;
        return orderMonth.toString() === ordersDashboardSearchParams.month;
      });
    }

    // 按开始日期过滤
    if (ordersDashboardSearchParams.startDate) {
      filteredOrders = filteredOrders.filter((o) => {
        if (!o.orderDate) return false;
        return new Date(o.orderDate) >= new Date(ordersDashboardSearchParams.startDate);
      });
    }

    // 按结束日期过滤
    if (ordersDashboardSearchParams.endDate) {
      filteredOrders = filteredOrders.filter((o) => {
        if (!o.orderDate) return false;
        return new Date(o.orderDate) <= new Date(ordersDashboardSearchParams.endDate);
      });
    }

    // 按客户编码过滤
    if (ordersDashboardSearchParams.customerCode) {
      filteredOrders = filteredOrders.filter((o) => {
        return o.customerCode?.toLowerCase().includes(ordersDashboardSearchParams.customerCode.toLowerCase());
      });
    }

    // 按客户名称过滤
    if (ordersDashboardSearchParams.customerName) {
      filteredOrders = filteredOrders.filter((o) => {
        return o.customerName?.toLowerCase().includes(ordersDashboardSearchParams.customerName.toLowerCase());
      });
    }

    return filteredOrders;
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    setCurrentUser(null);
    setLoginTime(null);
    setLoginDuration("");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    // 通知水印组件用户已登出
    notifyUserChanged();
    router.push("/login");
  };

  const fetchProjects = useCallback(async (searchParams?: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    customerName?: string;
    status?: string;
  }) => {
    try {
      const params = new URLSearchParams();

      if (searchParams) {
        if (searchParams.keyword) params.append("keyword", searchParams.keyword);
        if (searchParams.year) params.append("year", searchParams.year.toString());
        if (searchParams.month) params.append("month", searchParams.month.toString());
        if (searchParams.startDate) params.append("startDate", searchParams.startDate);
        if (searchParams.endDate) params.append("endDate", searchParams.endDate);
        if (searchParams.customerName) params.append("customerName", searchParams.customerName);
        if (searchParams.status) params.append("status", searchParams.status);
      }

      const url = params.toString() ? `/api/projects?${params.toString()}` : "/api/projects";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const projects = json.data || [];
        
        // 转换项目中的图片 URL 为代理格式
        const convertedProjects = projects.map((project: any) => ({
          ...project,
          iconUrl: convertToProxyUrl(project.iconUrl),
        }));
        
        setProjects(convertedProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }, []);

  // 项目看板的独立数据获取函数
  const fetchDashboardProjects = async (searchParams?: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    customerName?: string;
    status?: string;
    projectName?: string;
    projectCode?: string;
    projectManager?: string;
  }) => {
    try {
      const params = new URLSearchParams();

      if (searchParams) {
        if (searchParams.keyword) params.append("keyword", searchParams.keyword);
        if (searchParams.year) params.append("year", searchParams.year.toString());
        if (searchParams.month) params.append("month", searchParams.month.toString());
        if (searchParams.startDate) params.append("startDate", searchParams.startDate);
        if (searchParams.endDate) params.append("endDate", searchParams.endDate);
        if (searchParams.customerName) params.append("customerName", searchParams.customerName);
        if (searchParams.status) params.append("status", searchParams.status);
        if (searchParams.projectName) params.append("projectName", searchParams.projectName);
        if (searchParams.projectCode) params.append("projectCode", searchParams.projectCode);
        if (searchParams.projectManager) params.append("projectManager", searchParams.projectManager);
      }

      const url = params.toString() ? `/api/projects?${params.toString()}` : "/api/projects";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const projects = json.data || [];
        
        // 转换项目中的图片 URL 为代理格式
        const convertedProjects = projects.map((project: any) => ({
          ...project,
          iconUrl: convertToProxyUrl(project.iconUrl),
        }));
        
        setDashboardProjects(convertedProjects);
      }
    } catch (error) {
      console.error("Error fetching dashboard projects:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles?active=true");
      if (res.ok) {
        const json = await res.json();
        setRoles(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setCustomers(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  // 搜索编码记录（支持物料编码、产品名称、规格型号模糊搜索，带防抖）
  const searchCodeRecords = (keyword: string) => {
    // 清除之前的搜索请求
    if (codeSearchTimeoutRef.current) {
      clearTimeout(codeSearchTimeoutRef.current);
    }

    if (!keyword.trim()) {
      setCodeSearchResults([]);
      setShowCodeSearchDropdown(false);
      return;
    }

    // 设置防抖延迟（300ms）
    codeSearchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingCodes(true);
      try {
        const res = await fetch(`/api/generated-codes-v2?keyword=${encodeURIComponent(keyword)}&limit=20`);
        const json = await res.json();
        if (json.data) {
          setCodeSearchResults(json.data);
          setShowCodeSearchDropdown(true);
        }
      } catch (error) {
        console.error("Error searching codes:", error);
        setCodeSearchResults([]);
        setShowCodeSearchDropdown(false);
      } finally {
        setIsSearchingCodes(false);
      }
    }, 300);
  };

  const searchEditingCodeRecords = (keyword: string) => {
    if (!keyword.trim()) {
      setEditingCodeSearchResults([]);
      return;
    }

    setIsSearchingEditingCodes(true);
    fetch(`/api/generated-codes-v2?keyword=${encodeURIComponent(keyword)}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        setEditingCodeSearchResults(data);
      })
      .catch((err) => console.error('Failed to search codes:', err))
      .finally(() => setIsSearchingEditingCodes(false));
  };

  const fetchOrders = async (searchParams?: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    customerCode?: string;
    customerName?: string;
  }) => {
    try {
      const params = new URLSearchParams();

      if (searchParams) {
        if (searchParams.keyword) params.append("keyword", searchParams.keyword);
        if (searchParams.year) params.append("year", searchParams.year.toString());
        if (searchParams.month) params.append("month", searchParams.month.toString());
        if (searchParams.startDate) params.append("startDate", searchParams.startDate);
        if (searchParams.endDate) params.append("endDate", searchParams.endDate);
        if (searchParams.customerCode) params.append("customerCode", searchParams.customerCode);
        if (searchParams.customerName) params.append("customerName", searchParams.customerName);
      }

      const url = params.toString() ? `/api/orders?${params.toString()}` : "/api/orders";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";

    let d: Date;
    if (typeof date === "string") {
      // 如果是字符串，尝试解析
      d = new Date(date);
      // 如果解析失败，返回原字符串
      if (isNaN(d.getTime())) return date;
    } else {
      d = date;
    }

    // 使用本地时区格式化为 YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // 计算项目延期天数
  const calculateOverdueDays = (project: Project | null) => {
    if (!project) return null;

    // 如果项目已完成，不算延期
    if (project.status === "completed") return null;

    // 如果没有结束日期，不算延期
    if (!project.endDate) return null;

    const endDate = typeof project.endDate === "string" ? new Date(project.endDate) : project.endDate;
    const today = new Date();

    // 设置时间为0点，只比较日期
    endDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    // 如果结束日期小于当前日期，计算延期天数
    if (endDate < today) {
      const diffTime = today.getTime() - endDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }

    return null;
  };

  // 任务排序处理
  const handleTaskSort = (field: keyof Task | "taskCode") => {
    if (taskSortField === field) {
      // 如果点击的是当前排序字段，切换排序方向
      setTaskSortOrder(taskSortOrder === "asc" ? "desc" : "asc");
    } else {
      // 如果点击的是新字段，设置新字段并升序排序
      setTaskSortField(field);
      setTaskSortOrder("asc");
    }
  };

  // 获取排序后的任务列表
  const getSortedTasks = () => {
    const sorted = [...tasks];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (taskSortField === "taskCode") {
        aValue = (a as any).taskCode || "";
        bValue = (b as any).taskCode || "";
      } else if (taskSortField === "assigneeId") {
        aValue = a.assigneeId || "";
        bValue = b.assigneeId || "";
      } else {
        aValue = a[taskSortField];
        bValue = b[taskSortField];
      }

      // 处理 null 和 undefined
      if (aValue == null) aValue = "";
      if (bValue == null) bValue = "";

      // 比较逻辑
      if (typeof aValue === "string" && typeof bValue === "string") {
        const compareResult = aValue.localeCompare(bValue, "zh-CN");
        return taskSortOrder === "asc" ? compareResult : -compareResult;
      } else {
        if (aValue < bValue) return taskSortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return taskSortOrder === "asc" ? 1 : -1;
        return 0;
      }
    });
    return sorted;
  };

  // 列宽调整处理
  const handleColumnResize = (column: keyof typeof taskColumnWidths, deltaX: number) => {
    setTaskColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(80, prev[column] + deltaX), // 最小宽度80px
    }));
  };

  const fetchTasks = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        const settings = json.data || {};
        
        // 转换图片 URL 为代理格式
        if (settings.companyLogo) {
          settings.companyLogo = convertToProxyUrl(settings.companyLogo);
        }
        
        setSystemSettings(settings);
      }
    } catch (error) {
      console.error("Error fetching system settings:", error);
    }
  };

  const handleDownloadFile = async (url: string, filename: string = "技术协议") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("下载失败，请稍后重试");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!projectForm.name || projectForm.name.trim() === "") {
      alert("项目名称不能为空");
      return;
    }

    try {
      // 准备表单数据，移除空字符串
      const formData: any = {};
      Object.keys(projectForm).forEach(key => {
        const value = projectForm[key as keyof typeof projectForm];
        // 只保留非空字符串、非null、非undefined的值
        if (value !== "" && value !== null && value !== undefined) {
          formData[key] = value;
        }
      });

      // 添加创建者ID和创建时间
      formData.ownerId = currentUser?.id;
      formData.createdAt = new Date();
      formData.updatedAt = new Date();

      // 将 customMembersList 转换为 JSON 字符串
      if (customMembersList.length > 0) {
        formData.customMembers = JSON.stringify(customMembersList);
      }

      // 系统管理员可以直接创建项目，不需要审批
      const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';

      if (isSystemAdmin) {
        // 直接创建项目，不需要审批
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });

        const json = await res.json();
        if (json.success) {
          setShowProjectForm(false);
          setProjectForm({
            name: "",
            description: "",
            status: "active",
            startDate: "",
            endDate: "",
            ownerId: "",
            iconUrl: "",
            projectCode: "",
            materialCode: "",
            productName: "",
            specification: "",
            productImageUrl: "",
            customerId: "",
            customerName: "",
            technicalContactName: "",
            technicalContactPhone: "",
            technicalContactEmail: "",
            projectManager: "",
            projectManagerPhone: "",
            projectManagement: "",
            mechanicalLead: "",
            mechanicalLeadPhone: "",
            electricalLead: "",
            electricalLeadPhone: "",
            visualLead: "",
            visualLeadPhone: "",
            softwareLead: "",
            softwareLeadPhone: "",
            algorithmLead: "",
            algorithmLeadPhone: "",
            procurement: "",
            planning: "",
            production: "",
            quality: "",
            fieldProjectLead: "",
            business: "",
            safety: "",
            safetyLeadPhone: "",
            orderNumber: "",
            orderDate: "",
            deliveryDate: "",
            quantity: "",
            contractCode: "",
            contractName: "",
            contractDate: "",
            technicalProtocolUrl: "",
            progressPlan: "",
            customMembers: "",
          });
          setCustomMembersList([]);
          setTechnicalProtocolDisplayUrl("");
          
          // 刷新项目列表
          await fetchProjects();
          
          alert("项目创建成功！");
        } else {
          alert("创建项目失败：" + (json.error || "未知错误"));
        }
      } else {
        // 普通用户需要通过审批流程
        // 先创建项目（状态为 pending_approval），再创建审批记录
        formData.approvalStatus = "pending";
        
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(formData),
        });
        
        const projectJson = await projectRes.json();
        if (!projectJson.success) {
          alert("创建项目失败：" + (projectJson.error || "未知错误"));
          return;
        }
        
        const projectId = projectJson.data.id;
        
        const approvalData = {
          projectData: formData,
          customMembers: customMembersList,
        };

        const res = await fetch("/api/project-approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            approvalType: "new_project",
            applicantId: currentUser?.id,
            applicantName: currentUser?.fullName || currentUser?.username,
            approvalData,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setShowProjectForm(false);
          setProjectForm({
            name: "",
            description: "",
            status: "active",
            startDate: "",
            endDate: "",
            ownerId: "",
            iconUrl: "",
            projectCode: "",
            materialCode: "",
            productName: "",
            specification: "",
            productImageUrl: "",
            customerId: "",
            customerName: "",
            technicalContactName: "",
            technicalContactPhone: "",
            technicalContactEmail: "",
            projectManager: "",
            projectManagerPhone: "",
            projectManagement: "",
            mechanicalLead: "",
            mechanicalLeadPhone: "",
            electricalLead: "",
            electricalLeadPhone: "",
            visualLead: "",
            visualLeadPhone: "",
            softwareLead: "",
            softwareLeadPhone: "",
            algorithmLead: "",
            algorithmLeadPhone: "",
            procurement: "",
            planning: "",
            production: "",
            quality: "",
            fieldProjectLead: "",
            business: "",
            safety: "",
            safetyLeadPhone: "",
            orderNumber: "",
            orderDate: "",
            deliveryDate: "",
            quantity: "",
            contractCode: "",
            contractName: "",
            contractDate: "",
            technicalProtocolUrl: "",
            progressPlan: "",
            customMembers: "",
          });
          setCustomMembersList([]);
          setTechnicalProtocolDisplayUrl("");
          alert("项目已创建并提交审批，等待审批通过后项目将生效！");
        } else {
          alert("提交审批失败：" + (json.error || "未知错误"));
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      alert("创建项目失败，请稍后重试");
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !currentUser) return;

    // 验证必填字段
    if (!editProjectForm.name || editProjectForm.name.trim() === "") {
      alert("项目名称不能为空");
      return;
    }

    try {
      // 准备表单数据，移除空字符串
      const formData: any = {};
      Object.keys(editProjectForm).forEach(key => {
        const value = editProjectForm[key as keyof typeof editProjectForm];
        // 只保留非空字符串、非null、非undefined的值
        if (value !== "" && value !== null && value !== undefined) {
          formData[key] = value;
        }
      });

      // 将 customMembersList 转换为 JSON 字符串
      if (customMembersList.length > 0) {
        formData.customMembers = JSON.stringify(customMembersList);
      }

      // 检测变更的字段
      const oldCustomMembers = editingProject.customMembers || "[]";
      const newCustomMembers = formData.customMembers || "[]";
      const statusChanged = formData.status && formData.status !== editingProject.status;
      const membersChanged = oldCustomMembers !== newCustomMembers;

      // 检测其他字段是否变化
      let otherFieldsChanged = false;
      const changes: any = {};
      const basicFields: (keyof typeof editProjectForm)[] = ['name', 'description', 'startDate', 'endDate', 'projectCode',
        'customerId', 'customerName', 'projectManager', 'projectManagerPhone',
        'orderNumber', 'orderDate', 'deliveryDate', 'contractCode', 'contractName'];
      basicFields.forEach(field => {
        if (formData[field] !== undefined && formData[field] !== (editingProject as any)[field]) {
          changes[field] = { old: (editingProject as any)[field], new: formData[field] };
          otherFieldsChanged = true;
        }
      });

      // 如果没有任何变化，提示用户
      if (!statusChanged && !membersChanged && !otherFieldsChanged) {
        alert("没有任何变更，无需提交审批");
        return;
      }

      // 创建审批记录
      let approvalType = "";
      let approvalData: any = {};

      if (statusChanged) {
        approvalType = "status_change";
        approvalData = {
          newStatus: formData.status,
          oldStatus: editingProject.status,
          projectName: editingProject.name,
          projectCode: editingProject.projectCode,
        };
      } else if (membersChanged) {
        approvalType = "member_change";
        approvalData = {
          customMembers: formData.customMembers,
          oldCustomMembers: oldCustomMembers,
          projectName: editingProject.name,
          projectCode: editingProject.projectCode,
        };
      } else if (otherFieldsChanged) {
        approvalType = "edit_project";
        approvalData = {
          updates: changes,
          projectName: editingProject.name,
          projectCode: editingProject.projectCode,
        };
      }

      // 创建审批记录
      const approvalRes = await fetch("/api/project-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectId: editingProject.id,
          approvalType: approvalType,
          applicantId: currentUser.id,
          applicantName: currentUser.username || currentUser.id,
          approvalData: approvalData,
        }),
      });

      const approvalJson = await approvalRes.json();
      if (approvalJson.success) {
        alert("修改申请已提交，等待审批");
        setShowEditProjectForm(false);
        setEditingProject(null);
        fetchProjects();
      } else {
        alert("提交审批失败：" + (approvalJson.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error updating project:", error);
      alert("更新项目失败，请稍后重试");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
        await fetchProjects();
        alert("项目删除成功！");
      } else {
        alert("删除失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("删除项目失败，请稍后重试");
    }
  };

  // 高级查询处理函数
  const handleAdvancedSearch = async (params: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    await fetchProjects(params);
  };

  // 重置高级查询
  const handleResetSearch = async () => {
    setAdvancedSearchParams({
      year: "",
      month: "",
      startDate: "",
      endDate: "",
      customerName: "",
    });
    setProjectSearchKeyword("");
    setCurrentPage(1);
    await fetchProjects(); // 不带参数，获取所有项目
  };

  // 执行搜索
  const handleSearch = async () => {
    const params: any = {};
    if (projectSearchKeyword.trim()) params.keyword = projectSearchKeyword.trim();
    if (advancedSearchParams.year) params.year = parseInt(advancedSearchParams.year);
    if (advancedSearchParams.month) params.month = parseInt(advancedSearchParams.month);
    if (advancedSearchParams.startDate) params.startDate = advancedSearchParams.startDate;
    if (advancedSearchParams.endDate) params.endDate = advancedSearchParams.endDate;
    if (advancedSearchParams.customerName) params.customerName = advancedSearchParams.customerName;

    setCurrentPage(1);
    await fetchProjects(params);
  };

  // Excel导出
  const handleExportProjects = async () => {
    try {
      window.location.href = '/api/projects/export';
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败');
    }
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      window.location.href = '/api/projects/template';
    } catch (error) {
      console.error('Template download error:', error);
      alert('下载模板失败');
    }
  };

  // 处理导入文件选择
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // 执行导入
  const handleImportProjects = async () => {
    if (!importFile) {
      alert('请选择要导入的文件');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        const { total, created, failed, failedProjects } = json.data;
        let message = `导入完成！\n总计：${total} 条\n成功：${created} 条\n失败：${failed} 条`;

        if (failedProjects && failedProjects.length > 0) {
          message += '\n\n失败详情：\n';
          failedProjects.forEach((fp: any, index: number) => {
            message += `${index + 1}. ${fp.data.name || '未命名'}: ${fp.error}\n`;
          });
        }

        alert(message);
        setShowImportModal(false);
        setImportFile(null);
        await fetchProjects();
      } else {
        alert('导入失败：' + (json.error || '未知错误'));
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败，请稍后重试');
    }
  };

  // 分页计算
  const getPaginatedProjects = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + parseInt(itemsPerPage.toString());
    return projects.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(projects.length / parseInt(itemsPerPage.toString()));

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      console.error("[handleCreateTask] No project selected");
      alert("请先选择一个项目");
      return;
    }

    console.log("[handleCreateTask] Selected project:", selectedProject);
    console.log("[handleCreateTask] Task form data:", taskForm);

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(taskForm),
      });

      console.log("[handleCreateTask] Response status:", res.status);

      const json = await res.json();
      console.log("[handleCreateTask] Response JSON:", json);

      if (json.success) {
        setShowTaskForm(false);
        setTaskForm({
          projectId: "",
          taskCode: "",
          title: "",
          description: "",
          status: "todo",
          priority: "medium",
          assigneeId: "",
          assignees: "",
          taskMembers: "",
          plannedStartDate: "",
          actualStartDate: "",
          plannedEndDate: "",
          actualEndDate: "",
        });
        await fetchTasks(selectedProject.id);
        alert("任务创建成功！");
      } else {
        console.error("[handleCreateTask] API error:", json);
        alert("创建失败：" + (json.error || "未知错误") + (json.details ? `\n详细信息: ${json.details}` : ""));
      }
    } catch (error) {
      console.error("[handleCreateTask] Network error:", error);
      alert("创建任务失败，请稍后重试");
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      // 过滤空值
      const updateData = Object.fromEntries(
        Object.entries(editTaskForm).filter(([_, value]) => value !== "" && value !== null && value !== undefined)
      );

      console.log("Updating task with data:", updateData);

      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      const json = await res.json();

      console.log("Update response:", json);

      if (json.success) {
        setShowEditTaskForm(false);
        setEditingTask(null);
        if (selectedProject) {
          await fetchTasks(selectedProject.id);
        }
        alert("任务更新成功！");
      } else {
        alert("更新失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error updating task:", error);
      alert("更新任务失败，请稍后重试");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("确定要删除这个任务吗？")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) {
        if (selectedProject) {
          await fetchTasks(selectedProject.id);
        }
        alert("任务删除成功！");
      } else {
        alert("删除失败：" + (json.error || "未知错误"));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("删除任务失败，请稍后重试");
    }
  };

  if (!currentUser && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h1 className="text-3xl font-bold text-red-600 mb-4">项目管理系统</h1>
            <p className="text-gray-600 mb-8">请登录以访问系统</p>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition"
            >
              登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 处理 URL 参数的组件 */}
      <Suspense fallback={null}>
        <URLParamsHandler
          onTabChange={handleTabChange}
          onApprovalIdChange={handleApprovalIdChange}
        />
      </Suspense>

      {/* APP下载二维码组件 */}
      <AppDownloadQRCode appVersion={systemSettings.systemVersion || "1.0.0"} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 跑马灯 - 固定在顶部 */}
        <div className="fixed top-0 left-0 right-0 z-50 h-6 sm:h-8 overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center justify-center h-full animate-marquee whitespace-nowrap">
            <span className="text-xs sm:text-sm text-white font-medium">
              今天是{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '年').replace(/\//, '月') + '日'} 欢迎{currentUser?.fullName || currentUser?.username}用户使用{systemSettings.companyName}项目管理系统，当前系统版本号：{systemSettings.systemVersion || "1.0.0"}
            </span>
          </div>
        </div>

        {/* 主容器 - 添加顶部padding以避开跑马灯 */}
        <div className="container mx-auto px-2 sm:px-4 md:px-8 pt-8 sm:pt-10 pb-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-2">
          <div className="flex items-center gap-2">
            {systemSettings.companyLogo && (
              <img
                src={systemSettings.companyLogo}
                alt="公司Logo"
                className="h-16 w-16 sm:h-24 sm:w-24 md:h-32 md:w-32 rounded object-contain"
              />
            )}
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {systemSettings.companyName}项目管理系统
              </h1>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                版本号: {systemSettings.systemVersion || "1.0.0"}
              </div>
            </div>
          </div>
          
          {/* 桌面端显示的按钮组 */}
          <div className="hidden sm:flex flex-wrap items-center gap-1.5">
            <LanguageSwitcher currentLocale={locale} />
            <MessageNotification
              userId={currentUser?.id || ""}
              onClick={() => setActiveTab("messages")}
            />
            <button
              onClick={() => setShowUtilityTools(true)}
              className="text-xs rounded border border-purple-300 bg-purple-50 px-3 py-1.5 text-purple-600 hover:bg-purple-100 dark:border-purple-600 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40"
            >
              实用工具
            </button>
            <div className="text-right text-sm">
              <div className="font-medium text-gray-900 dark:text-white">
                {currentUser?.fullName || currentUser?.username}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {currentUser?.role === "system_admin"
                  ? "系统管理员"
                  : UserRoleDisplayNames[currentUser?.role as keyof typeof UserRoleDisplayNames] || "项目成员"}
              </div>
              {loginDuration && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  {loginDuration}
                </div>
              )}
            </div>
            <button
              onClick={() => router.push("/user-profile")}
              className="text-xs rounded border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
            >
              个人中心
            </button>
            {currentUser?.role === UserRole.SYSTEM_ADMIN && (
              <button
                onClick={() => router.push("/admin")}
                className="text-xs rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-blue-600 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
              >
                后台管理
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-xs rounded border border-red-300 bg-white px-3 py-1.5 text-red-600 hover:bg-red-50 dark:border-red-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900"
            >
              退出登录
            </button>
          </div>
          
          {/* 移动端显示的用户信息和菜单按钮 */}
          <div className="sm:hidden flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {currentUser?.fullName || currentUser?.username}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({currentUser?.role === "system_admin" ? "管理员" : "用户"})
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MessageNotification
                userId={currentUser?.id || ""}
                onClick={() => setActiveTab("messages")}
              />
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              >
                {showMobileMenu ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* 移动端下拉菜单 */}
        {showMobileMenu && (
          <div className="sm:hidden mb-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { router.push("/user-profile"); setShowMobileMenu(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                个人中心
              </button>
              <button
                onClick={() => { setShowUtilityTools(true); setShowMobileMenu(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                实用工具
              </button>
              {currentUser?.role === UserRole.SYSTEM_ADMIN && (
                <button
                  onClick={() => { router.push("/admin"); setShowMobileMenu(false); }}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  后台管理
                </button>
              )}
              <LanguageSwitcher currentLocale={locale} />
              <button
                onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 col-span-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </div>
          </div>
        )}

        {/* Tabs - 固定在跑马灯下方 */}
        <div className="sticky top-6 sm:top-8 z-40 bg-gray-50 dark:bg-gray-900 mb-2 sm:mb-3 border-b border-gray-200 dark:border-gray-700">
          {/* 桌面端导航 */}
          <nav className="hidden sm:flex flex-wrap justify-center gap-1 overflow-x-auto">
            {hasTabPermission("dashboard") && (
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "dashboard"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                项目看板
              </button>
            )}
            {hasTabPermission("projects") && (
              <button
                onClick={() => setActiveTab("projects")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "projects"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                项目管理 ({projects.length})
              </button>
            )}

            {selectedProject && hasTabPermission("tasks") && (
              <button
                onClick={() => setActiveTab("tasks")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "tasks"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                项目详情
              </button>
            )}
            {hasTabPermission("contracts") && (
              <button
                onClick={() => setActiveTab("contracts_dashboard")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "contracts_dashboard"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                合同看板
              </button>
            )}
            {hasTabPermission("contracts") && (
              <button
                onClick={() => setActiveTab("contracts")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "contracts"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                合同管理
              </button>
            )}
            {hasTabPermission("orders") && (
              <button
                onClick={() => setActiveTab("orders_dashboard")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "orders_dashboard"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                订单看板
              </button>
            )}
            {hasTabPermission("orders") && (
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "orders"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                订单管理
              </button>
            )}
            {hasTabPermission("customers") && (
              <button
                onClick={() => setActiveTab("customers")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "customers"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                客户管理
              </button>
            )}
            {hasTabPermission("products") && (
              <button
                onClick={() => setActiveTab("products")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "products"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                产品管理
              </button>
            )}
            {hasTabPermission("deliveries") && (
              <button
                onClick={() => setActiveTab("deliveries")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "deliveries"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                送货管理
              </button>
            )}
            {hasTabPermission("knowledge_base") && (
              <button
                onClick={() => setActiveTab("knowledge_base")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "knowledge_base"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                知识库
              </button>
            )}
            <button
              onClick={() => setActiveTab("task_profile")}
              className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                activeTab === "task_profile"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              任务画像
            </button>
            {hasTabPermission("messages") && (
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "messages"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                消息中心
              </button>
            )}
            {hasTabPermission("approvals") && (
              <button
                onClick={() => setActiveTab("approvals")}
                className={`px-4 py-3 border-b-2 text-2xl font-medium transition-colors whitespace-nowrap ${
                  activeTab === "approvals"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                项目审批
              </button>
            )}
          </nav>
          
          {/* 移动端底部导航 */}
          <nav className="sm:hidden overflow-x-auto -mx-2 px-2 pb-1">
            <div className="flex gap-1 min-w-max">
              {hasTabPermission("dashboard") && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "dashboard"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  项目看板
                </button>
              )}
              {hasTabPermission("projects") && (
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "projects"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  项目管理
                </button>
              )}
              {selectedProject && hasTabPermission("tasks") && (
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "tasks"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  项目详情
                </button>
              )}
              {hasTabPermission("contracts") && (
                <button
                  onClick={() => setActiveTab("contracts_dashboard")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "contracts_dashboard" || activeTab === "contracts"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  合同
                </button>
              )}
              {hasTabPermission("orders") && (
                <button
                  onClick={() => setActiveTab("orders_dashboard")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "orders_dashboard" || activeTab === "orders"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  订单
                </button>
              )}
              {hasTabPermission("customers") && (
                <button
                  onClick={() => setActiveTab("customers")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "customers"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  客户
                </button>
              )}
              {hasTabPermission("products") && (
                <button
                  onClick={() => setActiveTab("products")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "products"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  产品
                </button>
              )}
              {hasTabPermission("deliveries") && (
                <button
                  onClick={() => setActiveTab("deliveries")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "deliveries"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  送货
                </button>
              )}
              {hasTabPermission("approvals") && (
                <button
                  onClick={() => setActiveTab("approvals")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "approvals"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  审批
                </button>
              )}
              {hasTabPermission("knowledge_base") && (
                <button
                  onClick={() => setActiveTab("knowledge_base")}
                  className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === "knowledge_base"
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  知识库
                </button>
              )}
              <button
                onClick={() => setActiveTab("task_profile")}
                className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === "task_profile"
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                    : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                任务画像
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 dark:bg-gray-800 dark:shadow-gray-900/50">

          {activeTab === "dashboard" && dashboardType === "project" && (
            <div>
              {/* 看板头部 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardType === "project" ? "项目管理看板" : "数据统计看板"}
                  </h2>
                  {/* Dashboard 类型切换 */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                    <button
                      onClick={() => setDashboardType("project")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        dashboardType === "project"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      项目看板
                    </button>
                    <button
                      onClick={() => setDashboardType("stats" as any)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        // @ts-ignore
                        dashboardType === "stats"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      数据统计
                    </button>
                  </div>
                </div>
                {dashboardType === "project" && (
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                    <button
                      onClick={() => setDashboardViewMode("table")}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        dashboardViewMode === "table"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    表格视图
                  </button>
                  <button
                    onClick={() => setDashboardViewMode("card")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      dashboardViewMode === "card"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    卡片视图
                  </button>
                  </div>
                )}
              </div>

              {/* 项目统计卡片 - 可点击过滤 */}
              {(() => {
                const filteredProjectsForStats = filterProjects(dashboardProjects);
                const activeCount = dashboardProjects.filter((p) => p.status === "active").length;
                const completedCount = dashboardProjects.filter((p) => p.status === "completed").length;
                const pausedCount = dashboardProjects.filter((p) => p.status === "paused").length;
                const cancelledCount = dashboardProjects.filter((p) => p.status === "cancelled").length;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    <div
                      onClick={() => setDashboardFilterStatus("all")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        dashboardFilterStatus === "all"
                          ? "bg-blue-100 dark:bg-blue-900/40 border-blue-500 dark:border-blue-400 shadow-md"
                          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📊</span>
                        <div className="text-xs text-blue-600 dark:text-blue-400">项目总数</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{filteredProjectsForStats.length}</div>
                    </div>
                    <div
                      onClick={() => setDashboardFilterStatus("active")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        dashboardFilterStatus === "active"
                          ? "bg-green-100 dark:bg-green-900/40 border-green-500 dark:border-green-400 shadow-md"
                          : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🚀</span>
                        <div className="text-xs text-green-600 dark:text-green-400">进行中</div>
                      </div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {activeCount}
                      </div>
                    </div>
                    <div
                      onClick={() => setDashboardFilterStatus("completed")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        dashboardFilterStatus === "completed"
                          ? "bg-gray-100 dark:bg-gray-600/40 border-gray-500 dark:border-gray-400 shadow-md"
                          : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✅</span>
                        <div className="text-xs text-gray-600 dark:text-gray-400">已完成</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {completedCount}
                      </div>
                    </div>
                    <div
                      onClick={() => setDashboardFilterStatus("paused")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        dashboardFilterStatus === "paused"
                          ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 dark:border-yellow-400 shadow-md"
                          : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">⏸️</span>
                        <div className="text-xs text-yellow-600 dark:text-yellow-400">已暂停</div>
                      </div>
                      <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                        {pausedCount}
                      </div>
                    </div>
                    <div
                      onClick={() => setDashboardFilterStatus("cancelled")}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        dashboardFilterStatus === "cancelled"
                          ? "bg-red-100 dark:bg-red-900/40 border-red-500 dark:border-red-400 shadow-md"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">❌</span>
                        <div className="text-xs text-red-600 dark:text-red-400">已取消</div>
                      </div>
                      <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                        {cancelledCount}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 高级查询 */}
              <div className="mb-6">
                <button
                  onClick={() => setShowDashboardSearch(!showDashboardSearch)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  {showDashboardSearch ? "收起查询" : "高级查询"}
                </button>
                {showDashboardSearch && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          项目名称
                        </label>
                        <input
                          type="text"
                          value={dashboardSearchParams.projectName}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, projectName: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="输入项目名称"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          项目编号
                        </label>
                        <input
                          type="text"
                          value={dashboardSearchParams.projectCode}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, projectCode: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="输入项目编号"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          年度
                        </label>
                        <input
                          type="number"
                          value={dashboardSearchParams.year}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, year: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="例如：2024"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          月度
                        </label>
                        <select
                          value={dashboardSearchParams.month}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, month: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">全部</option>
                          <option value="1">1月</option>
                          <option value="2">2月</option>
                          <option value="3">3月</option>
                          <option value="4">4月</option>
                          <option value="5">5月</option>
                          <option value="6">6月</option>
                          <option value="7">7月</option>
                          <option value="8">8月</option>
                          <option value="9">9月</option>
                          <option value="10">10月</option>
                          <option value="11">11月</option>
                          <option value="12">12月</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          开始日期
                        </label>
                        <input
                          type="date"
                          value={dashboardSearchParams.startDate}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, startDate: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          结束日期
                        </label>
                        <input
                          type="date"
                          value={dashboardSearchParams.endDate}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, endDate: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          项目经理
                        </label>
                        <input
                          type="text"
                          value={dashboardSearchParams.projectManager}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, projectManager: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="输入姓名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          项目状态
                        </label>
                        <select
                          value={dashboardSearchParams.status}
                          onChange={(e) =>
                            setDashboardSearchParams({ ...dashboardSearchParams, status: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">全部状态</option>
                          <option value="active">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="paused">已暂停</option>
                          <option value="cancelled">已取消</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setDashboardSearchParams({
                            projectName: "",
                            projectCode: "",
                            year: "",
                            month: "",
                            startDate: "",
                            endDate: "",
                            projectManager: "",
                            status: "",
                          });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        查询
                      </button>
                      <button
                        onClick={() => {
                          setDashboardSearchParams({
                            projectName: "",
                            projectCode: "",
                            year: "",
                            month: "",
                            startDate: "",
                            endDate: "",
                            projectManager: "",
                            status: "",
                          });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 项目列表 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {dashboardFilterStatus === "all"
                    ? "所有项目"
                    : dashboardFilterStatus === "active"
                    ? "进行中项目"
                    : dashboardFilterStatus === "completed"
                    ? "已完成项目"
                    : "已暂停项目"}
                </h3>

                {/* 过滤项目 */}
                {(() => {
                  const filteredProjects = filterProjects(dashboardProjects);

                  return (
                    <>
                      {filteredProjects.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">暂无项目</div>
                      ) : dashboardViewMode === "table" ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  项目编号
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  项目名称
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  状态
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  项目经理
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  开始日期
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                  结束日期
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {filteredProjects
                                .slice((dashboardCurrentPage - 1) * dashboardItemsPerPage, dashboardCurrentPage * dashboardItemsPerPage)
                                .map((project) => (
                                <tr
                                  key={project.id}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setActiveTab("tasks");
                                  }}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                    {project.projectCode || "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span>{project.name}</span>
                                      {getOverdueDays(project) && (
                                        <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                                          延期{getOverdueDays(project)}天
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        project.status === "active"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                          : project.status === "completed"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                      }`}
                                    >
                                      {project.status === "active"
                                        ? "进行中"
                                        : project.status === "completed"
                                        ? "已完成"
                                        : "已暂停"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {getUserName(project.projectManager)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {project.startDate ? new Date(project.startDate).toLocaleDateString("zh-CN") : "-"}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {project.endDate ? new Date(project.endDate).toLocaleDateString("zh-CN") : "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* 表格分页控件 */}
                          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 dark:text-gray-400">每页显示：</span>
                              <select
                                value={dashboardItemsPerPage}
                                onChange={(e) => {
                                  const newSize = parseInt(e.target.value, 10);
                                  setDashboardItemsPerPage(newSize);
                                  setDashboardCurrentPage(1);
                                }}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              >
                                <option value="10">10 条</option>
                                <option value="20">20 条</option>
                                <option value="50">50 条</option>
                                <option value="100">100 条</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">共 {filteredProjects.length} 条记录</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setDashboardCurrentPage(1)}
                                  disabled={dashboardCurrentPage === 1}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                                >
                                  首页
                                </button>
                                <button
                                  onClick={() => setDashboardCurrentPage((prev) => Math.max(1, prev - 1))}
                                  disabled={dashboardCurrentPage === 1}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                                >
                                  上一页
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  第 {dashboardCurrentPage} / {Math.ceil(filteredProjects.length / dashboardItemsPerPage) || 1} 页
                                </span>
                                <button
                                  onClick={() => setDashboardCurrentPage((prev) => Math.min(Math.ceil(filteredProjects.length / dashboardItemsPerPage) || 1, prev + 1))}
                                  disabled={dashboardCurrentPage >= Math.ceil(filteredProjects.length / dashboardItemsPerPage)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                                >
                                  下一页
                                </button>
                                <button
                                  onClick={() => setDashboardCurrentPage(Math.ceil(filteredProjects.length / dashboardItemsPerPage) || 1)}
                                  disabled={dashboardCurrentPage >= Math.ceil(filteredProjects.length / dashboardItemsPerPage)}
                                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                                >
                                  末页
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredProjects
                            .slice((dashboardCurrentPage - 1) * dashboardItemsPerPage, dashboardCurrentPage * dashboardItemsPerPage)
                            .map((project) => (
                            <div
                              key={project.id}
                              onClick={() => {
                                setSelectedProject(project);
                                setActiveTab("tasks");
                              }}
                              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                                    {getOverdueDays(project) && (
                                      <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                                        延期{getOverdueDays(project)}天
                                      </span>
                                    )}
                                  </div>
                                  {project.projectCode && (
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                      编号: {project.projectCode}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    project.status === "active"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      : project.status === "completed"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  }`}
                                >
                                  {project.status === "active"
                                    ? "进行中"
                                    : project.status === "completed"
                                    ? "已完成"
                                    : "已暂停"}
                                </span>
                              </div>

                              {project.description && (
                                <div className="mb-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="line-clamp-2">{project.description}</span>
                                </div>
                              )}

                              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <span>经理: {getUserName(project.projectManager)}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{project.startDate ? new Date(project.startDate).toLocaleDateString("zh-CN") : "-"} ~ {project.endDate ? new Date(project.endDate).toLocaleDateString("zh-CN") : "-"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 数据统计看板 */}
          {activeTab === "dashboard" && dashboardType === "stats" && (
            <Dashboard />
          )}

          {activeTab === "projects" && (
            <div>
              {/* 项目管理头部 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">项目管理</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setCustomMembersList([]);
                      setShowProjectForm(true);
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
                  >
                    新建项目
                  </button>
                  <button
                    onClick={handleExportProjects}
                    className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-sm"
                  >
                    导出Excel
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-sm"
                  >
                    导入Excel
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-sm"
                  >
                    下载模板
                  </button>
                </div>
              </div>

              {/* 搜索和筛选 */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="模糊搜索：项目名称、编号、成员等"
                    value={projectSearchKeyword}
                    onChange={(e) => setProjectSearchKeyword(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
                  >
                    搜索
                  </button>
                  <button
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className="rounded-md bg-gray-600 px-6 py-2 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                  >
                    {showAdvancedSearch ? '收起' : '高级查询'}
                  </button>
                  <button
                    onClick={handleResetSearch}
                    className="rounded-md border border-gray-300 bg-white px-6 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 text-sm"
                  >
                    重置
                  </button>
                </div>

                {/* 高级查询表单 */}
                {showAdvancedSearch && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年度</label>
                        <input
                          type="number"
                          placeholder="例如：2024"
                          value={advancedSearchParams.year}
                          onChange={(e) => setAdvancedSearchParams({ ...advancedSearchParams, year: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">月度</label>
                        <input
                          type="number"
                          placeholder="1-12"
                          min="1"
                          max="12"
                          value={advancedSearchParams.month}
                          onChange={(e) => setAdvancedSearchParams({ ...advancedSearchParams, month: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开始日期</label>
                        <input
                          type="date"
                          value={advancedSearchParams.startDate}
                          onChange={(e) => setAdvancedSearchParams({ ...advancedSearchParams, startDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">结束日期</label>
                        <input
                          type="date"
                          value={advancedSearchParams.endDate}
                          onChange={(e) => setAdvancedSearchParams({ ...advancedSearchParams, endDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">客户名称</label>
                        <input
                          type="text"
                          placeholder="输入客户名称"
                          value={advancedSearchParams.customerName}
                          onChange={(e) => setAdvancedSearchParams({ ...advancedSearchParams, customerName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 视图切换和每页显示条数 */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                  <button
                    onClick={() => setProjectViewMode('table')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      projectViewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    表格视图
                  </button>
                  <button
                    onClick={() => setProjectViewMode('card')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      projectViewMode === 'card'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    卡片视图
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">每页显示：</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    共 {projects.length} 条
                  </span>
                </div>
              </div>

              {/* 项目列表 - 表格视图 */}
              {projectViewMode === 'table' && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <ResizableTable
                    columns={projectColumns}
                    data={getPaginatedProjects()}
                    storageKey="projects"
                  />
                </div>
              )}

              {/* 项目列表 - 卡片视图 */}
              {projectViewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getPaginatedProjects().map((project) => (
                    <div key={project.id} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                            {getOverdueDays(project) && (
                              <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full dark:text-red-400 dark:bg-red-900/30">
                                延期{getOverdueDays(project)}天
                              </span>
                            )}
                          </div>
                          {(project as any).projectCode && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              编号: {(project as any).projectCode}
                            </p>
                          )}
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          project.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          project.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {project.status === 'completed' ? '已完成' :
                           project.status === 'cancelled' ? '已取消' :
                           project.status === 'paused' ? '已暂停' : '进行中'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        {(project as any).customerName && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{(project as any).customerName}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(project.startDate)} ~ {formatDate(project.endDate)}</span>
                        </div>
                        {project.description && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="line-clamp-2">{project.description}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setActiveTab("tasks");
                          }}
                          className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => {
                            setEditingProject(project);
                            // 这里应该填充editProjectForm，简化处理省略
                            setShowEditProjectForm(true);
                          }}
                          className="rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => {
                            // 触发删除项目审批事件
                            const event = new CustomEvent('delete-project', { detail: project });
                            window.dispatchEvent(event);
                          }}
                          className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                  >
                    末页
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "tasks" && selectedProject && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedProject(null);
                      setActiveTab("dashboard");
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    返回
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(selectedProject as any).projectCode ? `${(selectedProject as any).projectCode} - ` : ''}{selectedProject.name} - 项目详情
                  </h2>
                </div>
              </div>

              {/* 项目基本信息卡片 */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目基本信息</h3>

                {/* 项目延期警告 */}
                {calculateOverdueDays(selectedProject) && (
                  <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                      <svg className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                        项目延期{calculateOverdueDays(selectedProject)}天
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">项目编码：</span>
                    <span className="text-gray-900 dark:text-white ml-2">{(selectedProject as any).projectCode || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">项目状态：</span>
                    <span className={`ml-2 ${
                      selectedProject.status === 'active' ? 'text-blue-600 dark:text-blue-400' :
                      selectedProject.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {selectedProject.status === 'active' ? '进行中' :
                       selectedProject.status === 'completed' ? '已完成' : '已暂停'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">开始日期：</span>
                    <span className="text-gray-900 dark:text-white ml-2">{formatDate(selectedProject.startDate) || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">结束日期：</span>
                    <span className="text-gray-900 dark:text-white ml-2">{formatDate(selectedProject.endDate) || '-'}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <span className="text-gray-600 dark:text-gray-400">客户名称：</span>
                    <span className="text-gray-900 dark:text-white ml-2">{(selectedProject as any).customerName || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 项目成员信息卡片 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">项目成员信息</h3>
                  <button
                    onClick={() => {
                      setEditingProject(selectedProject);
                      // 设置编辑项目表单的值
                      setEditProjectForm({
                        name: selectedProject.name || "",
                        description: selectedProject.description || "",
                        status: selectedProject.status as Status,
                        startDate: formatDate(selectedProject.startDate),
                        endDate: formatDate(selectedProject.endDate),
                        ownerId: selectedProject.ownerId || "",
                        iconUrl: selectedProject.iconUrl || "",
                        projectCode: (selectedProject as any).projectCode || "",
                        materialCode: (selectedProject as any).materialCode || "",
                        productName: (selectedProject as any).productName || "",
                        specification: (selectedProject as any).specification || "",
                        productImageUrl: (selectedProject as any).productImageUrl || "",
                        customerId: (selectedProject as any).customerId || "",
                        customerName: (selectedProject as any).customerName || "",
                        technicalContactName: (selectedProject as any).technicalContactName || "",
                        technicalContactPhone: (selectedProject as any).technicalContactPhone || "",
                        technicalContactEmail: (selectedProject as any).technicalContactEmail || "",
                        projectManager: selectedProject.projectManager || "",
                        projectManagerPhone: (selectedProject as any).projectManagerPhone || "",
                        projectManagement: selectedProject.projectManagement || "",
                        mechanicalLead: selectedProject.mechanicalLead || "",
                        mechanicalLeadPhone: (selectedProject as any).mechanicalLeadPhone || "",
                        electricalLead: selectedProject.electricalLead || "",
                        electricalLeadPhone: (selectedProject as any).electricalLeadPhone || "",
                        visualLead: selectedProject.visualLead || "",
                        visualLeadPhone: (selectedProject as any).visualLeadPhone || "",
                        softwareLead: selectedProject.softwareLead || "",
                        softwareLeadPhone: (selectedProject as any).softwareLeadPhone || "",
                        algorithmLead: (selectedProject as any).algorithmLead || "",
                        algorithmLeadPhone: (selectedProject as any).algorithmLeadPhone || "",
                        procurement: selectedProject.procurement || "",
                        planning: selectedProject.planning || "",
                        production: selectedProject.production || "",
                        quality: selectedProject.quality || "",
                        fieldProjectLead: selectedProject.fieldProjectLead || "",
                        business: selectedProject.business || "",
                        safety: selectedProject.safety || "",
                        safetyLeadPhone: (selectedProject as any).safetyLeadPhone || "",
                        orderNumber: (selectedProject as any).orderNumber || "",
                        orderDate: formatDate((selectedProject as any).orderDate),
                        deliveryDate: formatDate((selectedProject as any).deliveryDate),
                        quantity: (selectedProject as any).quantity || "",
                        contractCode: (selectedProject as any).contractCode || "",
                        contractName: (selectedProject as any).contractName || "",
                        contractDate: formatDate((selectedProject as any).contractDate),
                        technicalProtocolUrl: (selectedProject as any).technicalProtocolUrl || "",
                        progressPlan: (selectedProject as any).progressPlan || "",
                        customMembers: (selectedProject as any).customMembers || "",
                      });
                      setShowEditProjectForm(true);
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
                  >
                    编辑成员
                  </button>
                </div>
                
                {/* 项目成员统一列表 */}
                <div className="space-y-3">
                  {(() => {
                    // 收集所有成员
                    const allMembers: Array<{ role: string; name: string; phone: string }> = [];
                    
                    // 预设角色
                    const roles = [
                      { key: 'projectManager', label: '项目经理', phoneKey: 'projectManagerPhone' },
                      { key: 'projectManagement', label: '项目管理', phoneKey: null },
                      { key: 'mechanicalLead', label: '机械负责人', phoneKey: 'mechanicalLeadPhone' },
                      { key: 'electricalLead', label: '电气负责人', phoneKey: 'electricalLeadPhone' },
                      { key: 'visualLead', label: '视觉负责人', phoneKey: 'visualLeadPhone' },
                      { key: 'softwareLead', label: '软件负责人', phoneKey: 'softwareLeadPhone' },
                      { key: 'algorithmLead', label: '算法负责人', phoneKey: 'algorithmLeadPhone' },
                      { key: 'procurement', label: '采购', phoneKey: null },
                      { key: 'planning', label: '计划', phoneKey: null },
                      { key: 'production', label: '生产', phoneKey: null },
                      { key: 'quality', label: '质量', phoneKey: null },
                      { key: 'fieldProjectLead', label: '现场项目经理', phoneKey: null },
                      { key: 'business', label: '商务', phoneKey: null },
                      { key: 'safety', label: '安全', phoneKey: 'safetyLeadPhone' },
                    ];
                    
                    // 添加预设角色成员
                    roles.forEach(role => {
                      const userId = (selectedProject as any)[role.key];
                      if (userId) {
                        // 通过用户ID查找用户信息
                        const user = users.find(u => u.id === userId);
                        allMembers.push({
                          role: role.label,
                          name: user ? (user.fullName || user.username) : userId,
                          phone: role.phoneKey ? ((selectedProject as any)[role.phoneKey] || '-') : '-',
                        });
                      }
                    });
                    
                    // 添加自定义成员
                    const customMembers = parseCustomMembers((selectedProject as any).customMembers || "");
                    customMembers.forEach((member: CustomMember) => {
                      // 使用 getRoleDisplayName 函数转换角色代码为中文名称
                      const roleName = getRoleDisplayName(member.role);
                      allMembers.push({
                        role: roleName,
                        name: member.name,
                        phone: member.phone || '-',
                      });
                    });
                    
                    if (allMembers.length === 0) {
                      return (
                        <div className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
                          暂无项目成员，点击"编辑成员"添加
                        </div>
                      );
                    }
                    
                    return (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">角色</th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">姓名</th>
                              <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">电话</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allMembers.map((member, index) => (
                              <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">{member.role}</td>
                                <td className="py-2 px-3 text-gray-900 dark:text-white">{member.name}</td>
                                <td className="py-2 px-3 text-gray-900 dark:text-white">{member.phone}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 文件管理卡片 */}
              <FileManagement projectId={selectedProject.id} />

              {/* 任务列表标题和操作按钮 */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">任务列表</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTaskForm({
                        projectId: selectedProject.id,
                        taskCode: "",
                        title: "",
                        description: "",
                        status: "todo" as TaskStatus,
                        priority: "medium" as Priority,
                        assigneeId: "",
                        assignees: "",
                        taskMembers: "",
                        plannedStartDate: "",
                        actualStartDate: "",
                        plannedEndDate: "",
                        actualEndDate: "",
                      });
                      setShowTaskForm(true);
                    }}
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
                  >
                    新建任务
                  </button>
                  <button
                    onClick={() => setTaskViewMode("table")}
                    className={`px-3 py-2 rounded-md text-sm ${
                      taskViewMode === "table"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    }`}
                  >
                    表格视图
                  </button>
                  <button
                    onClick={() => setTaskViewMode("card")}
                    className={`px-3 py-2 rounded-md text-sm ${
                      taskViewMode === "card"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    }`}
                  >
                    卡片视图
                  </button>
                </div>
              </div>

              {taskViewMode === "table" ? (
                <div className="overflow-x-auto">
                  <table className="divide-y divide-gray-200 dark:divide-gray-700" style={{ tableLayout: "fixed", minWidth: "100%" }}>
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
                          style={{ width: taskColumnWidths.taskCode }}
                          onClick={() => handleTaskSort("taskCode")}
                        >
                          <div className="flex items-center gap-1">
                            <span>任务编码</span>
                            {taskSortField === "taskCode" && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {taskSortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                            style={{ width: "4px" }}
                            onMouseDown={(e) => {
                              const startX = e.clientX;
                              const startWidth = taskColumnWidths.taskCode;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                handleColumnResize("taskCode", deltaX);
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none relative"
                          style={{ width: taskColumnWidths.title }}
                          onClick={() => handleTaskSort("title")}
                        >
                          <div className="flex items-center gap-1">
                            <span>任务标题</span>
                            {taskSortField === "title" && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {taskSortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                            style={{ width: "4px" }}
                            onMouseDown={(e) => {
                              const startX = e.clientX;
                              const startWidth = taskColumnWidths.title;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                handleColumnResize("title", deltaX);
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none relative"
                          style={{ width: taskColumnWidths.assignee }}
                          onClick={() => handleTaskSort("assigneeId")}
                        >
                          <div className="flex items-center gap-1">
                            <span>负责人</span>
                            {taskSortField === "assigneeId" && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {taskSortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                            style={{ width: "4px" }}
                            onMouseDown={(e) => {
                              const startX = e.clientX;
                              const startWidth = taskColumnWidths.assignee;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                handleColumnResize("assignee", deltaX);
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none relative"
                          style={{ width: taskColumnWidths.status }}
                          onClick={() => handleTaskSort("status")}
                        >
                          <div className="flex items-center gap-1">
                            <span>状态</span>
                            {taskSortField === "status" && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {taskSortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                            style={{ width: "4px" }}
                            onMouseDown={(e) => {
                              const startX = e.clientX;
                              const startWidth = taskColumnWidths.status;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                handleColumnResize("status", deltaX);
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none relative"
                          style={{ width: taskColumnWidths.priority }}
                          onClick={() => handleTaskSort("priority")}
                        >
                          <div className="flex items-center gap-1">
                            <span>优先级</span>
                            {taskSortField === "priority" && (
                              <span className="text-gray-600 dark:text-gray-400">
                                {taskSortOrder === "asc" ? "↑" : "↓"}
                              </span>
                            )}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400"
                            style={{ width: "4px" }}
                            onMouseDown={(e) => {
                              const startX = e.clientX;
                              const startWidth = taskColumnWidths.priority;
                              const onMouseMove = (moveEvent: MouseEvent) => {
                                const deltaX = moveEvent.clientX - startX;
                                handleColumnResize("priority", deltaX);
                              };
                              const onMouseUp = () => {
                                document.removeEventListener("mousemove", onMouseMove);
                                document.removeEventListener("mouseup", onMouseUp);
                              };
                              document.addEventListener("mousemove", onMouseMove);
                              document.addEventListener("mouseup", onMouseUp);
                            }}
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 relative"
                          style={{ width: taskColumnWidths.actions }}
                        >
                          <span>操作</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {getSortedTasks().map((task) => (
                        <tr key={task.id}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono text-gray-900 dark:text-white">
                              {(task as any).taskCode || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.title}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {task.description}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {(task as any).taskMembers ? (
                                (() => {
                                  const members = parseCustomMembers((task as any).taskMembers);
                                  if (members.length === 0) return <span className="text-gray-400">-</span>;
                                  return (
                                    <div className="flex flex-wrap gap-1">
                                      {members.slice(0, 2).map((member: CustomMember, index: number) => (
                                        <span
                                          key={index}
                                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                        >
                                          {member.name}
                                        </span>
                                      ))}
                                      {members.length > 2 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                          +{members.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {task.status === 'completed' ? '已完成' :
                               task.status === 'in_progress' ? '进行中' : '待处理'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {task.priority === 'high' ? '高' :
                               task.priority === 'medium' ? '中' : '低'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setEditTaskForm({
                                  taskCode: (task as any).taskCode || "",
                                  title: task.title,
                                  description: task.description || "",
                                  status: task.status as TaskStatus,
                                  priority: task.priority as Priority,
                                  assigneeId: task.assigneeId || "",
                                  assignees: (task as any).assignees || "",
                                  taskMembers: (task as any).taskMembers || "",
                                  plannedStartDate: formatDate(task.plannedStartDate),
                                  actualStartDate: formatDate(task.actualStartDate),
                                  plannedEndDate: formatDate(task.plannedEndDate),
                                  actualEndDate: formatDate(task.actualEndDate),
                                });
                                setShowEditTaskForm(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {task.title}
                        </h3>
                        <span className="text-sm font-mono text-gray-500">
                          {(task as any).taskCode || "-"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {task.description}
                      </p>
                      {(task as any).taskMembers && (() => {
                        const members = parseCustomMembers((task as any).taskMembers);
                        return members.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">负责人：</div>
                            <div className="flex flex-wrap gap-1">
                              {members.map((member: CustomMember, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                >
                                  {member.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      <div className="flex gap-2 mb-3">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status === 'completed' ? '已完成' :
                           task.status === 'in_progress' ? '进行中' : '待处理'}
                        </span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority === 'high' ? '高' :
                           task.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setEditTaskForm({
                              taskCode: (task as any).taskCode || "",
                              title: task.title,
                              description: task.description || "",
                              status: task.status as TaskStatus,
                              priority: task.priority as Priority,
                              assigneeId: task.assigneeId || "",
                              assignees: (task as any).assignees || "",
                              taskMembers: (task as any).taskMembers || "",
                              plannedStartDate: formatDate(task.plannedStartDate),
                              actualStartDate: formatDate(task.actualStartDate),
                              plannedEndDate: formatDate(task.plannedEndDate),
                              actualEndDate: formatDate(task.actualEndDate),
                            });
                            setShowEditTaskForm(true);
                          }}
                          className="flex-1 border border-gray-300 text-gray-700 px-3 py-2 rounded hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "orders_dashboard" && (
            <div>
              {/* 订单看板头部 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    订单管理看板
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {/* 订单列表视图模式切换 */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                  <button
                    onClick={() => setOrdersDashboardViewMode("table")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      ordersDashboardViewMode === "table"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    表格视图
                  </button>
                  <button
                    onClick={() => setOrdersDashboardViewMode("card")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      ordersDashboardViewMode === "card"
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    卡片视图
                  </button>
                  </div>
                </div>
              </div>

              {/* 高级搜索 */}
              <div className="mb-6">
                <button
                  onClick={() => setShowOrdersDashboardSearch(!showOrdersDashboardSearch)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  {showOrdersDashboardSearch ? "收起搜索" : "高级搜索"}
                </button>
                {showOrdersDashboardSearch && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          年度
                        </label>
                        <input
                          type="number"
                          value={ordersDashboardSearchParams.year}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, year: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="例如：2024"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          月度
                        </label>
                        <select
                          value={ordersDashboardSearchParams.month}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, month: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        >
                          <option value="">全部</option>
                          <option value="1">1月</option>
                          <option value="2">2月</option>
                          <option value="3">3月</option>
                          <option value="4">4月</option>
                          <option value="5">5月</option>
                          <option value="6">6月</option>
                          <option value="7">7月</option>
                          <option value="8">8月</option>
                          <option value="9">9月</option>
                          <option value="10">10月</option>
                          <option value="11">11月</option>
                          <option value="12">12月</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          订单开始日期
                        </label>
                        <input
                          type="date"
                          value={ordersDashboardSearchParams.startDate}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, startDate: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          订单结束日期
                        </label>
                        <input
                          type="date"
                          value={ordersDashboardSearchParams.endDate}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, endDate: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          客户编码
                        </label>
                        <input
                          type="text"
                          value={ordersDashboardSearchParams.customerCode}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, customerCode: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="输入客户编码"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          客户名称
                        </label>
                        <input
                          type="text"
                          value={ordersDashboardSearchParams.customerName}
                          onChange={(e) =>
                            setOrdersDashboardSearchParams({ ...ordersDashboardSearchParams, customerName: e.target.value })
                          }
                          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-800 dark:text-white"
                          placeholder="输入客户名称"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => {
                          setOrdersDashboardSearchParams({
                            year: "",
                            month: "",
                            startDate: "",
                            endDate: "",
                            customerCode: "",
                            customerName: "",
                          });
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        重置
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 订单列表 - 表格视图 */}
              {(() => {
                const filteredOrders = filterOrders(orders);

                if (filteredOrders.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <p className="text-gray-500 dark:text-gray-400">暂无订单数据</p>
                    </div>
                  );
                }

                return (
                  <>
                    {ordersDashboardViewMode === "table" && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                订单号
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                合同号
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                客户
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                项目名称
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                订单日期
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                交付日期
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                状态
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredOrders
                              .slice((ordersDashboardCurrentPage - 1) * ordersDashboardItemsPerPage, ordersDashboardCurrentPage * ordersDashboardItemsPerPage)
                              .map((order) => {
                              // 检查是否所有款项已收完、票已开完
                              const allPaymentReceived =
                                order.prepayReceived &&
                                order.arrivalReceived &&
                                order.acceptanceReceived &&
                                order.warrantyReceived;

                              const allInvoicesIssued =
                                order.prepayInvoiced &&
                                order.arrivalInvoiced &&
                                order.acceptanceInvoiced &&
                                order.warrantyInvoiced;

                              const isComplete = allPaymentReceived && allInvoicesIssued;

                              return (
                                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    <div>
                                      {order.orderNumber || "-"}
                                      {isComplete && (
                                        <div className="mt-1">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            ✓ 款/票已完结
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {order.contractCode || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{order.customerCode || "-"}</div>
                                  {order.customerName || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                  {order.projectName || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {order.orderDate ? new Date(order.orderDate).toLocaleDateString("zh-CN") : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                  {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString("zh-CN") : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                                      order.status === "active"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                        : order.status === "completed"
                                        ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                  >
                                    {order.status === "active"
                                      ? "进行中"
                                      : order.status === "completed"
                                      ? "已完成"
                                      : "已暂停"}
                                  </span>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 表格分页控制 */}
                    {ordersDashboardViewMode === "table" && filteredOrders.length > 0 && (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">每页显示:</label>
                          <select
                            value={ordersDashboardItemsPerPage}
                            onChange={(e) => {
                              const newSize = parseInt(e.target.value, 10);
                              setOrdersDashboardItemsPerPage(newSize);
                              setOrdersDashboardCurrentPage(1);
                            }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="10">10 条</option>
                            <option value="20">20 条</option>
                            <option value="50">50 条</option>
                            <option value="100">100 条</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            共 {filteredOrders.length} 条记录
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setOrdersDashboardCurrentPage(1)}
                              disabled={ordersDashboardCurrentPage === 1}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              首页
                            </button>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={ordersDashboardCurrentPage === 1}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              上一页
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              第 {ordersDashboardCurrentPage} / {Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1} 页
                            </span>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage((prev) => Math.min(Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1, prev + 1))}
                              disabled={ordersDashboardCurrentPage >= Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              下一页
                            </button>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage(Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1)}
                              disabled={ordersDashboardCurrentPage >= Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              末页
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 卡片视图 */}
                    {ordersDashboardViewMode === "card" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredOrders
                          .slice((ordersDashboardCurrentPage - 1) * ordersDashboardItemsPerPage, ordersDashboardCurrentPage * ordersDashboardItemsPerPage)
                          .map((order) => (
                          <div
                            key={order.id}
                            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                          >
                            {/* 检查是否所有款项已收完、票已开完 */}
                            {(() => {
                              const allPaymentReceived =
                                order.prepayReceived &&
                                order.arrivalReceived &&
                                order.acceptanceReceived &&
                                order.warrantyReceived;

                              const allInvoicesIssued =
                                order.prepayInvoiced &&
                                order.arrivalInvoiced &&
                                order.acceptanceInvoiced &&
                                order.warrantyInvoiced;

                              const isComplete = allPaymentReceived && allInvoicesIssued;

                              return (
                                <div className="mb-3 flex items-start justify-between">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                      {order.orderNumber || "未命名订单"}
                                    </h3>
                                    {order.contractCode && (
                                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        合同: {order.contractCode}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                        order.status === "active"
                                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                          : order.status === "completed"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                          : order.status === "paused"
                                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                      }`}
                                    >
                                      {order.status === "active"
                                        ? "进行中"
                                        : order.status === "completed"
                                        ? "已完成"
                                        : order.status === "paused"
                                        ? "已暂停"
                                        : "已取消"}
                                    </span>
                                    {isComplete && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400">
                                        ✓ 款/票已完结
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>{order.customerName || "-"}</span>
                              </div>
                              {order.projectName && (
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="line-clamp-1">{order.projectName}</span>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{order.orderDate ? new Date(order.orderDate).toLocaleDateString("zh-CN") : "-"}</span>
                              </div>
                              {order.orderAmount && (
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-semibold text-gray-900 dark:text-white">¥{order.orderAmount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 卡片分页控制 */}
                    {ordersDashboardViewMode === "card" && filteredOrders.length > 0 && (
                      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">每页显示:</label>
                          <select
                            value={ordersDashboardItemsPerPage}
                            onChange={(e) => {
                              const newSize = parseInt(e.target.value, 10);
                              setOrdersDashboardItemsPerPage(newSize);
                              setOrdersDashboardCurrentPage(1);
                            }}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="10">10 条</option>
                            <option value="20">20 条</option>
                            <option value="50">50 条</option>
                            <option value="100">100 条</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            共 {filteredOrders.length} 条记录
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setOrdersDashboardCurrentPage(1)}
                              disabled={ordersDashboardCurrentPage === 1}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              首页
                            </button>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage((prev) => Math.max(1, prev - 1))}
                              disabled={ordersDashboardCurrentPage === 1}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              上一页
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              第 {ordersDashboardCurrentPage} / {Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1} 页
                            </span>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage((prev) => Math.min(Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1, prev + 1))}
                              disabled={ordersDashboardCurrentPage >= Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              下一页
                            </button>
                            <button
                              onClick={() => setOrdersDashboardCurrentPage(Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage) || 1)}
                              disabled={ordersDashboardCurrentPage >= Math.ceil(filteredOrders.length / ordersDashboardItemsPerPage)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
                            >
                              末页
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === "contracts_dashboard" && (
            <div>
              {/* 合同看板头部 */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {contractsDashboardType === "contracts" ? "合同管理看板" : "合同数据统计"}
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  {/* Dashboard 类型切换 */}
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 dark:bg-gray-700">
                    <button
                      onClick={() => setContractsDashboardType("contracts")}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        contractsDashboardType === "contracts"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      合同列表
                    </button>
                    <button
                      onClick={() => setContractsDashboardType("stats" as any)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        // @ts-ignore
                        contractsDashboardType === "stats"
                          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      }`}
                    >
                      数据统计
                    </button>
                  </div>
                </div>
              </div>

              {/* 合同列表内容 */}
              {contractsDashboardType === "contracts" && (
                <ContractManagement />
              )}

              {/* 合同数据统计看板 */}
              {contractsDashboardType === "stats" && (
                <ContractDashboard />
              )}
            </div>
          )}

          {activeTab === "contracts" && (
            <ContractManagement />
          )}

          {activeTab === "orders" && (
            <OrderManagement orders={orders} setOrders={setOrders} />
          )}

          {activeTab === "customers" && (
            <CustomerManagement />
          )}

          {activeTab === "products" && (
            <ProductManagement />
          )}

          {activeTab === "deliveries" && (
            <DeliveryManagement currentUserName={currentUser?.fullName || currentUser?.username || ""} currentUserRole={currentUser?.role || ""} />
          )}

          {activeTab === "knowledge_base" && (
            <KnowledgeBasePanel />
          )}

          {activeTab === "task_profile" && (
            <TaskProfilePage />
          )}

          {activeTab === "messages" && <MessageCenter userId={currentUser?.id || ""} userRole={currentUser?.role || ""} />}

          {activeTab === "approvals" && <ProjectApproval userId={currentUser?.id} userRole={currentUser?.role} targetApprovalId={targetApprovalId} onApprovalViewed={() => setTargetApprovalId(null)} onApprovalCompleted={fetchProjects} />}

        </div>
      </div>

      {/* Project Form Modal */}
      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">新建项目</h2>
              <form onSubmit={handleCreateProject}>
                <div className="space-y-6">
                  {/* 项目信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目名称 *
                        </label>
                        <input
                          type="text"
                          required
                          value={projectForm.name}
                          onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="请输入项目名称"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目编号
                        </label>
                        <input
                          type="text"
                          value={projectForm.projectCode}
                          onChange={(e) => setProjectForm({ ...projectForm, projectCode: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          placeholder="请输入项目编号"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目状态
                        </label>
                        <select
                          value={projectForm.status}
                          onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as Status })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">进行中</option>
                          <option value="paused">已暂停</option>
                          <option value="completed">已完成</option>
                          <option value="cancelled">已取消</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          开始日期
                        </label>
                        <input
                          type="date"
                          value={projectForm.startDate}
                          onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          结束日期
                        </label>
                        <input
                          type="date"
                          value={projectForm.endDate}
                          onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          持续时间
                        </label>
                        <input
                          type="text"
                          value={calculateDuration(projectForm.startDate, projectForm.endDate)}
                          readOnly
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="自动计算"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目描述
                        </label>
                        <textarea
                          value={projectForm.description}
                          onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 产品信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">产品信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          物料编码
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={projectForm.materialCode}
                            onChange={(e) => {
                              setProjectForm({ ...projectForm, materialCode: e.target.value });
                              searchCodeRecords(e.target.value);
                            }}
                            onFocus={() => {
                              if (projectForm.materialCode && codeSearchResults.length > 0) {
                                setShowCodeSearchDropdown(true);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowCodeSearchDropdown(false), 200)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="输入物料编码、产品名称、规格型号进行搜索..."
                          />
                          {isSearchingCodes && (
                            <div className="absolute right-2 top-2 text-gray-400">
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          )}
                          {showCodeSearchDropdown && codeSearchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-w-4xl rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 max-h-96 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">编码</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">物料名称</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">规格型号</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">项目名称</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">产品大类</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">版本</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {codeSearchResults.map((result) => (
                                    <tr
                                      key={result.record_id}
                                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                                      onClick={() => {
                                        setProjectForm({
                                          ...projectForm,
                                          materialCode: result.code,
                                          productName: result.material_name || result.project_name || "",
                                          specification: result.product_specification || result.specification || "",
                                          productImageUrl: result.product_image_url || "",
                                        });
                                        setShowCodeSearchDropdown(false);
                                        setCodeSearchResults([]);
                                      }}
                                    >
                                      <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{result.code}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.material_name}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.specification || '-'}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.project_name || result.material_name || '-'}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.second_category_name || '-'}</td>
                                      <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{result.version || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          产品名称（自动填充）
                        </label>
                        <input
                          type="text"
                          value={projectForm.productName}
                          onChange={(e) => setProjectForm({ ...projectForm, productName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="输入物料编码后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          规格型号（自动填充）
                        </label>
                        <input
                          type="text"
                          value={projectForm.specification}
                          onChange={(e) => setProjectForm({ ...projectForm, specification: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="输入物料编码后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          产品图片（自动填充）
                        </label>
                        {projectForm.productImageUrl ? (
                          <img
                            src={projectForm.productImageUrl}
                            alt="产品图片"
                            className="h-20 w-20 rounded-lg object-cover border border-gray-300 dark:border-gray-600"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            暂无图片
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 客户信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">客户信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          客户名称
                        </label>
                        <CustomerSearch
                          value={projectForm.customerName}
                          onChange={(value) => setProjectForm({ ...projectForm, customerName: value })}
                          onCustomerSelect={(customer, technicalContact) => {
                            setProjectForm({
                              ...projectForm,
                              customerId: customer.id,
                              customerName: customer.customerName,
                              technicalContactName: technicalContact?.contactName || "",
                              technicalContactPhone: technicalContact?.contactPhone || "",
                              technicalContactEmail: technicalContact?.contactEmail || "",
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人姓名
                        </label>
                        <input
                          type="text"
                          value={projectForm.technicalContactName}
                          onChange={(e) => setProjectForm({ ...projectForm, technicalContactName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人电话
                        </label>
                        <input
                          type="text"
                          value={projectForm.technicalContactPhone}
                          onChange={(e) => setProjectForm({ ...projectForm, technicalContactPhone: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人邮箱
                        </label>
                        <input
                          type="email"
                          value={projectForm.technicalContactEmail}
                          onChange={(e) => setProjectForm({ ...projectForm, technicalContactEmail: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 订单信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">订单信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单编码
                        </label>
                        <OrderSearch
                          value={projectForm.orderNumber}
                          onChange={(value) => setProjectForm({ ...projectForm, orderNumber: value })}
                          onOrderSelect={(order) => {
                            setProjectForm({
                              ...projectForm,
                              orderNumber: order.orderNumber || "",
                              orderDate: order.orderDate ? formatDate(order.orderDate) : "",
                              deliveryDate: order.deliveryDate ? formatDate(order.deliveryDate) : "",
                              quantity: order.quantity || "",
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={projectForm.orderDate}
                          onChange={(e) => setProjectForm({ ...projectForm, orderDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单交付日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={projectForm.deliveryDate}
                          onChange={(e) => setProjectForm({ ...projectForm, deliveryDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单数量（自动填充）
                        </label>
                        <input
                          type="text"
                          value={projectForm.quantity}
                          onChange={(e) => setProjectForm({ ...projectForm, quantity: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 合同信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">合同信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同编码
                        </label>
                        <ContractSearch
                          value={projectForm.contractCode}
                          onChange={(value) => setProjectForm({ ...projectForm, contractCode: value })}
                          onContractSelect={(contract) => {
                            setProjectForm({
                              ...projectForm,
                              contractCode: contract.contractCode || "",
                              contractName: contract.contractName || "",
                              contractDate: contract.contractDate ? formatDate(contract.contractDate) : "",
                              technicalProtocolUrl: contract.attachment1Url || "",
                            });
                            setTechnicalProtocolDisplayUrl(contract.attachment1Url || "");
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同名称（自动填充）
                        </label>
                        <input
                          type="text"
                          value={projectForm.contractName}
                          onChange={(e) => setProjectForm({ ...projectForm, contractName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择合同后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={projectForm.contractDate}
                          onChange={(e) => setProjectForm({ ...projectForm, contractDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择合同后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术协议（自动填充）
                        </label>
                        {technicalProtocolDisplayUrl ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={technicalProtocolDisplayUrl}
                              readOnly
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(technicalProtocolDisplayUrl, `${projectForm.contractName}-技术协议`)}
                              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                            >
                              下载
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={projectForm.technicalProtocolUrl}
                            onChange={(e) => setProjectForm({ ...projectForm, technicalProtocolUrl: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="选择合同后自动填充"
                            readOnly
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 项目成员 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目成员</h3>

                    <div className="md:col-span-2 mt-4">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">添加成员</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <select
                          value={newCustomMember.role}
                          onChange={(e) => {
                            const roleCode = e.target.value;
                            setNewCustomMember({ ...newCustomMember, role: roleCode, name: "", phone: "" });
                            setRoleUsers([]);
                            setShowUserDropdown(false);
                            if (roleCode) {
                              fetchUsersByRole(roleCode);
                            }
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">选择角色</option>
                          {roles.filter(r => r.isActive).map((role) => (
                            <option key={role.id} value={role.roleCode}>
                              {role.roleName}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="姓名（选择角色后可从列表选择）"
                            value={newCustomMember.name}
                            onChange={(e) => {
                              setNewCustomMember({ ...newCustomMember, name: e.target.value });
                              if (roleUsers.length > 0) {
                                setShowUserDropdown(true);
                              }
                            }}
                            onFocus={() => {
                              if (roleUsers.length > 0 && newCustomMember.role) {
                                setShowUserDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              // 延迟隐藏，以便点击下拉选项
                              setTimeout(() => setShowUserDropdown(false), 200);
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          {showUserDropdown && getFilteredRoleUsers().length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                选择系统用户（可直接输入自定义）
                              </div>
                              {getFilteredRoleUsers().map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => handleUserSelect(user.id, user.fullName || user.username, user.phone || "")}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-0"
                                >
                                  <div className="font-medium">{user.fullName || user.username}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span>{user.phone || "无电话"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="电话"
                          value={newCustomMember.phone}
                          onChange={(e) => setNewCustomMember({ ...newCustomMember, phone: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomMember}
                          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                          添加
                        </button>
                      </div>

                      {/* 成员列表 */}
                      {customMembersList.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-2">角色</th>
                                <th className="text-left py-2 px-2">姓名</th>
                                <th className="text-left py-2 px-2">电话</th>
                                <th className="text-left py-2 px-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customMembersList.map((member) => (
                                <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-2 px-2">{getRoleDisplayName(member.role)}</td>
                                  <td className="py-2 px-2">{member.name}</td>
                                  <td className="py-2 px-2">{member.phone}</td>
                                  <td className="py-2 px-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditCustomMember(member)}
                                      className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 mr-2"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomMember(member.id)}
                                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      删除
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProjectForm(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    提交审批
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Member Modal */}
      {showEditCustomMemberForm && editingCustomMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">编辑成员</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  角色
                </label>
                <select
                  value={editingCustomMember.role}
                  onChange={(e) => setEditingCustomMember({ ...editingCustomMember, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">选择角色</option>
                  {roles.filter(r => r.isActive).map((role) => (
                    <option key={role.id} value={role.roleName}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  姓名
                </label>
                <input
                  type="text"
                  value={editingCustomMember.name}
                  onChange={(e) => setEditingCustomMember({ ...editingCustomMember, name: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  电话
                </label>
                <input
                  type="text"
                  value={editingCustomMember.phone}
                  onChange={(e) => setEditingCustomMember({ ...editingCustomMember, phone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditCustomMember}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditCustomMember}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectForm && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">编辑项目</h2>
              <form onSubmit={handleUpdateProject}>
                <div className="space-y-6">
                  {/* 项目信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目编号
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.projectCode}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, projectCode: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目名称 *
                        </label>
                        <input
                          type="text"
                          required
                          value={editProjectForm.name}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目状态
                        </label>
                        <select
                          value={editProjectForm.status}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, status: e.target.value as Status })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="active">进行中</option>
                          <option value="paused">已暂停</option>
                          <option value="completed">已完成</option>
                          <option value="cancelled">已取消</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          开始日期
                        </label>
                        <input
                          type="date"
                          value={editProjectForm.startDate}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, startDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          结束日期
                        </label>
                        <input
                          type="date"
                          value={editProjectForm.endDate}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, endDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          持续时间
                        </label>
                        <input
                          type="text"
                          value={calculateDuration(editProjectForm.startDate, editProjectForm.endDate)}
                          readOnly
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="自动计算"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          项目描述
                        </label>
                        <textarea
                          value={editProjectForm.description}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, description: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 产品信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">产品信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          物料编码
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={editProjectForm.materialCode}
                            onChange={(e) => {
                              setEditProjectForm({ ...editProjectForm, materialCode: e.target.value });
                              searchEditingCodeRecords(e.target.value);
                            }}
                            onFocus={() => {
                              if (editProjectForm.materialCode && editingCodeSearchResults.length > 0) {
                                setShowEditingCodeSearchDropdown(true);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowEditingCodeSearchDropdown(false), 200)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="输入物料编码、产品名称、规格型号进行搜索..."
                          />
                          {isSearchingEditingCodes && (
                            <div className="absolute right-2 top-2 text-gray-400">
                              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          )}
                          {showEditingCodeSearchDropdown && editingCodeSearchResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full max-w-4xl rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 max-h-96 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">编码</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">物料名称</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">规格型号</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">项目名称</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">产品大类</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 border-b dark:border-gray-600">版本</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {editingCodeSearchResults.map((result) => (
                                    <tr
                                      key={result.record_id}
                                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0"
                                      onClick={() => {
                                        setEditProjectForm({
                                          ...editProjectForm,
                                          materialCode: result.code,
                                          productName: result.material_name || result.project_name || "",
                                          specification: result.product_specification || result.specification || "",
                                          productImageUrl: result.product_image_url || "",
                                        });
                                        setShowEditingCodeSearchDropdown(false);
                                        setEditingCodeSearchResults([]);
                                      }}
                                    >
                                      <td className="px-3 py-2 font-mono text-blue-600 dark:text-blue-400">{result.code}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.material_name}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.specification || '-'}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.project_name || result.material_name || '-'}</td>
                                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{result.second_category_name || '-'}</td>
                                      <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{result.version || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          产品名称（自动填充）
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.productName}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, productName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="输入物料编码后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          规格型号（自动填充）
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.specification}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, specification: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="输入物料编码后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          产品图片（自动填充）
                        </label>
                        {editProjectForm.productImageUrl ? (
                          <img
                            src={editProjectForm.productImageUrl}
                            alt="产品图片"
                            className="h-20 w-20 rounded-lg object-cover border border-gray-300 dark:border-gray-600"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            暂无图片
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 客户信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">客户信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          客户名称
                        </label>
                        <CustomerSearch
                          value={editProjectForm.customerName}
                          onChange={(value) => setEditProjectForm({ ...editProjectForm, customerName: value })}
                          onCustomerSelect={(customer, technicalContact) => {
                            setEditProjectForm({
                              ...editProjectForm,
                              customerId: customer.id,
                              customerName: customer.customerName,
                              technicalContactName: technicalContact?.contactName || "",
                              technicalContactPhone: technicalContact?.contactPhone || "",
                              technicalContactEmail: technicalContact?.contactEmail || "",
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人姓名
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.technicalContactName}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, technicalContactName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人电话
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.technicalContactPhone}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, technicalContactPhone: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术联系人邮箱
                        </label>
                        <input
                          type="email"
                          value={editProjectForm.technicalContactEmail}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, technicalContactEmail: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择客户后自动填充"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 订单信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">订单信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单编码
                        </label>
                        <OrderSearch
                          value={editProjectForm.orderNumber}
                          onChange={(value) => setEditProjectForm({ ...editProjectForm, orderNumber: value })}
                          onOrderSelect={(order) => {
                            setEditProjectForm({
                              ...editProjectForm,
                              orderNumber: order.orderNumber || "",
                              orderDate: order.orderDate ? formatDate(order.orderDate) : "",
                              deliveryDate: order.deliveryDate ? formatDate(order.deliveryDate) : "",
                              quantity: order.quantity || "",
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={editProjectForm.orderDate}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, orderDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单交付日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={editProjectForm.deliveryDate}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, deliveryDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          订单数量（自动填充）
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.quantity}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, quantity: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择订单后自动填充"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {/* 合同信息 */}
                  <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">合同信息</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同编码
                        </label>
                        <ContractSearch
                          value={editProjectForm.contractCode}
                          onChange={(value) => setEditProjectForm({ ...editProjectForm, contractCode: value })}
                          onContractSelect={(contract) => {
                            setEditProjectForm({
                              ...editProjectForm,
                              contractCode: contract.contractCode || "",
                              contractName: contract.contractName || "",
                              contractDate: contract.contractDate ? formatDate(contract.contractDate) : "",
                              technicalProtocolUrl: contract.attachment1Url || "",
                            });
                            setTechnicalProtocolDisplayUrl(contract.attachment1Url || "");
                          }}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同名称（自动填充）
                        </label>
                        <input
                          type="text"
                          value={editProjectForm.contractName}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, contractName: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择合同后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          合同日期（自动填充）
                        </label>
                        <input
                          type="date"
                          value={editProjectForm.contractDate}
                          onChange={(e) => setEditProjectForm({ ...editProjectForm, contractDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white"
                          placeholder="选择合同后自动填充"
                          readOnly
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          技术协议（自动填充）
                        </label>
                        {technicalProtocolDisplayUrl ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={technicalProtocolDisplayUrl}
                              readOnly
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 bg-gray-50 dark:border-gray-600 dark:bg-gray-600 dark:text-white text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(technicalProtocolDisplayUrl, `${editProjectForm.contractName}-技术协议`)}
                              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                            >
                              下载
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={editProjectForm.technicalProtocolUrl}
                            onChange={(e) => setEditProjectForm({ ...editProjectForm, technicalProtocolUrl: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="选择合同后自动填充"
                            readOnly
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 项目成员 */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">项目成员</h3>

                    <div className="md:col-span-2 mt-4">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">添加成员</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <select
                          value={newCustomMember.role}
                          onChange={(e) => {
                            const roleCode = e.target.value;
                            setNewCustomMember({ ...newCustomMember, role: roleCode, name: "", phone: "" });
                            setRoleUsers([]);
                            setShowUserDropdown(false);
                            if (roleCode) {
                              fetchUsersByRole(roleCode);
                            }
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">选择角色</option>
                          {roles.filter(r => r.isActive).map((role) => (
                            <option key={role.id} value={role.roleCode}>
                              {role.roleName}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="姓名（选择角色后可从列表选择）"
                            value={newCustomMember.name}
                            onChange={(e) => {
                              setNewCustomMember({ ...newCustomMember, name: e.target.value });
                              if (roleUsers.length > 0) {
                                setShowUserDropdown(true);
                              }
                            }}
                            onFocus={() => {
                              if (roleUsers.length > 0 && newCustomMember.role) {
                                setShowUserDropdown(true);
                              }
                            }}
                            onBlur={() => {
                              // 延迟隐藏，以便点击下拉选项
                              setTimeout(() => setShowUserDropdown(false), 200);
                            }}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          {showUserDropdown && getFilteredRoleUsers().length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                选择系统用户（可直接输入自定义）
                              </div>
                              {getFilteredRoleUsers().map((user) => (
                                <div
                                  key={user.id}
                                  onClick={() => handleUserSelect(user.id, user.fullName || user.username, user.phone || "")}
                                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-0"
                                >
                                  <div className="font-medium">{user.fullName || user.username}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span>{user.phone || "无电话"}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="电话"
                          value={newCustomMember.phone}
                          onChange={(e) => setNewCustomMember({ ...newCustomMember, phone: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomMember}
                          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                          添加
                        </button>
                      </div>

                      {/* 成员列表 */}
                      {customMembersList.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-2">角色</th>
                                <th className="text-left py-2 px-2">姓名</th>
                                <th className="text-left py-2 px-2">电话</th>
                                <th className="text-left py-2 px-2">操作</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customMembersList.map((member) => (
                                <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-2 px-2">{getRoleDisplayName(member.role)}</td>
                                  <td className="py-2 px-2">{member.name}</td>
                                  <td className="py-2 px-2">{member.phone}</td>
                                  <td className="py-2 px-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditCustomMember(member)}
                                      className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 mr-2"
                                    >
                                      编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomMember(member.id)}
                                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                      删除
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditProjectForm(false);
                      setEditingProject(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">新建任务</h2>
              <form onSubmit={handleCreateTask}>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      任务编码
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={taskForm.taskCode || "自动生成"}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      placeholder="自动生成"
                    />
                    <p className="text-xs text-gray-500 mt-1">格式：项目编号+XXX（如：C234001）</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      任务标题 *
                    </label>
                    <input
                      type="text"
                      required
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      任务描述
                    </label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        状态
                      </label>
                      <select
                        value={taskForm.status}
                        onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="todo">待处理</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        优先级
                      </label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Priority })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        计划开始日期
                      </label>
                      <input
                        type="date"
                        value={taskForm.plannedStartDate}
                        onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        计划结束日期
                      </label>
                      <input
                        type="date"
                        value={taskForm.plannedEndDate}
                        onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        实际开始日期
                      </label>
                      <input
                        type="date"
                        value={taskForm.actualStartDate}
                        onChange={(e) => setTaskForm({ ...taskForm, actualStartDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        实际结束日期
                      </label>
                      <input
                        type="date"
                        value={taskForm.actualEndDate}
                        onChange={(e) => setTaskForm({ ...taskForm, actualEndDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      指派人（可多选）
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-40 overflow-y-auto">
                      {getProjectMembers(selectedProject).map((member) => {
                        const assignees = parseCustomMembers(taskForm.assignees || "");
                        const isSelected = assignees.some((m: CustomMember) => m.id === member.id);
                        return (
                          <div
                            key={`assignee_${member.id}`}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              id={`assignee_${member.id}`}
                              checked={isSelected}
                              onChange={() => handleAssigneesChange(member.id)}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`assignee_${member.id}`}
                              className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              <span className="font-medium">{member.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({member.role})</span>
                            </label>
                          </div>
                        );
                      })}
                      {getProjectMembers(selectedProject).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          暂无项目成员
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      负责人（可多选）
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-40 overflow-y-auto">
                      {getProjectMembers(selectedProject).map((member) => {
                        const taskMembers = parseCustomMembers(taskForm.taskMembers || "");
                        const isSelected = taskMembers.some((m: CustomMember) => m.id === member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              id={`member_${member.id}`}
                              checked={isSelected}
                              onChange={() => handleTaskMembersChange(member.id)}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`member_${member.id}`}
                              className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              <span className="font-medium">{member.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({member.role})</span>
                            </label>
                          </div>
                        );
                      })}
                      {getProjectMembers(selectedProject).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          暂无项目成员
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    创建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskForm && editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">编辑任务</h2>
              <form onSubmit={handleUpdateTask}>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      任务标题 *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTaskForm.title}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      任务描述
                    </label>
                    <textarea
                      value={editTaskForm.description}
                      onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        状态
                      </label>
                      <select
                        value={editTaskForm.status}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, status: e.target.value as TaskStatus })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="todo">待处理</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        优先级
                      </label>
                      <select
                        value={editTaskForm.priority}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, priority: e.target.value as Priority })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        计划开始日期
                      </label>
                      <input
                        type="date"
                        value={editTaskForm.plannedStartDate}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, plannedStartDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        计划结束日期
                      </label>
                      <input
                        type="date"
                        value={editTaskForm.plannedEndDate}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, plannedEndDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        实际开始日期
                      </label>
                      <input
                        type="date"
                        value={editTaskForm.actualStartDate}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, actualStartDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        实际结束日期
                      </label>
                      <input
                        type="date"
                        value={editTaskForm.actualEndDate}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, actualEndDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      指派人（可多选）
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-40 overflow-y-auto">
                      {getProjectMembers(selectedProject).map((member) => {
                        const assignees = parseCustomMembers(editTaskForm.assignees || "");
                        const isSelected = assignees.some((m: CustomMember) => m.id === member.id);
                        return (
                          <div
                            key={`edit_assignee_${member.id}`}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              id={`edit_assignee_${member.id}`}
                              checked={isSelected}
                              onChange={() => {
                                const currentAssignees = parseCustomMembers(editTaskForm.assignees || "");
                                const isSelected = currentAssignees.some((m: CustomMember) => m.id === member.id);

                                let updatedAssignees: CustomMember[];
                                if (isSelected) {
                                  updatedAssignees = currentAssignees.filter((m: CustomMember) => m.id !== member.id);
                                } else {
                                  const allMembers = getProjectMembers(selectedProject);
                                  const memberInfo = allMembers.find((m) => m.id === member.id);
                                  if (memberInfo) {
                                    updatedAssignees = [
                                      ...currentAssignees,
                                      {
                                        id: member.id,
                                        name: memberInfo.name,
                                        role: memberInfo.role,
                                        phone: "",
                                      },
                                    ];
                                  } else {
                                    updatedAssignees = currentAssignees;
                                  }
                                }

                                setEditTaskForm({ ...editTaskForm, assignees: JSON.stringify(updatedAssignees) });
                              }}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`edit_assignee_${member.id}`}
                              className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              <span className="font-medium">{member.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({member.role})</span>
                            </label>
                          </div>
                        );
                      })}
                      {getProjectMembers(selectedProject).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          暂无项目成员
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      负责人（可多选）
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-40 overflow-y-auto">
                      {getProjectMembers(selectedProject).map((member) => {
                        const taskMembers = parseCustomMembers(editTaskForm.taskMembers || "");
                        const isSelected = taskMembers.some((m: CustomMember) => m.id === member.id);
                        return (
                          <div
                            key={`edit_member_${member.id}`}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              id={`edit_member_${member.id}`}
                              checked={isSelected}
                              onChange={() => {
                                const currentMembers = parseCustomMembers(editTaskForm.taskMembers || "");
                                const isSelected = currentMembers.some((m: CustomMember) => m.id === member.id);

                                let updatedMembers: CustomMember[];
                                if (isSelected) {
                                  updatedMembers = currentMembers.filter((m: CustomMember) => m.id !== member.id);
                                } else {
                                  const allMembers = getProjectMembers(selectedProject);
                                  const memberInfo = allMembers.find((m) => m.id === member.id);
                                  if (memberInfo) {
                                    updatedMembers = [
                                      ...currentMembers,
                                      {
                                        id: member.id,
                                        name: memberInfo.name,
                                        role: memberInfo.role,
                                        phone: "",
                                      },
                                    ];
                                  } else {
                                    updatedMembers = currentMembers;
                                  }
                                }

                                setEditTaskForm({ ...editTaskForm, taskMembers: JSON.stringify(updatedMembers) });
                              }}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`edit_member_${member.id}`}
                              className="flex-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              <span className="font-medium">{member.name}</span>
                              <span className="ml-2 text-xs text-gray-500">({member.role})</span>
                            </label>
                          </div>
                        );
                      })}
                      {getProjectMembers(selectedProject).length === 0 && (
                        <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          暂无项目成员
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTaskForm(false);
                      setEditingTask(null);
                    }}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">导入项目</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    选择Excel文件
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                {importFile && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      已选择：{importFile.name}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  取消
                </button>
                <button
                  onClick={handleImportProjects}
                  disabled={!importFile}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 聊天助手 */}
      <ChatAssistant />

      {/* 实用工具 */}
      <UtilityTools
        isOpen={showUtilityTools}
        onClose={() => setShowUtilityTools(false)}
      />
    </div>
    </>
  );
}
