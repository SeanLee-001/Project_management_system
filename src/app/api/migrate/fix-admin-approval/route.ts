import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

/**
 * 修复admin用户的审核状态
 * 将admin用户的approvalStatus从pending更新为approved
 *
 * 使用方法：
 * GET /api/migrate/fix-admin-approval
 *
 * 注意：此API应在部署后立即调用一次，确保admin用户可以正常登录
 */
export async function GET(request: NextRequest) {
  try {
    console.log("Starting admin approval status fix...");

    // 查找admin用户
    const adminUser = await userManager.getUserByUsername("admin");

    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin user not found. Please create admin user first.",
        },
        { status: 404 }
      );
    }

    // 检查当前审核状态
    console.log(`Current admin approval status: ${adminUser.approvalStatus}`);

    if (adminUser.approvalStatus === "approved") {
      return NextResponse.json(
        {
          success: true,
          message: "Admin user already has approved status",
          data: {
            username: adminUser.username,
            approvalStatus: adminUser.approvalStatus,
          },
        },
        { status: 200 }
      );
    }

    // 更新审核状态为approved
    const updatedUser = await userManager.updateUser(adminUser.id, {
      approvalStatus: "approved",
    });

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update admin user approval status",
        },
        { status: 500 }
      );
    }

    console.log("Admin approval status fixed successfully");

    return NextResponse.json(
      {
        success: true,
        message: "Admin user approval status fixed successfully",
        data: {
          username: updatedUser.username,
          email: updatedUser.email,
          approvalStatus: updatedUser.approvalStatus,
          isActive: updatedUser.isActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fixing admin approval status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fix admin approval status",
      },
      { status: 500 }
    );
  }
}
