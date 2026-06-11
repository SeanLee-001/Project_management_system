import ExcelJS from 'exceljs';

export interface ImportColumn {
  header: string;
  key: string;
  required?: boolean;
  example?: string;
}

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/**
 * 读取Excel文件并转换为JSON数组
 */
export async function readExcelFile(file: File): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel文件中没有找到工作表');
  }

  const data: any[] = [];
  const headers: string[] = [];

  // 读取表头
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString().trim() || '';
  });

  // 读取数据行
  let rowIndex = 2;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // 跳过表头

    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      if (headers[colNumber - 1]) {
        rowData[headers[colNumber - 1]] = cell.value;
      }
    });

    // 只添加非空行
    if (Object.keys(rowData).some(key => rowData[key] !== undefined && rowData[key] !== null && rowData[key] !== '')) {
      rowData._rowNumber = rowNumber;
      data.push(rowData);
    }
  });

  return data;
}

/**
 * 验证导入数据
 */
export function validateImportData<T>(
  data: any[],
  columns: ImportColumn[],
  rowMapper?: (row: any) => T
): ImportResult<T> {
  const errors: ImportResult<T>['errors'] = [];
  const validData: T[] = [];

  data.forEach((row, index) => {
    const rowData: any = {};
    let hasError = false;

    // 验证必填字段
    columns.forEach(col => {
      const value = row[col.header];

      if (col.required && (value === undefined || value === null || value === '')) {
        errors.push({
          row: index + 1,
          field: col.header,
          message: `${col.header}不能为空`,
        });
        hasError = true;
      }

      if (value !== undefined && value !== null && value !== '') {
        rowData[col.key] = value;
      }
    });

    if (!hasError && rowMapper) {
      try {
        const mappedData = rowMapper(rowData);
        validData.push(mappedData);
      } catch (error: any) {
        errors.push({
          row: index + 1,
          field: 'all',
          message: error.message || '数据格式错误',
        });
      }
    } else if (!hasError) {
      validData.push(rowData as T);
    }
  });

  return {
    success: errors.length === 0,
    data: validData,
    errors,
  };
}

/**
 * 生成导入模板
 */
export async function generateImportTemplate(
  columns: ImportColumn[],
  fileName: string,
  sheetName: string = '导入模板'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // 添加说明行
  const instructionRow = worksheet.addRow(['使用说明：']);
  instructionRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
  worksheet.addRow(['1. 请严格按照模板格式填写数据']);
  worksheet.addRow(['2. 标有 * 的列为必填项']);
  worksheet.addRow(['3. 第一行为表头，请勿修改']);
  worksheet.addRow(['4. 填写完成后请删除此说明区域']);
  worksheet.addRow([]); // 空行

  // 添加示例行
  const exampleRow = worksheet.addRow(['示例数据：']);
  exampleRow.font = { bold: true, size: 12, color: { argb: 'FF000000' } };

  const exampleData: any = {};
  columns.forEach(col => {
    exampleData[col.header] = col.example || (col.required ? '示例值' : '可选值');
  });
  worksheet.addRow(exampleData);
  worksheet.addRow([]); // 空行

  // 添加表头
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // 添加必填标记
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    if (col.required) {
      cell.value = `${col.header} *`;
    }
  });

  // 设置列宽
  worksheet.columns = columns.map(col => ({
    width: Math.max(col.header.length + (col.required ? 2 : 0), 20),
  }));

  // 添加边框
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 6) return; // 跳过说明行
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // 生成并下载文件
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_导入模板.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 产品导入配置
 */
export const productImportColumns: ImportColumn[] = [
  { header: '物料编码', key: 'materialCode', required: true, example: 'MAT001' },
  { header: '项目名称', key: 'projectName', required: true, example: '测试项目' },
  { header: '规格型号', key: 'specification', required: false, example: '规格A' },
  { header: '产品描述', key: 'description', required: false, example: '这是产品描述' },
  { header: '状态', key: 'status', required: false, example: 'active' },
];

