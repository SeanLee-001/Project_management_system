import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken } from "@/lib/auth";

// PUT /api/users/[id]/mac-address - 绑定或更新MAC地址（仅系统管理员）
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
        { success: false, error: "只有系统管理员可以绑定MAC地址" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { macAddress } = body;

    if (!macAddress) {
      return NextResponse.json(
        { success: false, error: "MAC address is required" },
        { status: 400 }
      );
    }

    // 验证MAC地址格式（格式：00:11:22:33:44:55）
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid MAC address format. Expected format: 00:11:22:33:44:55" },
        { status: 400 }
      );
    }

    // 检查MAC地址是否已被其他用户绑定
    const existingUser = await userManager.getUserByMacAddress(macAddress);
    if (existingUser && existingUser.id !== id) {
      return NextResponse.json(
        { success: false, error: "MAC address is already bound to another user" },
        { status: 409 }
      );
    }

    // 更新用户的MAC地址
    const user = await userManager.updateUser(id, { macAddress });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: "MAC address bound successfully"
    });
  } catch (error) {
    console.error("Error binding MAC address:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bind MAC address" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/mac-address - 解除MAC地址绑定（仅系统管理员）
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

    // 检查是否是系统管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以解绑MAC地址" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 移除用户的MAC地址
    const user = await userManager.updateUser(id, { macAddress: null });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
      message: "MAC address unbound successfully"
    });
  } catch (error) {
    console.error("Error unbinding MAC address:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unbind MAC address" },
      { status: 500 }
    );
  }
}
