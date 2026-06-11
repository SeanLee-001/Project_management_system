import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";

// GET /api/user/profile - 获取当前用户信息
export async function GET(request: NextRequest) {
  try {
    // 验证token - 从cookie或Authorization header中获取
    let token = request.cookies.get("token")?.value;

    // 如果cookie中没有，尝试从Authorization header获取
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 返回用户信息（不包含密码）
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        success: true,
        data: userWithoutPassword,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile - 更新当前用户信息
export async function PUT(request: NextRequest) {
  try {
    // 验证token - 从cookie或Authorization header中获取
    let token = request.cookies.get("token")?.value;

    // 如果cookie中没有，尝试从Authorization header获取
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fullName, email } = body;

    // 验证必填字段
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // 检查邮箱是否被其他用户使用
    const existingUser = await userManager.getUserByEmail(email);
    if (existingUser && existingUser.id !== decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 400 }
      );
    }

    // 更新用户信息
    const updatedUser = await userManager.updateUser(decoded.userId, {
      fullName,
      email,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    // 返回更新后的用户信息（不包含密码）
    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = updatedUser;

    // 更新 localStorage 中的用户信息
    return NextResponse.json(
      {
        success: true,
        data: userWithoutPassword,
        message: "个人信息更新成功",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user profile" },
      { status: 500 }
    );
  }
}
