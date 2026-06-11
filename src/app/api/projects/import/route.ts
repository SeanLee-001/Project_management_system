import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database";
import * as XLSX from 'xlsx';

// POST /api/projects/import - 从Excel导入项目
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请上传文件' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // 转换数据格式
    const projectsToCreate = jsonData.map((row: any) => {
      // 状态映射
      const statusMap: Record<string, string> = {
        '进行中': 'active',
        '已完成': 'completed',
        '已暂停': 'paused',
        '已取消': 'cancelled',
      };

      // 日期转换函数
      const parseDate = (value: any): Date | undefined => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (typeof value === 'number') {
          // Excel日期是数字，需要转换
          return new Date((value - 25569) * 86400 * 1000);
        }
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? undefined : parsed;
      };

      return {
        name: row['项目名称'] || '',
        projectCode: row['项目编号'] || '',
        description: row['项目描述'] || '',
        status: (statusMap[row['状态']] as 'active' | 'completed' | 'paused' | 'cancelled') || 'active',
        startDate: parseDate(row['开始日期']),
        endDate: parseDate(row['结束日期']),
        materialCode: row['物料编码'] || '',
        productName: row['产品名称'] || '',
        specification: row['规格型号'] || '',
        customerName: row['客户名称'] || '',
        technicalContactName: row['技术联系人'] || '',
        technicalContactPhone: row['技术联系电话'] || '',
        projectManager: row['项目经理'] || '',
        projectManagerPhone: row['项目经理电话'] || '',
        mechanicalLead: row['机械负责人'] || '',
        mechanicalLeadPhone: row['机械负责人电话'] || '',
        electricalLead: row['电气负责人'] || '',
        electricalLeadPhone: row['电气负责人电话'] || '',
        visualLead: row['视觉负责人'] || '',
        visualLeadPhone: row['视觉负责人电话'] || '',
        softwareLead: row['软件负责人'] || '',
        softwareLeadPhone: row['软件负责人电话'] || '',
        algorithmLead: row['算法负责人'] || '',
        algorithmLeadPhone: row['算法负责人电话'] || '',
        procurement: row['采购'] || '',
        planning: row['计划'] || '',
        production: row['生产'] || '',
        quality: row['质量'] || '',
        fieldProjectLead: row['现场负责人'] || '',
        business: row['商务'] || '',
        safety: row['安全'] || '',
        safetyLeadPhone: row['安全负责人电话'] || '',
        orderNumber: row['订单号'] || '',
        orderDate: parseDate(row['订单日期']),
        deliveryDate: parseDate(row['交付日期']),
        quantity: row['数量'] ? String(row['数量']) : '',
        contractCode: row['合同编号'] || '',
        contractName: row['合同名称'] || '',
        contractDate: parseDate(row['合同日期']),
      };
    });

    // 批量创建项目
    const createdProjects = [];
    const failedProjects = [];

    for (const projectData of projectsToCreate) {
      try {
        if (!projectData.name) {
          failedProjects.push({
            data: projectData,
            error: '项目名称不能为空',
          });
          continue;
        }

        const project = await projectManager.createProject(projectData);
        createdProjects.push(project);
      } catch (error: any) {
        failedProjects.push({
          data: projectData,
          error: error?.message || error?.toString() || '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: projectsToCreate.length,
        created: createdProjects.length,
        failed: failedProjects.length,
        createdProjects,
        failedProjects,
      },
    });
  } catch (error: any) {
    console.error('Error importing projects:', error);
    const errorMessage = error?.message || error?.toString() || '导入项目失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