/**
 * 订单导入配置
 */
export const orderImportColumns: ImportColumn[] = [
  { header: '订单号', key: 'orderNumber', required: false, example: 'ORD001' },
  { header: '订单日期', key: 'orderDate', required: true, example: '2024-01-01' },
  { header: '合同号', key: 'contractCode', required: false, example: 'CT001' },
  { header: '客户编码', key: 'customerCode', required: false, example: 'C001' },
  { header: '客户名称', key: 'customerName', required: false, example: '客户A' },
  { header: '物料编码', key: 'materialCode', required: false, example: 'MAT001' },
  { header: '项目名称', key: 'projectName', required: false, example: '测试项目' },
  { header: '规格型号', key: 'specification', required: false, example: '规格A' },
  { header: '数量', key: 'quantity', required: false, example: '10' },
  { header: '订单金额', key: 'orderAmount', required: false, example: '100000' },
  { header: '付款条件', key: 'paymentTerms', required: false, example: '30%/50%/20%' },
  { header: '预付款比率', key: 'prepayRatio', required: false, example: '30%' },
  { header: '到货款比率', key: 'arrivalRatio', required: false, example: '50%' },
  { header: '验收款比率', key: 'acceptanceRatio', required: false, example: '15%' },
  { header: '质保款比率', key: 'warrantyRatio', required: false, example: '5%' },
  { header: '状态', key: 'status', required: false, example: 'active' },
];

/**
 * 合同导入配置
 */
export const contractImportColumns: ImportColumn[] = [
  { header: '合同编码', key: 'contractCode', required: true, example: 'CT001' },
  { header: '合同名称', key: 'contractName', required: true, example: '测试合同' },
  { header: '合同日期', key: 'contractDate', required: false, example: '2024-01-01' },
  { header: '客户编码', key: 'customerCode', required: true, example: 'C001' },
  { header: '客户名称', key: 'customerName', required: true, example: '客户A' },
  { header: '合同金额', key: 'contractAmount', required: false, example: '1000000' },
  { header: '技术负责人', key: 'technicalManager', required: false, example: '张三' },
  { header: '技术负责人电话', key: 'technicalPhone', required: false, example: '13800138000' },
  { header: '采购负责人', key: 'procurementManager', required: false, example: '李四' },
  { header: '采购负责人电话', key: 'procurementPhone', required: false, example: '13900139000' },
  { header: '状态', key: 'status', required: false, example: 'active' },
];

/**
 * 客户导入配置
 */
export const customerImportColumns: ImportColumn[] = [
  { header: '客户编码', key: 'customerCode', required: true, example: 'C001' },
  { header: '客户名称', key: 'customerName', required: true, example: '客户A' },
  { header: '行业', key: 'industry', required: false, example: '制造业' },
  { header: '地址', key: 'address', required: false, example: '北京市朝阳区' },
  { header: '电话', key: 'phone', required: false, example: '010-12345678' },
  { header: '邮箱', key: 'email', required: false, example: 'customer@example.com' },
  { header: '联系人', key: 'contact', required: false, example: '张三' },
  { header: '状态', key: 'status', required: false, example: 'active' },
];

/**
 * 用户导入配置
 */
export const userImportColumns: ImportColumn[] = [
  { header: '用户名', key: 'username', required: true, example: 'zhangsan' },
  { header: '邮箱', key: 'email', required: true, example: 'zhangsan@example.com' },
  { header: '密码', key: 'password', required: true, example: '123456' },
  { header: '姓名', key: 'fullName', required: false, example: '张三' },
  { header: '角色', key: 'role', required: false, example: 'project_manager' },
  { header: '状态', key: 'isActive', required: false, example: 'true' },
];

/**
 * 项目导入配置
 */
