import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// 触发APK构建
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buildType = "release", userId } = body;

    // 检查构建环境
    const hasJava = await checkCommand("java");
    const hasGradle = await checkCommand("gradle");

    if (!hasJava || !hasGradle) {
      return NextResponse.json({
        success: false,
        error: "构建环境未就绪，缺少Java或Gradle",
        requiresManualBuild: true,
        buildGuide: "/docs/BUILD_GUIDE.md",
      }, { status: 400 });
    }

    // 执行构建脚本
    const buildCommand = buildType === "debug"
      ? "cd mobile-app && ./scripts/build-android.sh debug"
      : "cd mobile-app && ./scripts/build-android.sh release";

    try {
      const { stdout, stderr } = await execAsync(buildCommand, {
        timeout: 300000, // 5分钟超时
      });

      // 查找生成的APK文件
      const apkPath = buildType === "debug"
        ? "mobile-app/android/app/build/outputs/apk/debug/app-debug.apk"
        : "mobile-app/android/app/build/outputs/apk/release/app-release.apk";

      // 检查文件是否存在
      const fs = require("fs");
      if (!fs.existsSync(apkPath)) {
        return NextResponse.json({
          success: false,
          error: "构建完成但未找到APK文件",
          stdout,
          stderr,
        }, { status: 500 });
      }

      // 复制到/tmp目录供下载
      const filename = `project-management-${buildType}-${Date.now()}.apk`;
      const destPath = `/tmp/${filename}`;
      fs.copyFileSync(apkPath, destPath);

      return NextResponse.json({
        success: true,
        data: {
          filename,
          downloadUrl: `/api/mobile-app/download/${filename}`,
          apkPath,
          buildType,
          stdout,
        },
      });
    } catch (execError: any) {
      return NextResponse.json({
        success: false,
        error: "构建失败",
        message: execError.message,
        stderr: execError.stderr,
        requiresManualBuild: true,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("触发构建失败:", error);
    return NextResponse.json(
      { success: false, error: "构建请求失败" },
      { status: 500 }
    );
  }
}

// 检查命令是否存在
async function checkCommand(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}
