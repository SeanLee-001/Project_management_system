import { NextRequest, NextResponse } from "next/server";
import { contractManager } from "@/storage/database";

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

    let rowIndex = 6;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 6) return;

      const rowData: any = {};
      const contractCode = row.getCell(1).value?.toString().trim();
      const contractName = row.getCell(2).value?.toString().trim();
      const customerCode = row.getCell(4).value?.toString().trim();
      const customerName = row.getCell(5).value?.toString().trim();

      if (!contractCode) {
        errors.push({
          row: rowNumber,
          field: '合同编码',
          message: '合同编码不能为空',
        });
        return;
      }

      if (!contractName) {
        errors.push({
          row: rowNumber,
          field: '合同名称',
          message: '合同名称不能为空',
        });
        return;
      }

      if (!customerCode) {
        errors.push({
          row: rowNumber,
          field: '客户编码',
          message: '客户编码不能为空',
        });
        return;
      }

      if (!customerName) {
        errors.push({
          row: rowNumber,
          field: '客户名称',
          message: '客户名称不能为空',
        });
        return;
      }

      rowData.contractCode = contractCode;
      rowData.contractName = contractName;
      rowData.contractDate = row.getCell(3).value?.toString().trim() || null;
      rowData.customerCode = customerCode;
      rowData.customerName = customerName;
      rowData.contractAmount = row.getCell(6).value?.toString().trim() || null;
      rowData.technicalManager = row.getCell(7).value?.toString().trim() || null;
      rowData.technicalPhone = row.getCell(8).value?.toString().trim() || null;
      rowData.procurementManager = row.getCell(9).value?.toString().trim() || null;
      rowData.procurementPhone = row.getCell(10).value?.toString().trim() || null;
      rowData.status = row.getCell(11).value?.toString().trim() || 'active';

      if (contractCode) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有找到有效的数据行" },
        { status: 400 }
      );
    }

    const createdContracts = [];
    const importErrors = [];

    for (const item of data) {
      try {
        const contract = await contractManager.create(item);
        createdContracts.push(contract);
      } catch (error: any) {
        importErrors.push({
          contractCode: item.contractCode,
          error: error?.message || '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        success: createdContracts.length,
        failed: importErrors.length,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error importing contracts:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "导入失败" },
      { status: 500 }
    );
  }
}
