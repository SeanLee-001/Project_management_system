import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// 模板类型定义
type TemplateType = 'project' | 'order' | 'contract' | 'customer' | 'product';

// 字段说明映射
const FIELD_DESCRIPTIONS = {
  // 项目模板字段说明
  project: {
    name: '项目名称（必填）',
    description: '项目描述',
    status: '项目状态（active:进行中, completed:已完成, paused:已暂停, cancelled:已取消）',
    startDate: '开始日期（格式：YYYY-MM-DD）',
    endDate: '结束日期（格式：YYYY-MM-DD）',
    projectCode: '项目编码',
    materialCode: '物料编码（可自动匹配产品信息）',
    productName: '产品名称',
    specification: '规格型号',
    productImageUrl: '产品图片URL',
    customerId: '客户ID（从客户管理获取）',
    customerName: '客户名称',
    technicalContactName: '技术联系人姓名',
    technicalContactPhone: '技术联系人电话',
    technicalContactEmail: '技术联系人邮箱',
    projectManager: '项目经理ID（从用户管理获取）',
    projectManagerPhone: '项目经理电话',
    projectManagement: '项目管理ID',
    mechanicalLead: '机械负责人ID',
    mechanicalLeadPhone: '机械负责人电话',
    electricalLead: '电气负责人ID',
    electricalLeadPhone: '电气负责人电话',
    visualLead: '视觉负责人ID',
    visualLeadPhone: '视觉负责人电话',
    softwareLead: '软件负责人ID',
    softwareLeadPhone: '软件负责人电话',
    algorithmLead: '算法负责人ID',
    algorithmLeadPhone: '算法负责人电话',
    procurement: '采购ID',
    planning: '计划ID',
    production: '生产ID',
    quality: '质量ID',
    fieldProjectLead: '现场项目负责人ID',
    business: '商务负责人ID',
    safety: '安全负责人ID',
    safetyLeadPhone: '安全负责人电话',
    orderNumber: '订单编码',
    orderDate: '订单日期（格式：YYYY-MM-DD）',
    deliveryDate: '订单交付日期（格式：YYYY-MM-DD）',
    quantity: '订单数量',
    contractCode: '合同编码',
    contractName: '合同名称',
    contractDate: '合同日期（格式：YYYY-MM-DD）',
    notes: '备注',
    approvalStatus: '审批状态（pending:待审批, approved:已通过, rejected:已拒绝）',
    // approvalRequestId为系统字段，不需要在导入模板中填写
  },

  // 订单模板字段说明
  order: {
    orderNumber: '订单号',
    orderDate: '订单日期（格式：YYYY-MM-DD）',
    contractCode: '合同编号',
    customerCode: '客户编码',
    customerName: '客户名称',
    materialCode: '物料编码（可自动匹配产品信息）',
    projectName: '项目名称',
    specification: '规格型号',
    quantity: '数量',
    deliveryDate: '订单交付日期（格式：YYYY-MM-DD）',
    actualDeliveryDate: '实际交付日期（格式：YYYY-MM-DD）',
    status: '状况',
    projectProgress: '项目进度',
    paymentTerms: '付款条件',
    orderAmount: '订单金额',
    prepayRatio: '预付款比率（如：30%）',
    prepayAmount: '预付金额',
    arrivalRatio: '到货款比率（如：30%）',
    arrivalAmount: '到货金额',
    acceptanceRatio: '验收款比率（如：30%）',
    acceptanceAmount: '验收金额',
    warrantyRatio: '质保款比率（如：10%）',
    warrantyAmount: '质保金额',
    notes: '备注',
    approvalStatus: '审批状态（pending:待审批, approved:已通过, rejected:已拒绝）',
  },

  // 合同模板字段说明
  contract: {
    contractCode: '合同编码（必填）',
    contractName: '合同名称（必填）',
    contractDate: '合同日期（格式：YYYY-MM-DD）',
    customerCode: '客户编码（必填）',
    customerId: '客户ID（从客户管理获取）',
    customerName: '客户名称',
    contractAmount: '合同金额',
    technicalManager: '客户技术负责人',
    technicalPhone: '技术负责人联系电话',
    procurementManager: '客户采购负责人',
    procurementPhone: '采购负责人联系电话',
    status: '合同状态（active:有效, expired:过期, terminated:终止）',
    notes: '备注',
    // 附件相关（导入时无法直接上传附件）
    technicalAgreementUrl: '技术协议URL',
    projectContractUrl: '项目合同URL',
    orderAttachmentUrl: '订单附件URL',
    approvalStatus: '审批状态（pending:待审批, approved:已通过, rejected:已拒绝）',
  },

  // 客户模板字段说明
  customer: {
    customerCode: '客户编号（必填，唯一）',
    customerName: '客户名称（必填）',
    phone: '联系电话',
    address: '地址',
    customerType: '客户类型（terminal:终端客户, agent:代理商/中介）',
    status: '状态（active:合作中, inactive:停止合作）',
    industry: '所属行业',
    notes: '备注',
  },

  // 产品模板字段说明
  product: {
    materialCode: '物料编码（必填，唯一）',
    projectName: '项目名称（必填）',
    specification: '规格型号',
    description: '产品描述',
    imageUrl: '产品图片URL',
    status: '状态（active:启用, inactive:停用）',
    category: '产品大类',
    version: '版本号',
    notes: '备注',
  },
};

