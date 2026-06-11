import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { UserRole } from "@/storage/database/shared/schema";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", "database-configs");

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionName: string;
  description: string;
}

// 生成 .env 配置文件内容
function generateEnvContent(config: DatabaseConfig): string {
  const lines = [
    `# 数据库配置文件 - ${config.connectionName}`,
    `# 生成时间: ${new Date().toISOString()}`,
    `# 描述: ${config.description || "远程数据库配置"}`,
    "",
    `# 数据库连接配置`,
    `DB_HOST=${config.host}`,
    `DB_PORT=${config.port}`,
    `DB_NAME=${config.database}`,
    `DB_USER=${config.username}`,
    `DB_PASSWORD=${config.password}`,
    `DB_SSL=${config.ssl ? "true" : "false"}`,
    "",
    `# 连接名称`,
    `DB_CONNECTION_NAME=${config.connectionName}`,
    `DB_DESCRIPTION=${config.description || ""}`,
    "",
    `# PostgreSQL 连接字符串（可选）`,
    `DATABASE_URL=postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}${config.ssl ? "?ssl=true" : ""}`,
    "",
    `# 使用说明:`,
    `# 1. 将此文件复制到项目根目录并重命名为 .env.local 或 .env`,
    `# 2. 重启应用以使用新的数据库连接`,
    `# 3. 确保数据库服务器允许远程连接`,
  ];
  return lines.join("\n");
}

// 生成 JSON 配置文件内容
function generateJsonContent(config: DatabaseConfig): string {
  return JSON.stringify(
    {
      connectionName: config.connectionName,
      description: config.description,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password, // 注意：实际生产环境应该加密
      ssl: config.ssl,
      createdAt: new Date().toISOString(),
    },
    null,
    2
  );
}

// POST /api/database-config - 保存数据库配置
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    // 检查权限
    const isAdmin = [UserRole.SYSTEM_ADMIN].includes(currentUser.role as any);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: "只有系统管理员可以配置数据库" }, { status: 403 });
    }

    const config: DatabaseConfig = await request.json();

    // 验证必填字段
    if (!config.host || !config.database || !config.username || !config.connectionName) {
      return NextResponse.json({ success: false, error: "请填写完整的配置信息" }, { status: 400 });
    }

    // 确保配置目录存在
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true });
    }

    // 清理配置名称（移除特殊字符）
    const safeName = config.connectionName.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 生成配置文件
    const envContent = generateEnvContent(config);
    const jsonContent = generateJsonContent(config);

    // 保存 .env 文件
    const envPath = path.join(CONFIG_DIR, `${safeName}.env`);
    await writeFile(envPath, envContent, "utf-8");

    // 保存 JSON 文件（用于在管理界面加载）
    const jsonPath = path.join(CONFIG_DIR, `${safeName}.json`);
    await writeFile(jsonPath, jsonContent, "utf-8");

    return NextResponse.json({
      success: true,
      message: "配置保存成功",
      data: {
        envPath,
        jsonPath,
        connectionName: safeName,
      },
    });
  } catch (error) {
    console.error("保存数据库配置失败:", error);
    return NextResponse.json(
      { success: false, error: "保存配置失败: " + String(error) },
      { status: 500 }
    );
  }
}

// GET /api/database-config/list - 获取配置列表
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
    }

    const { readdir, readFile } = await import("fs/promises");

    // 确保目录存在
    if (!existsSync(CONFIG_DIR)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const files = await readdir(CONFIG_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const configs = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await readFile(path.join(CONFIG_DIR, file), "utf-8");
          const data = JSON.parse(content);
          return {
            name: file.replace(".json", ""),
            content: generateEnvContent(data),
            createdAt: data.createdAt || new Date().toISOString(),
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: configs.filter(Boolean),
    });
  } catch (error) {
    console.error("获取配置列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取配置列表失败" },
      { status: 500 }
    );
  }
}
