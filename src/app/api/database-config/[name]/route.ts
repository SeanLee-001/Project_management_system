import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";
import { readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", "database-configs");

// GET /api/database-config/[name] - 获取指定配置
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { name } = await params;
    const safeName = decodeURIComponent(name).replace(/[^a-zA-Z0-9_-]/g, "_");
    const jsonPath = path.join(CONFIG_DIR, `${safeName}.json`);

    if (!existsSync(jsonPath)) {
      return NextResponse.json({ success: false, error: "配置不存在" }, { status: 404 });
    }

    const content = await readFile(jsonPath, "utf-8");
    const config = JSON.parse(content);

    return NextResponse.json({
      success: true,
      data: {
        config,
        name: safeName,
      },
    });
  } catch (error) {
    console.error("获取配置失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配置失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/database-config/[name] - 删除配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 检查权限
    const isAdmin = [UserRole.SYSTEM_ADMIN].includes(currentUser.role as any);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "只有系统管理员可以删除配置" }, { status: 403 });
    }

    const { name } = await params;
    const safeName = decodeURIComponent(name).replace(/[^a-zA-Z0-9_-]/g, "_");
    const envPath = path.join(CONFIG_DIR, `${safeName}.env`);
    const jsonPath = path.join(CONFIG_DIR, `${safeName}.json`);

    // 删除文件
    if (existsSync(envPath)) {
      await unlink(envPath);
    }
    if (existsSync(jsonPath)) {
      await unlink(jsonPath);
    }

    return NextResponse.json({ success: true, message: "配置已删除" });
  } catch (error) {
    console.error("删除配置失败:", error);
    return NextResponse.json(
      { success: false, error: "删除配置失败" },
      { status: 500 }
    );
  }
}
