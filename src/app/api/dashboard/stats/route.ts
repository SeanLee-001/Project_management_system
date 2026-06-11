import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import {
  projects,
  tasks,
  customers,
  contracts,
  orders,
  products,
  users,
} from "@/storage/database/shared/schema";
import { eq, and, count, sql, gte, lte } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const filterType = url.searchParams.get("filterType") || "days"; // 默认按天筛选
    const daysParam = url.searchParams.get("days");
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");
    
    // 计算日期范围
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let filterLabel: string;

    if (filterType === "days") {
      const days = daysParam ? parseInt(daysParam, 10) : 30;
      startDate = new Date();
      startDate.setDate(today.getDate() - days);
      endDate = today;
      filterLabel = `近${days}天`;
    } else if (filterType === "month") {
      const month = monthParam ? parseInt(monthParam, 10) : today.getMonth() + 1;
      const year = yearParam ? parseInt(yearParam, 10) : today.getFullYear();
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0); // 月底
      filterLabel = `${year}年${month}月`;
    } else if (filterType === "year") {
      const year = yearParam ? parseInt(yearParam, 10) : today.getFullYear();
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      filterLabel = `${year}年`;
    } else {
      // 默认：最近30天
      startDate = new Date();
      startDate.setDate(today.getDate() - 30);
      endDate = today;
      filterLabel = "近30天";
    }

    // 1. 项目统计
    const [projectStats] = await db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${projects.status} = 'active' THEN 1 END`
        ),
        completed: count(
          sql`CASE WHEN ${projects.status} = 'completed' THEN 1 END`
        ),
        paused: count(
          sql`CASE WHEN ${projects.status} = 'paused' THEN 1 END`
        ),
        cancelled: count(
          sql`CASE WHEN ${projects.status} = 'cancelled' THEN 1 END`
        ),
      })
      .from(projects);

    // 计算项目延期数量（结束日期小于今天且状态不是completed）
    const [overdueProjects] = await db
      .select({
        count: count(),
      })
      .from(projects)
      .where(
        and(
          sql`${projects.endDate} < ${today}`,
          sql`${projects.status} != 'completed'`
        )
      );

    // 新建项目（在指定时间范围内）
    const [newProjects] = await db
      .select({
        count: count(),
      })
      .from(projects)
      .where(and(gte(projects.createdAt, startDate), lte(projects.createdAt, endDate)));

    // 2. 任务统计
    const [taskStats] = await db
      .select({
        total: count(),
        todo: count(
          sql`CASE WHEN ${tasks.status} = 'todo' THEN 1 END`
        ),
        inProgress: count(
          sql`CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END`
        ),
        completed: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`
        ),
        high: count(
          sql`CASE WHEN ${tasks.priority} = 'high' THEN 1 END`
        ),
        medium: count(
          sql`CASE WHEN ${tasks.priority} = 'medium' THEN 1 END`
        ),
        low: count(
          sql`CASE WHEN ${tasks.priority} = 'low' THEN 1 END`
        ),
      })
      .from(tasks);

    // 3. 客户统计
    const [customerStats] = await db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${customers.status} = 'active' THEN 1 END`
        ),
        inactive: count(
          sql`CASE WHEN ${customers.status} = 'inactive' THEN 1 END`
        ),
        terminal: count(
          sql`CASE WHEN ${customers.customerType} = 'terminal' THEN 1 END`
        ),
        agent: count(
          sql`CASE WHEN ${customers.customerType} = 'agent' THEN 1 END`
        ),
      })
      .from(customers);

    // 4. 合同统计
    const [contractStats] = await db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${contracts.status} = 'active' THEN 1 END`
        ),
        expired: count(
          sql`CASE WHEN ${contracts.status} = 'expired' THEN 1 END`
        ),
        terminated: count(
          sql`CASE WHEN ${contracts.status} = 'terminated' THEN 1 END`
        ),
      })
      .from(contracts);

    // 5. 订单统计
    const [orderStats] = await db
      .select({
        total: count(),
        normal: count(
          sql`CASE WHEN ${orders.status} = '正常' THEN 1 END`
        ),
        paused: count(
          sql`CASE WHEN ${orders.status} = '暂停' THEN 1 END`
        ),
        cancelled: count(
          sql`CASE WHEN ${orders.status} = '取消' THEN 1 END`
        ),
      })
      .from(orders);

    // 6. 产品统计
    const [productStats] = await db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${products.status} = 'active' THEN 1 END`
        ),
        inactive: count(
          sql`CASE WHEN ${products.status} = 'inactive' THEN 1 END`
        ),
      })
      .from(products);

    // 7. 用户统计
    const [userStats] = await db
      .select({
        total: count(),
        active: count(
          sql`CASE WHEN ${users.isActive} = true THEN 1 END`
        ),
        inactive: count(
          sql`CASE WHEN ${users.isActive} = false THEN 1 END`
        ),
        pendingApproval: count(
          sql`CASE WHEN ${users.approvalStatus} = 'pending' THEN 1 END`
        ),
      })
      .from(users);

    // 8. 按日期分组统计（指定时间范围内每天的新增数据）
    const dailyStats = await db
      .select({
        date: sql<string>`DATE(${projects.createdAt})`,
        projects: count(projects.id),
      })
      .from(projects)
      .where(and(gte(projects.createdAt, startDate), lte(projects.createdAt, endDate)))
      .groupBy(sql`DATE(${projects.createdAt})`)
      .orderBy(sql`DATE(${projects.createdAt})`);

    // 9. 任务完成趋势（指定时间范围内）
    const taskTrend = await db
      .select({
        date: sql<string>`DATE(${tasks.updatedAt})`,
        completed: count(
          sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`
        ),
      })
      .from(tasks)
      .where(
        and(
          gte(tasks.updatedAt, startDate),
          lte(tasks.updatedAt, endDate),
          eq(tasks.status, "completed")
        )
      )
      .groupBy(sql`DATE(${tasks.updatedAt})`)
      .orderBy(sql`DATE(${tasks.updatedAt})`);

    // 10. 项目成员角色统计
    const memberRoleStats = await db
      .select({
        role: users.role,
        count: count(users.id),
      })
      .from(users)
      .where(eq(users.isActive, true))
      .groupBy(users.role);

    // 11. 近期项目列表（最近5个）
    const recentProjects = await db
      .select()
      .from(projects)
      .orderBy(sql`${projects.createdAt} DESC`)
      .limit(5);

    // 12. 近期任务列表（最近5个待办任务）
    const recentTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "todo"))
      .orderBy(sql`${tasks.createdAt} DESC`)
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        filterLabel,
        project: {
          ...projectStats,
          overdue: overdueProjects?.count || 0,
          new: newProjects?.count || 0,
        },
        task: taskStats,
        customer: customerStats,
        contract: contractStats,
        order: orderStats,
        product: productStats,
        user: userStats,
        trends: {
          dailyProjects: dailyStats,
          taskCompletion: taskTrend,
        },
        memberRoles: memberRoleStats,
        recent: {
          projects: recentProjects,
          tasks: recentTasks,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取统计数据失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
