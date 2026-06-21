import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { getDb } from "coze-coding-dev-sdk";
import { projectApprovals } from "@/storage/database/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCached, setCache, invalidateCache } from "@/lib/cache";

// GET /api/projects - 获取所有项目
export async function GET(request: NextRequest) {
  try {
    const cacheKey = `projects:${request.url}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const keyword = searchParams.get("keyword") || undefined;
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const customerName = searchParams.get("customerName") || undefined;

    // 获取当前用户ID
    let userId: string | undefined;
    const token = request.cookies.get("token")?.value;
    if (token) {
      try {
        const decoded = await verifyToken(token);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch (error) {
        // token无效，忽略
      }
    }

    let projects: any[] = [];

    // 如果有任何高级查询参数，使用 advancedSearch
    if (keyword || year || month || startDate || endDate || customerName) {
      const params: any = {};

      if (keyword) params.keyword = keyword;
      if (status) params.status = status;
      if (year) params.year = parseInt(year, 10);
      if (month) params.month = parseInt(month, 10);
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (customerName) params.customerName = customerName;

      projects = await projectManager.advancedSearch(params, userId);
    } else {
      // 默认使用原有逻辑
      projects = await projectManager.getProjects({
        filters: status ? { status } : undefined,
        userId: userId,
      });
    }

    // 获取所有项目的审批状态
    const db = await getDb();
    const approvalList = await db
      .select({
        projectId: projectApprovals.projectId,
        status: projectApprovals.status,
        approvalType: projectApprovals.approvalType,
        currentLevel: projectApprovals.currentLevel,
        id: projectApprovals.id,
      })
      .from(projectApprovals)
      .where(
        and(
          eq(projectApprovals.status, "pending")
        )
      );

    // 创建项目ID到审批状态的映射
    const approvalMap = new Map<string, any>();
    approvalList.forEach(approval => {
      approvalMap.set(approval.projectId, approval);
    });

    // 将审批状态附加到每个项目
    const projectsWithStatus = projects.map(project => {
      const approval = approvalMap.get(project.id);
      return {
        ...project,
        approvalStatus: approval || null,
        approvalRequestId: approval?.id || null,
      };
    });

    const result = { success: true, data: projectsWithStatus };
    setCache(cacheKey, result, 15000);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching projects:", error);
    const errorMessage = error?.message || error?.toString() || "获取项目列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/projects - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "项目名称不能为空" },
        { status: 400 }
      );
    }

    const project = await projectManager.createProject(body);
    invalidateCache("projects:");
    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating project:", error);
    const errorMessage = error?.message || error?.toString() || "创建项目失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
