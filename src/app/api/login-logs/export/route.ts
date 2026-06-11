import { NextRequest, NextResponse } from "next/server";
import { loginLogManager } from "@/storage/database";
import { verifyToken } from "@/lib/auth";
import { userManager } from "@/storage/database";
import { UserRole } from "@/storage/database/shared/schema";
import ExcelJS from 'exceljs';

const SENSITIVE_OPERATION_LABELS: Record<string, string> = {
  ip_changed: "IP地址变更",
  password_changed: "密码修改",
  mac_bound: "MAC地址绑定",
};

const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: "密码登录",
  mac: "MAC地址登录",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}小时${minutes}分` : `${hours}小时`;
  }
}

// GET /api/login-logs/export - 导出登录日志到Excel
export async function GET(request: NextRequest) {
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
    if (!currentUser || currentUser.role !== UserRole.SYSTEM_ADMIN) {
      return NextResponse.json(
        { success: false, error: "只有系统管理员可以导出登录日志" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const isSensitiveOnly = searchParams.get("isSensitiveOperation") === "true";

    // 处理日期范围，确保包含整天
    let startDate: Date;
    let endDate: Date;
    
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setUTCHours(23, 59, 59, 999); // 设置为当天 23:59:59.999 UTC
    } else {
      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
    }
    
    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setUTCHours(0, 0, 0, 0); // 设置为当天 00:00:00 UTC
    } else {
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setUTCHours(0, 0, 0, 0);
    }

    // 获取所有日志（不分页）
    const logs = await loginLogManager.getLogs({
      limit: 10000,
      startDate,
      endDate,
      isSensitiveOperation: isSensitiveOnly ? true : undefined,
    });

    // 创建Excel工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '项目管理系统';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('登录日志');

    // 添加标题
    const titleRow = worksheet.addRow(['登录日志统计报表']);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(1, 1, 1, 16);

    // 添加副标题
    const subtitleRow = worksheet.addRow([`统计时间: ${startDate.toLocaleDateString('zh-CN')} - ${endDate.toLocaleDateString('zh-CN')} | 导出时间: ${new Date().toLocaleString('zh-CN')}`]);
    subtitleRow.font = { size: 11, color: { argb: 'FF6B7280' } };
    subtitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(2, 1, 2, 16);

    // 空行
    worksheet.addRow([]);

    // 统计信息
    const statsData = await loginLogManager.getLogCount({ startDate, endDate, loginStatus: "success" });
    const sensitiveCount = await loginLogManager.getLogCount({ startDate, endDate, isSensitiveOperation: true });
    const activeUsers = await loginLogManager.getActiveUsers(startDate, endDate, 1000);

    worksheet.addRow(['统计概览']);
    worksheet.addRow(['总登录次数:', statsData]);
    worksheet.addRow(['敏感操作次数:', sensitiveCount]);
    worksheet.addRow(['活跃用户数:', activeUsers.length]);
    worksheet.addRow([]);

    // 表头
    const headers = ['序号', '用户名', '工号', '姓名', '登录时间', '登出时间', '登录时长', '登录IP', '上次IP', '设备类型', '浏览器', '操作系统', '登录方式', '登录状态', '敏感操作', '错误信息'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    // 数据行
    logs.forEach((log, index) => {
      const rowData = [
        index + 1,
        log.username,
        log.employeeNumber || '-',
        log.fullName || '-',
        new Date(log.loginTime).toLocaleString('zh-CN'),
        log.logoutTime ? new Date(log.logoutTime).toLocaleString('zh-CN') : '-',
        log.loginDuration ? formatDuration(log.loginDuration) : '-',
        log.ipAddress,
        log.previousIpAddress || '-',
        log.deviceType || '-',
        log.browser || '-',
        log.os || '-',
        LOGIN_METHOD_LABELS[log.loginMethod] || log.loginMethod,
        log.loginStatus === 'success' ? '成功' : '失败',
        log.isSensitiveOperation ? (SENSITIVE_OPERATION_LABELS[log.sensitiveOperationType || ''] || log.sensitiveOperationType || '是') : '否',
        log.errorMessage || '-',
      ];

      const dataRow = worksheet.addRow(rowData);
      dataRow.font = { size: 10 };
      dataRow.alignment = { vertical: 'middle' };

      // 敏感操作行高亮
      if (log.isSensitiveOperation) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' },
          };
        });
      } else if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' },
          };
        });
      }

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // 设置列宽
    worksheet.columns = [
      { width: 8 },   // 序号
      { width: 12 },  // 用户名
      { width: 12 },  // 工号
      { width: 12 },  // 姓名
      { width: 20 },  // 登录时间
      { width: 20 },  // 登出时间
      { width: 12 },  // 登录时长
      { width: 15 },  // 登录IP
      { width: 15 },  // 上次IP
      { width: 10 },  // 设备类型
      { width: 18 },  // 浏览器
      { width: 15 },  // 操作系统
      { width: 12 },  // 登录方式
      { width: 10 },  // 登录状态
      { width: 12 },  // 敏感操作
      { width: 20 },  // 错误信息
    ];

    // 生成文件
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="login_logs_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting login logs:", error);
    return NextResponse.json(
      { success: false, error: "导出登录日志失败" },
      { status: 500 }
    );
  }
}