export const projectImportColumns: ImportColumn[] = [
  { header: '项目名称', key: 'name', required: true, example: '测试项目' },
  { header: '项目描述', key: 'description', required: false, example: '项目描述' },
  { header: '状态', key: 'status', required: false, example: 'active' },
  { header: '开始日期', key: 'startDate', required: false, example: '2024-01-01' },
  { header: '结束日期', key: 'endDate', required: false, example: '2024-12-31' },
  { header: '项目编码', key: 'projectCode', required: false, example: 'PRJ001' },
  { header: '物料编码', key: 'materialCode', required: false, example: 'MAT001' },
  { header: '产品名称', key: 'productName', required: false, example: '测试产品' },
  { header: '规格型号', key: 'specification', required: false, example: '规格A' },
  { header: '客户ID', key: 'customerId', required: false, example: '客户ID（从客户管理获取）' },
  { header: '客户名称', key: 'customerName', required: false, example: '客户A' },
  { header: '技术联系人姓名', key: 'technicalContactName', required: false, example: '张三' },
  { header: '技术联系人电话', key: 'technicalContactPhone', required: false, example: '13800138000' },
  { header: '技术联系人邮箱', key: 'technicalContactEmail', required: false, example: 'zhangsan@example.com' },
  { header: '项目经理ID', key: 'projectManager', required: false, example: '用户ID（从用户管理获取）' },
  { header: '项目经理电话', key: 'projectManagerPhone', required: false, example: '13800138000' },
  { header: '项目管理ID', key: 'projectManagement', required: false, example: '用户ID' },
  { header: '机械负责人ID', key: 'mechanicalLead', required: false, example: '用户ID' },
  { header: '机械负责人电话', key: 'mechanicalLeadPhone', required: false, example: '13800138000' },
  { header: '电气负责人ID', key: 'electricalLead', required: false, example: '用户ID' },
  { header: '电气负责人电话', key: 'electricalLeadPhone', required: false, example: '13800138000' },
  { header: '视觉负责人ID', key: 'visualLead', required: false, example: '用户ID' },
  { header: '视觉负责人电话', key: 'visualLeadPhone', required: false, example: '13800138000' },
  { header: '软件负责人ID', key: 'softwareLead', required: false, example: '用户ID' },
  { header: '软件负责人电话', key: 'softwareLeadPhone', required: false, example: '13800138000' },
  { header: '算法负责人ID', key: 'algorithmLead', required: false, example: '用户ID' },
  { header: '算法负责人电话', key: 'algorithmLeadPhone', required: false, example: '13800138000' },
  { header: '采购ID', key: 'procurement', required: false, example: '用户ID' },
  { header: '计划ID', key: 'planning', required: false, example: '用户ID' },
  { header: '生产ID', key: 'production', required: false, example: '用户ID' },
  { header: '质量ID', key: 'quality', required: false, example: '用户ID' },
  { header: '现场项目负责人ID', key: 'fieldProjectLead', required: false, example: '用户ID' },
  { header: '商务负责人ID', key: 'business', required: false, example: '用户ID' },
  { header: '安全负责人ID', key: 'safety', required: false, example: '用户ID' },
  { header: '安全负责人电话', key: 'safetyLeadPhone', required: false, example: '13800138000' },
  { header: '订单编码', key: 'orderNumber', required: false, example: 'ORD001' },
  { header: '订单日期', key: 'orderDate', required: false, example: '2024-01-01' },
  { header: '订单交付日期', key: 'deliveryDate', required: false, example: '2024-06-01' },
  { header: '订单数量', key: 'quantity', required: false, example: '10' },
  { header: '合同编码', key: 'contractCode', required: false, example: 'CT001' },
  { header: '合同名称', key: 'contractName', required: false, example: '测试合同' },
  { header: '合同日期', key: 'contractDate', required: false, example: '2024-01-01' },
  { header: '备注', key: 'notes', required: false, example: '备注信息' },
];
