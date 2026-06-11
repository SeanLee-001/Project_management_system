import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";
import { readFile, writeFile, copyFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", "database-configs");
const WORKSPACE_PATH = process.env.COZE_WORKSPACE_PATH || "/workspace/projects";

// POST /api/database-config/apply - 应用配置
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 检查权限
    const isAdmin = [UserRole.SYSTEM_ADMIN].includes(currentUser.role as any);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "只有系统管理员可以应用配置" }, { status: 403 });
    }

    const { configName } = await request.json();
    const safeName = configName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const envPath = path.join(CONFIG_DIR, `${safeName}.env`);

    if (!existsSync(envPath)) {
      return NextResponse.json({ success: false, error: "配置文件不存在" }, { status: 404 });
    }

    // 读取配置内容
    const configContent = await readFile(envPath, "utf-8");

    // 方案1：保存到 .env.local 文件（Next.js 会自动加载）
    const envLocalPath = path.join(WORKSPACE_PATH, ".env.local");
    await writeFile(envLocalPath, configContent, "utf-8");

    // 方案2：同时保存一份备份到 .env.backup
    const backupPath = path.join(WORKSPACE_PATH, ".env.backup");
    await writeFile(backupPath, `# 备份时间: ${new Date().toISOString()}\n${configContent}`, "utf-8");

    // 方案3：更新系统设置表，记录当前使用的配置
    try {
      const { getDb } = await import("coze-coding-dev-sdk");
      const { systemSettings } = await import("@/storage/database/shared/schema");
      const db = await getDb();
      
      await db.insert(systemSettings).values({
        key: "active_database_config",
        value: safeName,
      }).onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: safeName },
      });
    } catch (dbError) {
      console.error("记录配置到数据库失败:", dbError);
      // 不影响主流程
    }

    return NextResponse.json({
      success: true,
      message: "配置已应用，请重启服务以使用新的数据库连接",
      data: {
        appliedConfig: safeName,
        envPath: envLocalPath,
        note: "配置已写入 .env.local 文件，重启服务后生效",
      },
    });
  } catch (error) {
    console.error("应用配置失败:", error);
    return NextResponse.json(
      { success: false, error: "应用配置失败: " + String(error) },
      { status: 500 }
    );
  }
}
