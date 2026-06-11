import { NextRequest, NextResponse } from "next/server";
import { projectManager } from "@/storage/database";
import * as XLSX from 'xlsx';

// GET /api/projects/export - 导出所有项目到Excel
export async function GET(request: NextRequest) {
  try {
    const projects = await projectManager.getProjects();

    // 转换数据为Excel友好的格式
    const excelData = projects.map((project: any) => ({
      '项目名称': project.name,
      '项目编号': project.projectCode || '',
      '项目描述': project.description || '',
      '状态': project.status === 'active' ? '进行中' :
              project.status === 'completed' ? '已完成' :
              project.status === 'paused' ? '已暂停' :
              project.status === 'cancelled' ? '已取消' : '',
      '开始日期': project.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN') : '',
      '结束日期': project.endDate ? new Date(project.endDate).toLocaleDateString('zh-CN') : '',
      '物料编码': project.materialCode || '',
      '产品名称': project.productName || '',
      '规格型号': project.specification || '',
      '客户名称': project.customerName || '',
      '技术联系人': project.technicalContactName || '',
      '技术联系电话': project.technicalContactPhone || '',
      '项目经理': project.projectManager || '',
      '项目经理电话': project.projectManagerPhone || '',
      '机械负责人': project.mechanicalLead || '',
      '机械负责人电话': project.mechanicalLeadPhone || '',
      '电气负责人': project.electricalLead || '',
      '电气负责人电话': project.electricalLeadPhone || '',
      '视觉负责人': project.visualLead || '',
      '视觉负责人电话': project.visualLeadPhone || '',
      '软件负责人': project.softwareLead || '',
      '软件负责人电话': project.softwareLeadPhone || '',
      '算法负责人': project.algorithmLead || '',
      '算法负责人电话': project.algorithmLeadPhone || '',
      '采购': project.procurement || '',
      '计划': project.planning || '',
      '生产': project.production || '',
      '质量': project.quality || '',
      '现场负责人': project.fieldProjectLead || '',
      '商务': project.business || '',
      '安全': project.safety || '',
      '安全负责人电话': project.safetyLeadPhone || '',
      '订单号': project.orderNumber || '',
      '订单日期': project.orderDate ? new Date(project.orderDate).toLocaleDateString('zh-CN') : '',
      '交付日期': project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('zh-CN') : '',
      '数量': project.quantity || '',
      '合同编号': project.contractCode || '',
      '合同名称': project.contractName || '',
      '合同日期': project.contractDate ? new Date(project.contractDate).toLocaleDateString('zh-CN') : '',
      '创建时间': project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '',
    }));

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 设置列宽
    const colWidths = [
      { wch: 30 }, // 项目名称
      { wch: 15 }, // 项目编号
      { wch: 40 }, // 项目描述
      { wch: 10 }, // 状态
      { wch: 15 }, // 开始日期
      { wch: 15 }, // 结束日期
      { wch: 15 }, // 物料编码
      { wch: 30 }, // 产品名称
      { wch: 20 }, // 规格型号
      { wch: 30 }, // 客户名称
      { wch: 15 }, // 技术联系人
      { wch: 15 }, // 技术联系电话
      { wch: 15 }, // 项目经理
      { wch: 15 }, // 项目经理电话
      { wch: 15 }, // 机械负责人
      { wch: 15 }, // 机械负责人电话
      { wch: 15 }, // 电气负责人
      { wch: 15 }, // 电气负责人电话
      { wch: 15 }, // 视觉负责人
      { wch: 15 }, // 视觉负责人电话
      { wch: 15 }, // 软件负责人
      { wch: 15 }, // 软件负责人电话
      { wch: 15 }, // 算法负责人
      { wch: 15 }, // 算法负责人电话
      { wch: 10 }, // 采购
      { wch: 10 }, // 计划
      { wch: 10 }, // 生产
      { wch: 10 }, // 质量
      { wch: 15 }, // 现场负责人
      { wch: 10 }, // 商务
      { wch: 10 }, // 安全
      { wch: 15 }, // 安全负责人电话
      { wch: 20 }, // 订单号
      { wch: 15 }, // 订单日期
      { wch: 15 }, // 交付日期
      { wch: 10 }, // 数量
      { wch: 20 }, // 合同编号
      { wch: 30 }, // 合同名称
      { wch: 15 }, // 合同日期
      { wch: 20 }, // 创建时间
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '项目列表');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 返回Excel文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="projects.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error exporting projects:', error);
    const errorMessage = error?.message || error?.toString() || '导出项目失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
