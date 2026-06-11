import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", "database-configs");

// 解析 .env 文件
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      result[key] = value;
    }
  }

  return result;
}

// POST /api/database-config/import - 导入配置文件
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 检查权限
    const isAdmin = [UserRole.SYSTEM_ADMIN].includes(currentUser.role as any);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "只有系统管理员可以导入配置" }, { status: 403 });
    }

    const { filename, content } = await request.json();

    // 确保配置目录存在
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true });
    }

    let config: Record<string, string>;
    let configName: string;

    // 根据文件类型解析
    if (filename.endsWith(".json")) {
      config = JSON.parse(content);
      configName = config.connectionName || filename.replace(".json", "");
    } else {
      // 默认当作 .env 文件处理
      config = parseEnvFile(content);
      configName = config.DB_CONNECTION_NAME || filename.replace(/\.env$/i, "");
    }

    // 验证必要字段
    const host = config.DB_HOST || config.host;
    const database = config.DB_NAME || config.database;
    const username = config.DB_USER || config.username;

    if (!host || !database || !username) {
      return NextResponse.json({
        success: false,
        error: "配置文件缺少必要字段（DB_HOST, DB_NAME, DB_USER）",
      });
    }

    // 清理配置名称
    const safeName = configName.replace(/[^a-zA-Z0-9_-]/g, "_") || `imported_${Date.now()}`;

    // 构建标准配置对象
    const standardConfig = {
      connectionName: safeName,
      description: config.DB_DESCRIPTION || config.description || "导入的配置",
      host: host,
      port: config.DB_PORT || config.port || "5432",
      database: database,
      username: username,
      password: config.DB_PASSWORD || config.password || "",
      ssl: (config.DB_SSL || config.ssl || "false").toString().toLowerCase() === "true",
      createdAt: new Date().toISOString(),
    };

    // 生成 .env 文件内容
    const envLines = [
      `# 数据库配置文件 - ${safeName}`,
      `# 导入时间: ${new Date().toISOString()}`,
      `# 描述: ${standardConfig.description}`,
      "",
      `# 数据库连接配置`,
      `DB_HOST=${standardConfig.host}`,
      `DB_PORT=${standardConfig.port}`,
      `DB_NAME=${standardConfig.database}`,
      `DB_USER=${standardConfig.username}`,
      `DB_PASSWORD=${standardConfig.password}`,
      `DB_SSL=${standardConfig.ssl}`,
      "",
      `# 连接名称`,
      `DB_CONNECTION_NAME=${standardConfig.connectionName}`,
      `DB_DESCRIPTION=${standardConfig.description}`,
      "",
      `# PostgreSQL 连接字符串`,
      `DATABASE_URL=postgresql://${standardConfig.username}:${standardConfig.password}@${standardConfig.host}:${standardConfig.port}/${standardConfig.database}${standardConfig.ssl ? "?ssl=true" : ""}`,
    ];

    const envContent = envLines.join("\n");
    const jsonContent = JSON.stringify(standardConfig, null, 2);

    // 保存文件
    const envPath = path.join(CONFIG_DIR, `${safeName}.env`);
    const jsonPath = path.join(CONFIG_DIR, `${safeName}.json`);
    
    await writeFile(envPath, envContent, "utf-8");
    await writeFile(jsonPath, jsonContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "配置导入成功",
      data: {
        connectionName: safeName,
        envPath,
        jsonPath,
      },
    });
  } catch (error) {
    console.error("导入配置失败:", error);
    return NextResponse.json(
      { success: false, error: "导入配置失败: " + String(error) },
      { status: 500 }
    );
  }
}
