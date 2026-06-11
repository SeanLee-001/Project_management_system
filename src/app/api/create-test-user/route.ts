import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🚀 创建测试用户...");
    
    const response = await fetch("http://localhost:5000/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    const data = await response.json();
    
    if (data.success) {
      return NextResponse.json({
        success: true,
        message: "测试用户创建成功",
        data: data.data,
      });
    }
    
    return NextResponse.json({
      success: false,
      error: data.error || "创建失败",
    }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "创建测试用户失败",
    }, { status: 500 });
  }
}
