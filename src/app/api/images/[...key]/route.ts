import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// GET /api/images/[...key] - 获取图片（动态生成签名 URL）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string | string[] }> }
) {
  try {
    const { key: keyParam } = await params;
    // key 可能是字符串（单层路径）或数组（多层路径）
    const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;

    // 验证 key 是否有效
    if (!key || key.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid key" },
        { status: 400 }
      );
    }

    console.log(`[ImageProxy] Requesting image with key: ${key}`);

    // 生成新的签名 URL（1小时有效期）
    const imageUrl = await storage.generatePresignedUrl({
      key: key,
      expireTime: 3600, // 1 小时
    });

    console.log(`[ImageProxy] Generated presigned URL for key: ${key}`);

    // 重定向到签名 URL
    return NextResponse.redirect(imageUrl);
  } catch (error) {
    console.error("[ImageProxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get image" },
      { status: 500 }
    );
  }
}
