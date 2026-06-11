import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// GET /api/init - 初始化admin用户
export async function GET(request: NextRequest) {
  try {
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

      // 更新邮箱（如果不匹配）
      if (existingAdmin.email !== "lyz801012@163.com") {
        updates.email = "lyz801012@163.com";
        message = "Admin user email updated";
      }

      // 确保审核状态为approved
      if (existingAdmin.approvalStatus !== "approved") {
        updates.approvalStatus = "approved";
        if (message === "Admin user already exists") {
          message = "Admin user approval status updated";
        } else {
          message = "Admin user email and approval status updated";
        }
      }

      // 如果有需要更新的字段
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

    // 创建admin用户
    const adminUser = await userManager.createUser({
      username: "admin",
      password: "admin123",
      email: "lyz801012@163.com",
      fullName: "系统管理员",
      role: "system_admin",
      isActive: true,
      approvalStatus: "approved", // 设置为已审核通过状态
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