// 生成项目模板数据
function generateProjectTemplate() {
  return [
    {
      name: '',
      description: '',
      status: 'active',
      startDate: '',
      endDate: '',
      projectCode: '',
      materialCode: '',
      productName: '',
      specification: '',
      productImageUrl: '',
      customerId: '',
      customerName: '',
      technicalContactName: '',
      technicalContactPhone: '',
      technicalContactEmail: '',
      projectManager: '',
      projectManagerPhone: '',
      projectManagement: '',
      mechanicalLead: '',
      mechanicalLeadPhone: '',
      electricalLead: '',
      electricalLeadPhone: '',
      visualLead: '',
      visualLeadPhone: '',
      softwareLead: '',
      softwareLeadPhone: '',
      algorithmLead: '',
      algorithmLeadPhone: '',
      procurement: '',
      planning: '',
      production: '',
      quality: '',
      fieldProjectLead: '',
      business: '',
      safety: '',
      safetyLeadPhone: '',
      orderNumber: '',
      orderDate: '',
      deliveryDate: '',
      quantity: '',
      contractCode: '',
      contractName: '',
      contractDate: '',
      notes: '',
      approvalStatus: 'pending',
    },
  ];
}

// 生成订单模板数据
function generateOrderTemplate() {
  return [
    {
      orderNumber: '',
      orderDate: '',
      contractCode: '',
      customerCode: '',
      customerName: '',
      materialCode: '',
      projectName: '',
      specification: '',
      quantity: '',
      deliveryDate: '',
      actualDeliveryDate: '',
      status: '',
      projectProgress: '',
      paymentTerms: '',
      orderAmount: '',
      prepayRatio: '',
      prepayAmount: '',
      arrivalRatio: '',
      arrivalAmount: '',
      acceptanceRatio: '',
      acceptanceAmount: '',
      warrantyRatio: '',
      warrantyAmount: '',
      notes: '',
    },
  ];
}

// 生成合同模板数据
function generateContractTemplate() {
  return [
    {
      contractCode: '',
      contractName: '',
      contractDate: '',
      customerCode: '',
      customerId: '',
      customerName: '',
      contractAmount: '',
      technicalManager: '',
      technicalPhone: '',
      procurementManager: '',
      procurementPhone: '',
      status: 'active',
      notes: '',
    },
  ];
}

// 生成客户模板数据
function generateCustomerTemplate() {
  return [
    {
      customerCode: '',
      customerName: '',
      phone: '',
      address: '',
      customerType: 'terminal',
      status: 'active',
    },
  ];
}

// 生成产品模板数据
function generateProductTemplate() {
  return [
    {
      materialCode: '',
      projectName: '',
      specification: '',
      description: '',
      imageUrl: '',
      status: 'active',
      category: '',
      version: '',
      notes: '',
    },
  ];
}

// 生成说明Sheet
function generateInstructionSheet(templateType: TemplateType) {
  const descriptions = FIELD_DESCRIPTIONS[templateType];
  const rows = Object.entries(descriptions).map(([field, desc]) => ({
    '字段名': field,
    '说明': desc,
  }));

  return [
    ['字段说明'],
    ['提示：以下为导入模板的字段说明，请参考填写'],
    [''], // 空行
    ['字段名', '说明'],
    ...rows.map(row => [row['字段名'], row['说明']]),
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as TemplateType;

    // 验证模板类型
    if (!type || !FIELD_DESCRIPTIONS[type as TemplateType]) {
      return NextResponse.json(
        { error: '无效的模板类型，支持的类型：project, order, contract, customer, product' },
        { status: 400 }
      );
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 生成说明Sheet
    const instructionSheet = generateInstructionSheet(type as TemplateType);
    const instructionWS = XLSX.utils.aoa_to_sheet(instructionSheet);
    XLSX.utils.book_append_sheet(workbook, instructionWS, '字段说明');

    // 生成数据Sheet
    let data: any[];
    let sheetName: string;

    switch (type) {
      case 'project':
        data = generateProjectTemplate();
        sheetName = '项目导入模板';
        break;
      case 'order':
        data = generateOrderTemplate();
        sheetName = '订单导入模板';
        break;
      case 'contract':
        data = generateContractTemplate();
        sheetName = '合同导入模板';
        break;
      case 'customer':
        data = generateCustomerTemplate();
        sheetName = '客户导入模板';
        break;
      case 'product':
        data = generateProductTemplate();
        sheetName = '产品导入模板';
        break;
      default:
        return NextResponse.json({ error: '不支持的模板类型' }, { status: 400 });
    }

    const dataWS = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, dataWS, sheetName);

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 设置响应头
    const filename = `${type}_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error) {
    console.error('生成导入模板失败:', error);
    return NextResponse.json(
      { error: '生成导入模板失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
