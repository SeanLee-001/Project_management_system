import ExcelJS from 'exceljs';
import { formatDuration } from '@/lib/userAgentParser';

export interface ExportColumn<T> {
  header: string;
  key: keyof T;
  width?: number;
  formatter?: (value: any, row: T) => string | number;
}

/**
 * 导出数据到Excel文件
 */
export async function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  fileName: string,
  sheetName: string = '数据',
  options?: {
    title?: string;
    subtitle?: string;
    showStats?: boolean;
    stats?: { label: string; value: string | number }[];
  }
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '项目管理系统';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  let currentRow = 1;

  // 添加标题
  if (options?.title) {
    const titleRow = worksheet.addRow([options.title]);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
    currentRow++;
  }

  // 添加副标题
  if (options?.subtitle) {
    const subtitleRow = worksheet.addRow([options.subtitle]);
    subtitleRow.font = { size: 11, color: { argb: 'FF6B7280' } };
    subtitleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
    currentRow++;
  }

  // 空行
  if (options?.title || options?.subtitle) {
    currentRow++;
  }

  // 添加统计信息
  if (options?.showStats && options?.stats) {
    options.stats.forEach((stat) => {
      const statRow = worksheet.addRow([stat.label, stat.value]);
      statRow.font = { size: 11 };
      statRow.getCell(1).font = { bold: true, size: 11 };
      currentRow++;
    });
    currentRow++; // 空行
  }

  // 添加表头
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // 添加表头边框
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });

  // 添加数据行
  data.forEach((item, index) => {
    const rowData = columns.map(col => {
      const value = item[col.key];
      if (col.formatter) {
        return col.formatter(value, item);
      }
      return value ?? '';
    });

    const dataRow = worksheet.addRow(rowData);
    dataRow.font = { size: 10 };
    dataRow.alignment = { vertical: 'middle' };

    // 交替行背景色
    if (index % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        };
      });
    }

    // 添加边框
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
  worksheet.columns = columns.map(col => ({
    width: col.width || 15,
  }));

  // 添加导出时间
  currentRow = worksheet.rowCount + 2;
  const footerRow = worksheet.addRow([`导出时间: ${new Date().toLocaleString('zh-CN')}`]);
  footerRow.font = { size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
  worksheet.mergeCells(currentRow, 1, currentRow, columns.length);

  // 生成并下载文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导出登录日志到Excel
 */
export async function exportLoginLogsToExcel(
  logs: any[],
  stats?: {
    totalLogins: number;
    sensitiveCount: number;
    uniqueUsers: number;
    avgLoginDuration: number;
  }
): Promise<void> {
  const SENSITIVE_OPERATION_LABELS: Record<string, string> = {
    ip_changed: 'IP地址变更',
    password_changed: '密码修改',
    mac_bound: 'MAC地址绑定',
  };

  const LOGIN_METHOD_LABELS: Record<string, string> = {
    password: '密码登录',
    mac: 'MAC地址登录',
  };

  const columns: ExportColumn<any>[] = [
    { header: '序号', key: 'id' as any, width: 8, formatter: (_: any, row: any) => row._index ?? 1 },
    { header: '用户名', key: 'username', width: 12 },
    { header: '工号', key: 'employeeNumber', width: 12, formatter: (v) => v || '-' },
    { header: '姓名', key: 'fullName', width: 12, formatter: (v) => v || '-' },
    { header: '登录时间', key: 'loginTime', width: 20, formatter: (v) => new Date(v).toLocaleString('zh-CN') },
    { header: '登出时间', key: 'logoutTime', width: 20, formatter: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
    { header: '登录时长', key: 'loginDuration', width: 12, formatter: (v) => v ? formatDuration(v) : '-' },
    { header: '登录IP', key: 'ipAddress', width: 15 },
    { header: '上次IP', key: 'previousIpAddress', width: 15, formatter: (v) => v || '-' },
    { header: '设备类型', key: 'deviceType', width: 10, formatter: (v) => v || '-' },
    { header: '浏览器', key: 'browser', width: 18, formatter: (v) => v || '-' },
    { header: '操作系统', key: 'os', width: 15, formatter: (v) => v || '-' },
    { header: '登录方式', key: 'loginMethod', width: 12, formatter: (v) => LOGIN_METHOD_LABELS[v] || v },
    { header: '登录状态', key: 'loginStatus', width: 10, formatter: (v) => v === 'success' ? '成功' : '失败' },
    { header: '敏感操作', key: 'isSensitiveOperation', width: 12, formatter: (v, row) => 
      v ? (SENSITIVE_OPERATION_LABELS[row.sensitiveOperationType] || row.sensitiveOperationType || '是') : '否'
    },
    { header: '错误信息', key: 'errorMessage', width: 20, formatter: (v) => v || '-' },
  ];

  // 添加序号
  const logsWithIndex = logs.map((log, i) => ({ ...log, _index: i + 1 }));

  const statsArray = stats ? [
    { label: '统计时间范围', value: `${new Date().toLocaleDateString('zh-CN')}` },
    { label: '总登录次数', value: stats.totalLogins },
    { label: '敏感操作次数', value: stats.sensitiveCount },
    { label: '活跃用户数', value: stats.uniqueUsers },
    { label: '平均登录时长', value: formatDuration(stats.avgLoginDuration) },
  ] : undefined;

  await exportToExcel(logsWithIndex, columns as any, `登录日志_${new Date().toISOString().split('T')[0]}`, '登录日志', {
    title: '登录日志统计报表',
    subtitle: `导出时间: ${new Date().toLocaleString('zh-CN')}`,
    showStats: true,
    stats: statsArray,
  });
}

/**
 * 导出合同数据到Excel
 */
export async function exportContracts(contracts: any[]): Promise<void> {
  const columns: ExportColumn<any>[] = [
    { header: '合同编号', key: 'contractCode', width: 15 },
    { header: '合同名称', key: 'contractName', width: 25 },
    { header: '客户名称', key: 'customerName', width: 20 },
    { header: '合同金额', key: 'contractAmount', width: 12 },
    { header: '签订日期', key: 'signDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { header: '生效日期', key: 'effectiveDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { header: '到期日期', key: 'expiryDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { header: '合同状态', key: 'status', width: 10, formatter: (v) => v === 'active' ? '有效' : '无效' },
    { header: '备注', key: 'remarks', width: 30, formatter: (v) => v || '-' },
  ];

  await exportToExcel(contracts, columns as any, `合同数据_${new Date().toISOString().split('T')[0]}`, '合同数据', {
    title: '合同数据报表',
    subtitle: `导出时间: ${new Date().toLocaleString('zh-CN')}`,
  });
}

/**
 * 导出订单数据到Excel
 */
export async function exportOrders(orders: any[]): Promise<void> {
  const columns: ExportColumn<any>[] = [
    { header: '订单编号', key: 'orderCode', width: 15 },
    { header: '订单名称', key: 'orderName', width: 25 },
    { header: '客户名称', key: 'customerName', width: 20 },
    { header: '产品名称', key: 'productName', width: 20 },
    { header: '订单金额', key: 'orderAmount', width: 12 },
    { header: '订单数量', key: 'quantity', width: 10 },
    { header: '下单日期', key: 'orderDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { header: '交付日期', key: 'deliveryDate', width: 15, formatter: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { header: '订单状态', key: 'status', width: 10, formatter: (v) => v || '-' },
    { header: '备注', key: 'remarks', width: 30, formatter: (v) => v || '-' },
  ];

  await exportToExcel(orders, columns as any, `订单数据_${new Date().toISOString().split('T')[0]}`, '订单数据', {
    title: '订单数据报表',
    subtitle: `导出时间: ${new Date().toLocaleString('zh-CN')}`,
  });
}
