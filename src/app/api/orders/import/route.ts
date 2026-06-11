import { NextRequest, NextResponse } from "next/server";
import { orderManager } from "@/storage/database";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "请选择要导入的Excel文件" },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { success: false, error: "请上传Excel文件（.xlsx或.xls格式）" },
        { status: 400 }
      );
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: "Excel文件中没有找到工作表" },
        { status: 400 }
      );
    }

    const data: any[] = [];
    const errors: any[] = [];

    // 读取数据（从第6行开始，跳过说明和示例）
    let rowIndex = 6;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 6) return; // 跳过说明和示例行

      const rowData: any = {};
      const orderDate = row.getCell(2).value?.toString().trim();

      // 验证必填字段
      if (!orderDate) {
        errors.push({
          row: rowNumber,
          field: '订单日期',
          message: '订单日期不能为空',
        });
        return;
      }

      rowData.orderNumber = row.getCell(1).value?.toString().trim() || null;
      rowData.orderDate = orderDate;
      rowData.contractCode = row.getCell(3).value?.toString().trim() || null;
      rowData.customerCode = row.getCell(4).value?.toString().trim() || null;
      rowData.customerName = row.getCell(5).value?.toString().trim() || null;
      rowData.materialCode = row.getCell(6).value?.toString().trim() || null;
      rowData.projectName = row.getCell(7).value?.toString().trim() || null;
      rowData.specification = row.getCell(8).value?.toString().trim() || null;
      rowData.quantity = row.getCell(9).value?.toString().trim() || null;
      rowData.orderAmount = row.getCell(10).value?.toString().trim() || null;
      rowData.paymentTerms = row.getCell(11).value?.toString().trim() || null;
      rowData.prepayRatio = row.getCell(12).value?.toString().trim() || null;
      rowData.arrivalRatio = row.getCell(13).value?.toString().trim() || null;
      rowData.acceptanceRatio = row.getCell(14).value?.toString().trim() || null;
      rowData.warrantyRatio = row.getCell(15).value?.toString().trim() || null;
      rowData.status = row.getCell(16).value?.toString().trim() || 'pending';

      // 只添加非空行
      if (orderDate) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有找到有效的数据行" },
        { status: 400 }
      );
    }

    // 创建订单
    const createdOrders = [];
    const importErrors = [];

    for (const item of data) {
      try {
        const order = await orderManager.create(item);
        createdOrders.push(order);
      } catch (error: any) {
        importErrors.push({
          orderDate: item.orderDate,
          error: error?.message || '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        success: createdOrders.length,
        failed: importErrors.length,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error importing orders:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "导入失败" },
      { status: 500 }
    );
  }
}
