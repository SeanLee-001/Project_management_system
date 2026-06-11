import { NextRequest, NextResponse } from "next/server";
import { systemLogManager } from "@/storage/database";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import { verifyToken } from "@/lib/auth";
import ExcelJS from 'exceljs';

// GET /api/system-logs/export - 导出系统日志为Excel（仅系统管理员）
export async function GET(request: NextRequest) {
  try {
    // 从cookie中获取token
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 验证token并获取用户信息
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    // 从数据库获取用户信息
    const user = await userManager.getUserById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 401 }
      );
    }

    // 检查用户是否是系统管理员
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以导出系统日志" },
        { status: 403 }
      );
    }
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const resource = searchParams.get("resource") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // 获取所有符合条件的日志（不分页）
    const logs = await systemLogManager.getLogs({
      filters: {
        userId: userId || undefined,
        action: action || undefined,
        resource: resource || undefined,
        status: status as any || undefined,
      },
      search,
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("系统日志");

    // 定义列
    worksheet.columns = [
      { header: "ID", key: "id", width: 36 },
      { header: "操作类型", key: "action", width: 15 },
      { header: "资源类型", key: "resource", width: 15 },
      { header: "资源ID", key: "resourceId", width: 36 },
      { header: "用户名", key: "username", width: 20 },
      { header: "姓名", key: "fullName", width: 20 },
      { header: "详情", key: "details", width: 40 },
      { header: "IP地址", key: "ipAddress", width: 18 },
      { header: "浏览器信息", key: "userAgent", width: 50 },
      { header: "状态", key: "status", width: 10 },
      { header: "错误信息", key: "errorMessage", width: 40 },
      { header: "操作时间", key: "createdAt", width: 25 },
    ];

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 30;

    // 添加数据
    logs.forEach((log) => {
      const actionMap: Record<string, string> = {
        login: "登录",
        logout: "登出",
        create: "创建",
        update: "更新",
        delete: "删除",
        approve: "审核通过",
        reject: "审核拒绝",
        reset_password: "重置密码",
        change_password: "修改密码",
        import: "导入",
        export: "导出",
      };

      const resourceMap: Record<string, string> = {
        user: "用户",
        project: "项目",
        task: "任务",
        customer: "客户",
        contract: "合同",
        order: "订单",
        product: "产品",
        message: "消息",
        system: "系统",
      };

      const statusMap: Record<string, string> = {
        success: "成功",
        failed: "失败",
      };

      // 格式化时间
      const createdAt = new Date(log.createdAt);
      const formattedTime = createdAt.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      worksheet.addRow({
        id: log.id,
        action: actionMap[log.action] || log.action,
        resource: log.resource ? resourceMap[log.resource] || log.resource : "",
        resourceId: log.resourceId || "",
        username: log.username || "",
        fullName: log.fullName || "",
        details: log.details || "",
        ipAddress: log.ipAddress || "",
        userAgent: log.userAgent || "",
        status: statusMap[log.status] || log.status,
        errorMessage: log.errorMessage || "",
        createdAt: formattedTime,
      });
    });

    // 设置数据行样式
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });

      // 根据状态设置行背景色
      const statusCell = row.getCell('status');
      if (statusCell.value === "成功") {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F7E6' },
          };
        });
      } else if (statusCell.value === "失败") {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAD9CE' },
          };
        });
      }
    });

    // 添加筛选器
    worksheet.autoFilter = {
      from: 'A1',
      to: 'L1',
    };

    // 设置行高
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.height = 30;
      } else {
        row.height = 25;
      }
    });

    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer();

    // 生成文件名（包含时间戳）
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const filename = `系统日志_${timestamp}.xlsx`;

    // 返回Excel文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error("导出系统日志失败:", error);
    return NextResponse.json(
      { success: false, error: "导出系统日志失败" },
      { status: 500 }
    );
  }
}
