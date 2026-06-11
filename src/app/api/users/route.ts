import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";

// GET /api/users - 获取所有用户
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || undefined;
    const isActive = searchParams.get("isActive") === "true" ? true
      : searchParams.get("isActive") === "false" ? false
      : undefined;

    // 不返回密码字段
    const users = (await userManager.getUsers({
      filters: role ? { role } : isActive !== undefined ? { isActive } : undefined,
    })).map(({ password, ...user }) => user);

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    const errorMessage = error?.message || error?.toString() || "获取用户列表失败";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/users - 创建新用户
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    // 验证token并获取用户信息
    const { verifyToken } = await import("@/lib/auth");
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    // 获取当前用户
    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员或管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "只有系统管理员或管理员可以创建用户" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 验证必填字段（password不是必填的，因为UserManager会设置默认密码）
    if (!body.username || !body.email || !body.phone) {
      return NextResponse.json(
        { success: false, error: "用户名、邮箱和手机号不能为空" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await userManager.getUserByUsername(body.username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `用户名 "${body.username}" 已存在` },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingEmail = await userManager.getUserByEmail(body.email);
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `邮箱 "${body.email}" 已存在` },
        { status: 400 }
      );
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(body.phone)) {
      return NextResponse.json(
        { success: false, error: "手机号格式不正确" },
        { status: 400 }
      );
    }

    // 管理员创建的用户直接审核通过
    const user = await userManager.createUser(body, true);
    const { password, ...userWithoutPassword } = user;

    // 如果用户有部门，自动继承部门的基础权限
    if (userWithoutPassword.departmentId) {
      try {
        const { departmentPermissionManager } = await import("@/storage/database/departmentPermissionManager");
        const { permissionManager } = await import("@/storage/database/permissionManager");

        // 获取部门的基础权限
        const deptPermissions = await departmentPermissionManager.getDepartmentPermissions(userWithoutPassword.departmentId);

        // 为用户添加这些权限
        for (const deptPerm of deptPermissions) {
          await permissionManager.addPermission({
            userId: userWithoutPassword.id,
            resource: deptPerm.resource as any,
            permission: deptPerm.permission as any,
          });
        }
      } catch (err) {
        console.error("继承部门权限失败:", err);
        // 不影响用户创建，权限继承失败可以后续手动处理
      }
    }

    return NextResponse.json({ success: true, data: userWithoutPassword }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    const errorMessage = error?.message || error?.toString() || "创建用户失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
