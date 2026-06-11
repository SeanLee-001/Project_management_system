import { NextRequest, NextResponse } from "next/server";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken } from "@/lib/auth";
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // 验证权限
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "未授权，请先登录" },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "无效的认证信息" },
        { status: 401 }
      );
    }

    const currentUser = await userManager.getUserById(decoded.userId);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "用户不存在" },
        { status: 401 }
      );
    }

    // 检查是否是系统管理员
    if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以导入用户" },
        { status: 403 }
      );
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请选择要导入的Excel文件" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, error: "请上传Excel文件（.xlsx或.xls格式）" },
        { status: 400 }
      );
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: "Excel文件中没有找到工作表" },
        { status: 400 }
      );
    }

    const data: any[] = [];
    const errors: any[] = [];

    let rowIndex = 6;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 6) return;

      const rowData: any = {};
      const username = row.getCell(1).value?.toString().trim();
      const email = row.getCell(2).value?.toString().trim();
      const password = row.getCell(3).value?.toString().trim();

      if (!username) {
        errors.push({
          row: rowNumber,
          field: '用户名',
          message: '用户名不能为空',
        });
        return;
      }

      if (!email) {
        errors.push({
          row: rowNumber,
          field: '邮箱',
          message: '邮箱不能为空',
        });
        return;
      }

      if (!password) {
        errors.push({
          row: rowNumber,
          field: '密码',
          message: '密码不能为空',
        });
        return;
      }

      rowData.username = username;
      rowData.email = email;
      rowData.password = password;
      rowData.fullName = row.getCell(4).value?.toString().trim() || null;
      rowData.role = row.getCell(5).value?.toString().trim() || 'project_member';
      rowData.isActive = row.getCell(6).value?.toString().trim() === 'true' ? true : (row.getCell(6).value?.toString().trim() === 'false' ? false : true);

      if (username) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有找到有效的数据行" },
        { status: 400 }
      );
    }

    const createdUsers = [];
    const importErrors = [];

    for (const item of data) {
      try {
        // 加密密码
        const hashedPassword = await bcrypt.hash(item.password, 10);
        item.password = hashedPassword;

        const user = await userManager.createUser(item);
        createdUsers.push(user);
      } catch (error: any) {
        importErrors.push({
          username: item.username,
          error: error?.message || '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        success: createdUsers.length,
        failed: importErrors.length,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error importing users:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "导入失败" },
      { status: 500 }
    );
  }
}
