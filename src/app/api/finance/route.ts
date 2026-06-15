import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logger } from '@/lib/logger';

const MODULE = 'finance-api';

// 获取资金流水
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';
    const projectId = searchParams.get('projectId');
    
    // 模拟数据 - 实际应查询数据库
    const mockData = {
      payments: [
        {
          id: '1',
          projectId: 'p1',
          projectName: 'ERP 管理系统',
          customerName: '华为技术',
          type: 'income' as const,
          category: '预付款',
          amount: 300000,
          received: true,
          invoiceAmount: 300000,
          invoiced: true,
          status: 'received' as const,
          dueDate: '2026-06-01',
          actualDate: '2026-06-01',
          notes: '合同总额30%预付款',
        },
      ],
      invoices: [],
      budgets: [],
    };

    return NextResponse.json({
      success: true,
      data: mockData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取财务数据失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// 新增资金流水
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, category, amount, projectId, customerId, dueDate } = body;

    if (!type || !category || !amount || !projectId) {
      return NextResponse.json({
        success: false,
        error: '缺少必要字段',
      }, { status: 400 });
    }

    // 实际应写入数据库
    logger.info(MODULE, '新增资金流水', { type, category, amount, projectId });

    return NextResponse.json({
      success: true,
      message: '资金流水添加成功',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '添加资金流水失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
