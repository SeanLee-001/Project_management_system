import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { roles } from "@/storage/database/shared/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/roles - 获取所有角色
export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get("active") === "true";

    let allRoles;

    if (onlyActive) {
      allRoles = await db
        .select()
        .from(roles)
        .where(eq(roles.isActive, true))
        .orderBy(roles.roleName);
    } else {
      allRoles = await db
        .select()
        .from(roles)
        .orderBy(roles.roleName);
    }

    return NextResponse.json({
      success: true,
      data: allRoles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取角色列表失败",
      },
      { status: 500 }
    );
  }
}

// POST /api/roles - 创建角色
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();
    const body = await request.json();
    const { roleCode, roleName, description } = body;

    // 验证必填字段
    if (!roleCode || !roleName) {
      return NextResponse.json(
        {
          success: false,
          error: "角色代码和角色名称为必填项",
        },
        { status: 400 }
      );
    }

    // 检查角色代码是否已存在
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.roleCode, roleCode))
      .limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "角色代码已存在",
        },
        { status: 400 }
      );
    }

    // 创建角色
    const newRole = await db
      .insert(roles)
      .values({
        roleCode,
        roleName,
        description,
        isSystem: false,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRole[0],
    });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "创建角色失败",
      },
      { status: 500 }
    );
  }
}
