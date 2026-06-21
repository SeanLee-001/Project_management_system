import { NextRequest, NextResponse } from "next/server";
import { userManager, orderManager, projectManager, systemManager, customerManager } from "@/storage/database";
import { getDb } from "coze-coding-dev-sdk";
import { roles, projectApprovals } from "@/storage/database/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserFromToken } from "@/lib/auth";
import { getCached, setCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const cacheKey = `init-data:${user.id}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json(cached);

    const db = await getDb();

    const [
      users,
      allRoles,
      customers,
      projects,
      orders,
      companySettings,
      pendingApprovals,
    ] = await Promise.all([
      userManager.getUsers({}).then(users => users.map(({ password, ...u }) => u)),
      db.select().from(roles).orderBy(roles.roleName),
      customerManager.getAll(),
      projectManager.getProjects({ userId: user.id }),
      orderManager.getAll(),
      Promise.all([
        systemManager.getCompanyName(),
        systemManager.getCompanyLogo(),
        systemManager.getSystemVersion(),
        systemManager.getAlertStyle(),
      ]),
      db
        .select({
          projectId: projectApprovals.projectId,
          status: projectApprovals.status,
          approvalType: projectApprovals.approvalType,
          currentLevel: projectApprovals.currentLevel,
          id: projectApprovals.id,
        })
        .from(projectApprovals)
        .where(and(eq(projectApprovals.status, "pending"))),
    ]);

    const approvalMap = new Map<string, any>();
    pendingApprovals.forEach(a => approvalMap.set(a.projectId, a));

    const projectsWithStatus = projects.map(p => ({
      ...p,
      approvalStatus: approvalMap.get(p.id) || null,
      approvalRequestId: approvalMap.get(p.id)?.id || null,
    }));

    const activeRoles = allRoles.filter((r: any) => r.isActive);

    let permissions: Record<string, string[]> = {};
    if (user.role === "system_admin") {
      const allResources = ["projects", "tasks", "users", "customers", "customer_contacts", "contracts", "orders", "products", "config", "financial"];
      allResources.forEach(r => { permissions[r] = ["view", "edit", "delete"]; });
    } else {
      const { permissionManager } = await import("@/storage/database");
      const perms = await permissionManager.getUserPermissions(user.id);
      for (const p of perms) {
        if (!permissions[p.resource]) permissions[p.resource] = [];
        permissions[p.resource].push(p.permission);
      }
    }

    const result = {
      success: true,
      data: {
        users,
        roles: activeRoles,
        allRoles,
        customers,
        projects: projectsWithStatus,
        orders,
        permissions: { [user.id]: permissions },
        settings: {
          companyName: companySettings[0],
          companyLogo: companySettings[1],
          systemVersion: companySettings[2],
          alertStyle: companySettings[3],
        },
      },
    };

    setCache(cacheKey, result, 10000);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching init data:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "初始化数据加载失败" },
      { status: 500 }
    );
  }
}
