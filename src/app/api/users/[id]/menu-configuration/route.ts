import { NextResponse, NextRequest } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { userManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";

// GET /api/users/[id]/menu-configuration - 获取用户菜单配置（仅系统管理员）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    // 检查是否是系统管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以查看菜单配置" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const db = await getDb();

    const [user] = await db
      .select({ menuConfiguration: users.menuConfiguration })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user.menuConfiguration,
    });
  } catch (error) {
    console.error("获取菜单配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取菜单配置失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/menu-configuration - 更新用户菜单配置（仅系统管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    // 检查是否是系统管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以修改菜单配置" },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const { menuConfiguration } = body;

    if (!menuConfiguration) {
      return NextResponse.json(
        { success: false, error: "菜单配置不能为空" },
        { status: 400 }
      );
    }

    // 验证JSON格式
    try {
      JSON.parse(menuConfiguration);
    } catch (e) {
      return NextResponse.json(
        { success: false, error: "菜单配置格式无效，必须是有效的JSON" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const [updatedUser] = await db
      .update(users)
      .set({
        menuConfiguration,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "菜单配置更新成功",
    });
  } catch (error) {
    console.error("更新菜单配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "更新菜单配置失败",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
