import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { roles } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";

// PUT /api/roles/[id] - 更新角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const { roleName, description, isActive } = body;

    // 查找角色
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRole.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "角色不存在",
        },
        { status: 404 }
      );
    }

    const role = existingRole[0];

    // 系统角色不允许修改某些字段
    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          error: "系统角色不允许修改",
        },
        { status: 403 }
      );
    }

    // 更新角色
    const updatedRole = await db
      .update(roles)
      .set({
        roleName: roleName ?? role.roleName,
        description: description ?? role.description,
        isActive: isActive ?? role.isActive,
        updatedAt: new Date(),
      })
      .where(eq(roles.id, id))
      .returning();

    invalidateCache("roles:");
    return NextResponse.json({
      success: true,
      data: updatedRole[0],
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "更新角色失败",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - 删除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = await getDb();
    const { id } = await params;

    // 查找角色
    const existingRole = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existingRole.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "角色不存在",
        },
        { status: 404 }
      );
    }

    const role = existingRole[0];

    // 系统角色不允许删除
    if (role.isSystem) {
      return NextResponse.json(
        {
          success: false,
          error: "系统角色不允许删除",
        },
        { status: 403 }
      );
    }

    // 删除角色
    await db.delete(roles).where(eq(roles.id, id));

    invalidateCache("roles:");
    return NextResponse.json({
      success: true,
      message: "角色删除成功",
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      {
        success: false,
        error: "删除角色失败",
      },
      { status: 500 }
    );
  }
}
