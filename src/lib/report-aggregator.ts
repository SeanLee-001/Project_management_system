import { getDb } from "coze-coding-dev-sdk";
import { projects, tasks, contracts, orders, users } from "@/storage/database/shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface ProjectInfo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  manager: string;
  startDate: string | null;
  endDate: string | null;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: string;
  details: { title: string; status: string; assignee: string; dueDate: string | null }[];
}

export interface ContractSummary {
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  collectionRate: string;
  details: { name: string; amount: number; status: string; signDate: string | null }[];
}

export interface OrderSummary {
  totalCount: number;
  totalAmount: number;
  byStatus: Record<string, number>;
  details: { orderNumber: string; amount: number; status: string; createdAt: string | null }[];
}

export interface InvoiceSummary {
  invoices: { number: string; amount: number; date: string; status: string }[];
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface ApprovalStats {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

export interface RiskItem {
  type: string;
  level: string;
  description: string;
  suggestion: string;
}

export interface RiskAnalysis {
  total: number;
  high: number;
  medium: number;
  low: number;
  details: RiskItem[];
}

export interface TeamMember {
  name: string;
  role: string;
  department: string;
}

export interface AggregatedData {
  project: ProjectInfo | null;
  tasks: TaskStats;
  contracts: ContractSummary;
  orders: OrderSummary;
  invoices: InvoiceSummary;
  transactions: TransactionSummary;
  approvals: ApprovalStats;
  risks: RiskAnalysis;
  team: TeamMember[];
}

function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch((err) => {
    console.error(`[ReportAggregator] ${label} 查询失败:`, err.message);
    return fallback;
  });
}

export class ReportDataAggregator {
  static async aggregate(projectId: string, dateFrom?: string, dateTo?: string): Promise<AggregatedData> {
    const filters = { projectId, dateFrom, dateTo };

    const [project, tasks, contracts, orders, invoices, transactions, approvals, risks, team] = await Promise.all([
      safeQuery("项目基本信息", () => this.fetchProject(projectId), null as ProjectInfo | null),
      safeQuery("任务数据", () => this.fetchTasks(projectId, dateFrom, dateTo), emptyTaskStats()),
      safeQuery("合同数据", () => this.fetchContracts(projectId), emptyContractSummary()),
      safeQuery("订单数据", () => this.fetchOrders(projectId, dateFrom, dateTo), emptyOrderSummary()),
      safeQuery("发票数据", () => this.fetchInvoices(projectId, dateFrom, dateTo), emptyInvoiceSummary()),
      safeQuery("交易数据", () => this.fetchTransactions(projectId, dateFrom, dateTo), emptyTransactionSummary()),
      safeQuery("审批数据", () => this.fetchApprovals(projectId), emptyApprovalStats()),
      safeQuery("风险分析", () => this.fetchRisks(projectId), emptyRiskAnalysis()),
      safeQuery("团队数据", () => this.fetchTeam(projectId), [] as TeamMember[]),
    ]);

    return { project, tasks, contracts, orders, invoices, transactions, approvals, risks, team };
  }

  private static async fetchProject(projectId: string): Promise<ProjectInfo | null> {
    const db = await getDb(projects);
    const [result] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      description: result.description || null,
      status: result.status || "未知",
      manager: (result as any).managerName || (result as any).manager || "未指定",
      startDate: (result as any).startDate || (result as any).start_date || null,
      endDate: (result as any).endDate || (result as any).end_date || null,
    };
  }

  private static async fetchTasks(projectId: string, dateFrom?: string, dateTo?: string): Promise<TaskStats> {
    const db = await getDb(tasks);
    const conditions = [eq(tasks.projectId, projectId)];

    if (dateFrom) conditions.push(gte((tasks as any).createdAt || (tasks as any).created_at, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte((tasks as any).createdAt || (tasks as any).created_at, to));
    }

    const allTasks = await db.select().from(tasks).where(and(...conditions));

    const completed = allTasks.filter((t: any) => t.status === "completed" || t.status === "done").length;
    const inProgress = allTasks.filter((t: any) => t.status === "in_progress" || t.status === "in-progress").length;
    const overdue = allTasks.filter((t: any) => {
      if (t.status === "completed" || t.status === "done") return false;
      const due = t.dueDate || (t as any).due_date;
      return due && new Date(due) < new Date();
    }).length;

    return {
      total: allTasks.length,
      completed,
      inProgress,
      overdue,
      completionRate: allTasks.length > 0 ? ((completed / allTasks.length) * 100).toFixed(1) + "%" : "0%",
      details: allTasks.slice(0, 50).map((t: any) => ({
        title: t.title || t.name || "",
        status: t.status || "",
        assignee: (t as any).assigneeName || (t as any).assignee || "",
        dueDate: t.dueDate || (t as any).due_date || null,
      })),
    };
  }

