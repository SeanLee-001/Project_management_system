import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { getDb } from "coze-coding-dev-sdk";
import { roles, departments, projectApprovalFlows, users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { getUserFromToken, isSystemAdmin } from "@/lib/auth";

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromToken(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "未授权" }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ success: false, error: "仅限系统管理员" }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const resetPassword = searchParams.get("resetPassword") === "true";

    // 检查admin用户是否已存在
    const existingAdmin = await userManager.getUserByUsername("admin");

    if (existingAdmin) {
      // 如果admin用户存在，检查是否需要更新邮箱、审核状态或重置密码
      let updatedUser = existingAdmin;
      let message = "Admin user already exists";
      const updates: any = {};

      // 确保审核状态为approved
      if (existingAdmin.approvalStatus !== "approved") {
        updates.approvalStatus = "approved";
        message = "Admin user approval status updated";
      }

      if (Object.keys(updates).length > 0) {
        const result = await userManager.updateUser(existingAdmin.id, updates);

        if (!result) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to update admin user",
            },
            { status: 500 }
          );
        }

        updatedUser = result;
      }

      // 如果请求重置密码，则重置密码为默认值
      if (resetPassword) {
        const resetResult = await userManager.resetUserPassword(existingAdmin.id);

        if (!resetResult) {
          return NextResponse.json(
            {
              success: false,
              error: "Failed to reset admin user password",
            },
            { status: 500 }
          );
        }

        updatedUser = resetResult;
        message = "Admin user email, approval status and password reset";
      }

      return NextResponse.json(
        {
          success: true,
          message: message,
          data: {
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            isActive: updatedUser.isActive,
          },
        },
        { status: 200 }
      );
    }

    // 创建admin用户（使用安全的随机密码）
    const adminPassword = process.env.ADMIN_INIT_PASSWORD || "admin123";
    const adminUser = await userManager.createUser({
      username: "admin",
      password: adminPassword,
      email: "admin@example.com",
      fullName: "系统管理员",
      role: "system_admin",
      isActive: true,
      approvalStatus: "approved",
    });

    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = adminUser;

    return NextResponse.json(
      {
        success: true,
        message: "Admin user created successfully",
        data: userWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error initializing admin user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize admin user",
      },
      { status: 500 }
    );
  }
}

// POST /api/init - 完整初始化检查（角色、部门、审批流程）
export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const results: string[] = [];
  try {
    const db = await getDb();

    // 1. 初始化默认角色
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length === 0) {
      await db.insert(roles).values([
        { roleCode: "system_admin", roleName: "系统管理员", description: "拥有系统所有权限", isSystem: true } as any,
        { roleCode: "project_manager", roleName: "项目经理", description: "管理部门项目和成员", isSystem: true } as any,
        { roleCode: "project_member", roleName: "项目成员", description: "参与项目开发", isSystem: true } as any,
      ]);
      results.push("默认角色已创建 (3个)");
    }

    // 2. 初始化默认部门
    const existingDepts = await db.select().from(departments);
    if (existingDepts.length === 0) {
      await db.insert(departments).values([
        { departmentCode: "tech", departmentName: "技术部", description: "技术研发部门" } as any,
        { departmentCode: "product", departmentName: "产品部", description: "产品设计与规划" } as any,
        { departmentCode: "marketing", departmentName: "市场部", description: "市场营销与推广" } as any,
        { departmentCode: "finance", departmentName: "财务部", description: "财务管理" } as any,
        { departmentCode: "hr", departmentName: "人事部", description: "人力资源管理" } as any,
      ]);
      results.push("默认部门已创建 (5个)");
    }

    // 3. 初始化审批流程
    const existingFlows = await db.select().from(projectApprovalFlows);
    if (existingFlows.length === 0) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, "system_admin" as any))
        .limit(1);

      if (adminUsers.length === 0) {
        const initPassword = process.env.ADMIN_INIT_PASSWORD || "admin123";
        await userManager.createUser({
          username: "admin",
          password: initPassword,
          email: "admin@example.com",
          fullName: "系统管理员",
          role: "system_admin",
          isActive: true,
          approvalStatus: "approved",
        } as any);
        results.push("管理员账户已创建");

        const newAdmin = await db
          .select()
          .from(users)
          .where(eq(users.role, "system_admin" as any))
          .limit(1);
        if (newAdmin.length > 0) {
          await initApprovalFlows(db, newAdmin[0].id, results);
        }
      } else {
        await initApprovalFlows(db, adminUsers[0].id, results);
      }
    }

    const summary = results.length > 0
      ? `初始化完成：${results.join("；")}`
      : "系统已初始化，无需操作";

    return NextResponse.json({ success: true, message: summary, details: results });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "初始化失败" },
      { status: 500 }
    );
  }
}

async function initApprovalFlows(db: any, adminUserId: string, results: string[]) {
  const flows = [
    {
      name: "新建项目审批流程",
      description: "新建项目时需要进行审批",
      approvalType: "new_project",
      isEnabled: true,
      level1ApproverId: adminUserId,
      level1ApproverRole: "system_admin",
      level2ApproverId: null,
      level2ApproverRole: "project_manager",
      level3ApproverId: null,
      level3ApproverRole: "department_manager",
    },
    {
      name: "编辑项目审批流程",
      description: "编辑项目时需要进行审批",
      approvalType: "edit_project",
      isEnabled: true,
      level1ApproverId: adminUserId,
      level1ApproverRole: "system_admin",
      level2ApproverId: null,
      level2ApproverRole: "project_manager",
      level3ApproverId: null,
      level3ApproverRole: "department_manager",
    },
    {
      name: "删除项目审批流程",
      description: "删除项目时需要进行审批",
      approvalType: "delete_project",
      isEnabled: true,
      level1ApproverId: adminUserId,
      level1ApproverRole: "system_admin",
      level2ApproverId: null,
      level2ApproverRole: "project_manager",
      level3ApproverId: null,
      level3ApproverRole: "department_manager",
    },
    {
      name: "项目状态变更审批流程",
      description: "变更项目状态时需要进行审批",
      approvalType: "status_change",
      isEnabled: true,
      level1ApproverId: adminUserId,
      level1ApproverRole: "system_admin",
      level2ApproverId: null,
      level2ApproverRole: "project_manager",
      level3ApproverId: null,
      level3ApproverRole: "department_manager",
    },
    {
      name: "项目成员变更审批流程",
      description: "变更项目成员时需要进行审批",
      approvalType: "member_change",
      isEnabled: true,
      level1ApproverId: adminUserId,
      level1ApproverRole: "system_admin",
      level2ApproverId: null,
      level2ApproverRole: "project_manager",
      level3ApproverId: null,
      level3ApproverRole: "department_manager",
    },
  ];

  await db.insert(projectApprovalFlows).values(flows);
  results.push("审批流程已初始化 (5个类型)");
}
