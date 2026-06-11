import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CONFIG_DIR = path.join(process.env.COZE_WORKSPACE_PATH || "/workspace/projects", "database-configs");

// GET /api/database-config/[name]/download - 下载配置文件
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
    const envPath = path.join(CONFIG_DIR, `${safeName}.env`);

    if (!existsSync(envPath)) {
      return NextResponse.json({ success: false, error: "配置文件不存在" }, { status: 404 });
    }

    const content = await readFile(envPath, "utf-8");

    // 返回文件下载响应
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="database-config-${safeName}.env"`,
      },
    });
  } catch (error) {
    console.error("下载配置文件失败:", error);
    return NextResponse.json(
      { success: false, error: "下载配置文件失败" },
      { status: 500 }
    );
  }
}
