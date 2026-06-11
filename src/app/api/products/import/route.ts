import { NextRequest, NextResponse } from "next/server";
import { productManager } from "@/storage/database";

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
      const materialCode = row.getCell(1).value?.toString().trim();
      const projectName = row.getCell(2).value?.toString().trim();

      // 验证必填字段
      if (!materialCode) {
        errors.push({
          row: rowNumber,
          field: '物料编码',
          message: '物料编码不能为空',
        });
        return;
      }

      if (!projectName) {
        errors.push({
          row: rowNumber,
          field: '项目名称',
          message: '项目名称不能为空',
        });
        return;
      }

      rowData.materialCode = materialCode;
      rowData.projectName = projectName;
      rowData.specification = row.getCell(3).value?.toString().trim() || null;
      rowData.description = row.getCell(4).value?.toString().trim() || null;
      rowData.status = row.getCell(5).value?.toString().trim() || 'active';

      // 只添加非空行
      if (materialCode || projectName) {
        data.push(rowData);
      }
    });

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有找到有效的数据行" },
        { status: 400 }
      );
    }

    // 创建产品
    const createdProducts = [];
    const importErrors = [];

    for (const item of data) {
      try {
        const product = await productManager.createProduct(item);
        createdProducts.push(product);
      } catch (error: any) {
        importErrors.push({
          materialCode: item.materialCode,
          error: error?.message || '创建失败',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        success: createdProducts.length,
        failed: importErrors.length,
        errors: importErrors.length > 0 ? importErrors : undefined,
      },
    });
  } catch (error: any) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "导入失败" },
      { status: 500 }
    );
  }
}
