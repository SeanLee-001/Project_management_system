import { NextResponse } from "next/server";
import { userManager } from "@/storage/database";

// 创建测试用户
const testUsers = [
  { username: "zhangsan", email: "zhangsan@example.com", fullName: "张三", role: "project_manager" },
  { username: "lisi", email: "lisi@example.com", fullName: "李四", role: "mechanical_engineer" },
  { username: "wangwu", email: "wangwu@example.com", fullName: "王五", role: "software_engineer" },
  { username: "zhaoliu", email: "zhaoliu@example.com", fullName: "赵六", role: "quality_manager" },
  { username: "sunqi", email: "sunqi@example.com", fullName: "孙七", role: "purchase_manager" },
];

// POST /api/test/create-users - 创建测试用户
export async function POST(request: Request) {
  try {
    const results = [];

    for (const testUser of testUsers) {
      try {
        // 检查用户是否已存在
        const existingUser = await userManager.getUserByUsername(testUser.username);
        if (existingUser) {
          console.log(`用户 ${testUser.username} 已存在，跳过创建`);
          results.push({ username: testUser.username, status: "exists" });
          continue;
        }

        // 创建用户（密码会被createUser方法覆盖为admin123）
        // 传递 skipApproval=true 来直接审核通过
        const user = await userManager.createUser({
          username: testUser.username,
          email: testUser.email,
          password: "admin123", // 会被覆盖
          fullName: testUser.fullName,
          role: testUser.role,
          isActive: true,
          approvalStatus: "approved",
        }, true);

        console.log(`创建用户成功: ${testUser.username}`);
        results.push({ username: testUser.username, status: "created", userId: user.id });
      } catch (error) {
        console.error(`创建用户 ${testUser.username} 失败:`, error);
        results.push({ username: testUser.username, status: "failed", error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      message: "测试用户创建完成",
      data: results,
    });
  } catch (error) {
    console.error("创建测试用户失败:", error);
    return NextResponse.json(
      { success: false, error: "创建测试用户失败: " + String(error) },
      { status: 500 }
    );
  }
}