  private static async fetchContracts(projectId: string): Promise<ContractSummary> {
    const db = await getDb(contracts);
    const allContracts = await db.select().from(contracts).where(eq(contracts.projectId, projectId));

    const totalAmount = allContracts.reduce((sum: number, c: any) => sum + (Number(c.amount || c.contractAmount || 0)), 0);
    const paidAmount = allContracts.reduce((sum: number, c: any) => sum + (Number(c.paidAmount || c.collectedAmount || 0)), 0);

    return {
      totalCount: allContracts.length,
      totalAmount,
      paidAmount,
      pendingAmount: totalAmount - paidAmount,
      collectionRate: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) + "%" : "100%",
      details: allContracts.map((c: any) => ({
        name: c.name || c.title || "",
        amount: Number(c.amount || c.contractAmount || 0),
        status: c.status || "",
        signDate: c.signDate || (c as any).sign_date || null,
      })),
    };
  }

  private static async fetchOrders(projectId: string, dateFrom?: string, dateTo?: string): Promise<OrderSummary> {
    const db = await getDb(orders);
    const conditions = [eq(orders.projectId, projectId)];
    if (dateFrom) conditions.push(gte((orders as any).createdAt || (orders as any).created_at, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte((orders as any).createdAt || (orders as any).created_at, to));
    }

    const allOrders = await db.select().from(orders).where(and(...conditions));
    const byStatus: Record<string, number> = {};
    for (const o of allOrders as any[]) {
      const s = o.status || "未知";
      byStatus[s] = (byStatus[s] || 0) + 1;
    }

    return {
      totalCount: allOrders.length,
      totalAmount: allOrders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount || o.amount || 0)), 0),
      byStatus,
      details: allOrders.map((o: any) => ({
        orderNumber: o.orderNumber || o.order_number || o.id || "",
        amount: Number(o.totalAmount || o.amount || 0),
        status: o.status || "",
        createdAt: o.createdAt || (o as any).created_at || null,
      })),
    };
  }

  private static async fetchInvoices(_projectId: string, _dateFrom?: string, _dateTo?: string): Promise<InvoiceSummary> {
    return emptyInvoiceSummary();
  }

  private static async fetchTransactions(_projectId: string, _dateFrom?: string, _dateTo?: string): Promise<TransactionSummary> {
    return emptyTransactionSummary();
  }

  private static async fetchApprovals(projectId: string): Promise<ApprovalStats> {
    try {
      const db = await getDb(projects);
      // 通过 projectApprovalFlows 表查询
      const { projectApprovalFlows } = await import("@/storage/database/shared/schema");
      const flowsDb = await getDb(projectApprovalFlows);
      const flows = await flowsDb.select().from(projectApprovalFlows).where(eq((projectApprovalFlows as any).projectId, projectId));

      let approved = 0, pending = 0, rejected = 0;
      for (const f of flows as any[]) {
        const s = f.status || "";
        if (s === "approved" || s === "已通过") approved++;
        else if (s === "rejected" || s === "已驳回") rejected++;
        else pending++;
      }

      return { approved, pending, rejected, total: approved + pending + rejected };
    } catch {
      return { approved: 0, pending: 0, rejected: 0, total: 0 };
    }
  }

  private static async fetchRisks(projectId: string): Promise<RiskAnalysis> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/project-risk-analysis?projectId=${projectId}`);
      const json = await res.json();
      const risks: RiskItem[] = (json.data || json.risks || []).map((r: any) => ({
        type: r.type || r.riskType || "",
        level: r.level || r.riskLevel || "medium",
        description: r.description || r.summary || "",
        suggestion: r.suggestion || r.recommendation || "请及时关注并处理",
      }));

      const high = risks.filter((r) => r.level === "high").length;
      const medium = risks.filter((r) => r.level === "medium").length;
      const low = risks.filter((r) => r.level === "low").length;

      return { total: risks.length, high, medium, low, details: risks };
    } catch {
      return { total: 0, high: 0, medium: 0, low: 0, details: [] };
    }
  }

  private static async fetchTeam(projectId: string): Promise<TeamMember[]> {
    try {
      const db = await getDb(users);
      const allUsers = await db.select().from(users);
      return allUsers.slice(0, 50).map((u: any) => ({
        name: u.fullName || u.username || "",
        role: u.role || "",
        department: u.department || (u as any).departmentName || "",
      }));
    } catch {
      return [];
    }
  }
}

function emptyTaskStats(): TaskStats {
  return { total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: "0%", details: [] };
}

function emptyContractSummary(): ContractSummary {
  return { totalCount: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0, collectionRate: "100%", details: [] };
}

function emptyOrderSummary(): OrderSummary {
  return { totalCount: 0, totalAmount: 0, byStatus: {}, details: [] };
}

function emptyInvoiceSummary(): InvoiceSummary {
  return { invoices: [], totalAmount: 0, paidAmount: 0, unpaidAmount: 0 };
}

function emptyTransactionSummary(): TransactionSummary {
  return { totalIncome: 0, totalExpense: 0, balance: 0 };
}

function emptyApprovalStats(): ApprovalStats {
  return { approved: 0, pending: 0, rejected: 0, total: 0 };
}

function emptyRiskAnalysis(): RiskAnalysis {
  return { total: 0, high: 0, medium: 0, low: 0, details: [] };
}
