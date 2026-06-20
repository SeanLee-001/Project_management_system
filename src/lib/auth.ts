import { NextRequest } from "next/server";
import { userManager } from "@/storage/database";
import * as crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Base64编码辅助函数
function base64UrlEncode(data: Buffer): string {
  return data
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Base64解码辅助函数
function base64UrlDecode(str: string): Buffer {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

// 生成 JWT token
export function generateToken(userId: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// 验证 JWT token
export async function verifyToken(token: string): Promise<any | null> {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".");

    if (!encodedHeader || !encodedPayload || !signature) {
      return null;
    }

    // 验证签名
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    if (signature !== expectedSignature) {
      return null;
    }

    // 解码payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString());

    // 检查是否过期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// 验证token并获取用户信息
export async function getUserFromToken(request: NextRequest): Promise<any | null> {
  try {
    let token: string | undefined;

    // 1. 尝试从 Authorization Header 获取 token（Bearer token）
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
      console.log("[getUserFromToken] Token from Authorization header:", token ? "EXISTS" : "NOT FOUND");
    }

    // 2. 如果 Header 中没有，尝试从 cookie 获取
    if (!token) {
      token = request.cookies.get("token")?.value;
      console.log("[getUserFromToken] Token from cookie:", token ? "EXISTS" : "NOT FOUND");
    }

    if (!token) {
      return null;
    }

    // 验证token
    const payload = await verifyToken(token);

    if (!payload) {
      return null;
    }

    // 从数据库获取用户信息
    const user = await userManager.getUserById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    const { password: _, passwordExpireAt: __, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

// 检查用户是否是系统管理员
export function isSystemAdmin(user: any): boolean {
  return user?.role === "system_admin";
}
