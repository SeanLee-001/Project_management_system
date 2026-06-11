import { NextRequest, NextResponse } from "next/server";
import * as XLSX from 'xlsx';

// GET /api/projects/template - 下载项目导入模板
export async function GET(request: NextRequest) {
  try {
    // 创建模板数据
    const templateData = [
      {
        '项目名称': '示例项目',
        '项目编号': 'PRJ-2024-001',
        '项目描述': '这是一个示例项目',
        '状态': '进行中',
        '开始日期': '2024-01-01',
        '结束日期': '2024-12-31',
        '物料编码': 'MAT-001',
        '产品名称': '示例产品',
        '规格型号': '规格A',
        '客户名称': '示例客户',
        '技术联系人': '张三',
        '技术联系电话': '13800138000',
        '项目经理': '李四',
        '项目经理电话': '13900139000',
        '机械负责人': '王五',
        '机械负责人电话': '13700137000',
        '电气负责人': '赵六',
        '电气负责人电话': '13600136000',
        '视觉负责人': '孙七',
        '视觉负责人电话': '13500135000',
        '软件负责人': '周八',
        '软件负责人电话': '13400134000',
        '算法负责人': '吴九',
        '算法负责人电话': '13300133000',
        '采购': '郑十',
        '计划': '钱十一',
        '生产': '李十二',
        '质量': '周十三',
        '现场负责人': '吴十四',
        '商务': '郑十五',
        '安全': '王十六',
        '安全负责人电话': '13200132000',
        '订单号': 'ORD-2024-001',
        '订单日期': '2024-01-01',
        '交付日期': '2024-06-30',
        '数量': '10',
        '合同编号': 'CTR-2024-001',
        '合同名称': '示例合同',
        '合同日期': '2024-01-01',
      },
    ];

    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

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
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '项目导入模板');

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 返回Excel文件
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="project_template.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating template:', error);
    const errorMessage = error?.message || error?.toString() || '生成模板失败';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
