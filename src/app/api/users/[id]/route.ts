import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken } from "@/lib/auth";

// GET /api/users/[id] - 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await userManager.getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - 更新用户（仅系统管理员）
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

    // 检查是否是系统管理员或管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "只有系统管理员或管理员可以更新用户" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 如果更新密码，使用专门的 updatePassword 方法
    if (body.password) {
      const user = await userManager.updatePassword(id, body.password);
      if (!user) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }
      const { password, ...userWithoutPassword } = user;
      return NextResponse.json({ success: true, data: userWithoutPassword });
    }

    // 否则使用常规更新方法
    const user = await userManager.updateUser(id, body);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - 删除用户（仅系统管理员）
export async function DELETE(
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

    // 检查是否是系统管理员或管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN && currentUser.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "只有系统管理员或管理员可以删除用户" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const success = await userManager.deleteUser(id);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
