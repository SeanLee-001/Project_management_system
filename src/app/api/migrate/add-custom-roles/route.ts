import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { roles } from "@/storage/database/shared/schema";
import { sql } from "drizzle-orm";

/**
 * 数据库迁移：添加自定义角色
 *
 * 运行此脚本后，将在 roles 表中插入以下自定义角色：
 * - test_role: 测试角色
 * - intern: 实习生
 * - part_time: 兼职人员
 * - trainee: 培训生
 *
 * 这些角色的 isSystem 字段为 false，可以进行编辑、停用、删除操作。
 */
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 检查迁移是否已执行
    const existingRole = await db
      .select()
      .from(roles)
      .where(sql`role_code = 'test_role'`);

    if (existingRole.length > 0) {
      return NextResponse.json({
        success: true,
        message: "迁移已执行过，无需重复执行",
      });
    }

    // 插入自定义角色
    const customRoles = [
      {
        roleCode: "test_role",
        roleName: "测试角色",
        description: "用于测试的自定义角色，可以编辑、停用和删除",
        isSystem: false,
        isActive: true,
      },
      {
        roleCode: "intern",
        roleName: "实习生",
        description: "实习人员角色，可编辑、停用和删除",
        isSystem: false,
        isActive: true,
      },
      {
        roleCode: "part_time",
        roleName: "兼职人员",
        description: "兼职员工角色，可编辑、停用和删除",
        isSystem: false,
        isActive: true,
      },
      {
        roleCode: "trainee",
        roleName: "培训生",
        description: "培训人员角色，可编辑、停用和删除",
        isSystem: false,
        isActive: true,
      },
    ];

    // 批量插入自定义角色
    const insertedRoles = await db.insert(roles).values(customRoles).returning();

    return NextResponse.json({
      success: true,
      message: "迁移成功：已添加自定义角色",
      data: {
        rolesAdded: insertedRoles.length,
        roles: insertedRoles.map(r => ({
          roleCode: r.roleCode,
          roleName: r.roleName,
          isSystem: r.isSystem,
          isActive: r.isActive,
        })),
      },
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "迁移失败",
      },
      { status: 500 }
    );
  }
}
