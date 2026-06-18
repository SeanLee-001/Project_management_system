import { NextRequest, NextResponse } from "next/server";
import { contractManager } from "@/storage/database";
import { getDb } from "coze-coding-dev-sdk";
import { contracts } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// GET /api/contracts/[contractId] - 获取单个合同
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const contract = await contractManager.getById(contractId);

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "合同不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { success: false, error: "获取合同失败" },
      { status: 500 }
    );
  }
}

// PUT /api/contracts/[contractId] - 更新合同
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const body = await request.json();

    // 检查合同是否存在
    const existingContract = await contractManager.getById(contractId);
    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "合同不存在" },
        { status: 404 }
      );
    }

    // 如果修改了合同编码，检查新编码是否与其他合同冲突
    if (body.contractCode && body.contractCode !== existingContract.contractCode) {
      const codeExists = await contractManager.checkContractCodeExists(
        body.contractCode,
        contractId
      );
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: `合同编码 "${body.contractCode}" 已存在` },
          { status: 400 }
        );
      }
    }

    const dataToSend = {
      contractName: body.contractName,
      contractDate: body.contractDate,
      customerCode: body.customerCode,
      customerId: body.customerId,
      customerName: body.customerName,
      contractAmount: body.contractAmount,
      technicalManager: body.technicalManager,
      technicalPhone: body.technicalPhone,
      procurementManager: body.procurementManager,
      procurementPhone: body.procurementPhone,
      attachment1Url: body.attachment1Url, // 技术协议
      attachment2Url: body.attachment2Url, // 项目合同
      attachment3Url: body.attachment3Url, // 订单
      status: body.status,
    };

    const contract = await contractManager.update(contractId, dataToSend);
    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    console.error("Error updating contract:", error);
    const errorMessage = error?.message || error?.toString() || "更新合同失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/contracts/[contractId] - 删除合同
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;

    // 检查合同是否存在
    const existingContract = await contractManager.getById(contractId);
    if (!existingContract) {
      return NextResponse.json(
        { success: false, error: "合同不存在" },
        { status: 404 }
      );
    }

    const contract = await contractManager.delete(contractId);
    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    console.error("Error deleting contract:", error);
    const errorMessage = error?.message || error?.toString() || "删除合同失败";
    return NextResponse.json(
      { success: false, error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/contracts/[contractId] - 清除合同审批锁定状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { contractId } = await params;
    const body = await request.json();

    if (body.action === "clear-approval") {
      const existing = await contractManager.getById(contractId);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "合同不存在" },
          { status: 404 }
        );
      }

      if (existing.approvalStatus !== "pending") {
        return NextResponse.json(
          { success: false, error: "合同当前不在审批中状态" },
          { status: 400 }
        );
      }

      const db = await getDb();
      await db
        .update(contracts)
        .set({
          approvalStatus: "none" as any,
          approvalRequestId: null as any,
        })
        .where(eq(contracts.id, contractId));

      return NextResponse.json({
        success: true,
        message: `合同 ${existing.contractCode} 审批锁定已清除`,
      });
    }

    return NextResponse.json(
      { success: false, error: "未知操作" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error patching contract:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
