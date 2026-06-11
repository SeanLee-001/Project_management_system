import { NextRequest, NextResponse } from "next/server";
import { contractManager } from "@/storage/database";

// GET /api/contracts - 获取所有合同或搜索合同
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let contracts;
    if (search) {
      contracts = await contractManager.search(search);
    } else {
      contracts = await contractManager.getAll();
    }

    return NextResponse.json({ success: true, data: contracts });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      { success: false, error: "获取合同列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/contracts - 创建合同
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必填字段
    if (!body.contractCode) {
      return NextResponse.json(
        { success: false, error: "合同编码不能为空" },
        { status: 400 }
      );
    }
    if (!body.contractName) {
      return NextResponse.json(
        { success: false, error: "合同名称不能为空" },
        { status: 400 }
      );
    }
    if (!body.customerId) {
      return NextResponse.json(
        { success: false, error: "客户ID不能为空，请从下拉列表中选择客户" },
        { status: 400 }
      );
    }
    if (!body.customerName) {
      return NextResponse.json(
        { success: false, error: "客户名称不能为空" },
        { status: 400 }
      );
    }
    if (!body.customerCode) {
      return NextResponse.json(
        { success: false, error: "客户编码不能为空" },
        { status: 400 }
      );
    }

    // 检查合同编码是否已存在
    const existingContract = await contractManager.getByContractCode(
      body.contractCode
    );
    if (existingContract) {
      return NextResponse.json(
        { success: false, error: `合同编码 "${body.contractCode}" 已存在` },
        { status: 400 }
      );
    }

    const dataToSend = {
      contractCode: body.contractCode,
      contractName: body.contractName,
      contractDate: body.contractDate || undefined,
      customerCode: body.customerCode,
      customerId: body.customerId,
      customerName: body.customerName,
      contractAmount: body.contractAmount || undefined,
      technicalManager: body.technicalManager || undefined,
      technicalPhone: body.technicalPhone || undefined,
      procurementManager: body.procurementManager || undefined,
      procurementPhone: body.procurementPhone || undefined,
      attachment1Url: body.attachment1Url || undefined, // 技术协议
      attachment2Url: body.attachment2Url || undefined, // 项目合同
      attachment3Url: body.attachment3Url || undefined, // 订单
      status: body.status || "active",
    };

    const contract = await contractManager.create(dataToSend);
    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contract:", error);
    const errorMessage = error?.message || error?.toString() || "创建合同失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}
