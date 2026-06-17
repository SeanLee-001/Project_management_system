import { NextRequest, NextResponse } from 'next/server';
import { orderManager } from '@/storage/database';
import { logger } from '@/lib/logger';

const MODULE = 'sync-financial-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, ...financialData } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: '缺少订单ID' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    const categories = ['prepay', 'arrival', 'acceptance', 'warranty'];

    for (const cat of categories) {
      const amountField = `${cat}Amount`;
      const dateField = `${cat}Date`;
      const receivedField = `${cat}Received`;
      const invoiceAmountField = `${cat}InvoiceAmount`;
      const invoiceDateField = `${cat}InvoiceDate`;
      const invoicedField = `${cat}Invoiced`;

      if (financialData[amountField] !== undefined) updates[amountField] = financialData[amountField];
      if (financialData[dateField] !== undefined) updates[dateField] = financialData[dateField] ? new Date(financialData[dateField]) : null;
      if (financialData[receivedField] !== undefined) updates[receivedField] = !!financialData[receivedField];
      if (financialData[invoiceAmountField] !== undefined) updates[invoiceAmountField] = financialData[invoiceAmountField];
      if (financialData[invoiceDateField] !== undefined) updates[invoiceDateField] = financialData[invoiceDateField] ? new Date(financialData[invoiceDateField]) : null;
      if (financialData[invoicedField] !== undefined) updates[invoicedField] = !!financialData[invoicedField];
    }

    if (Object.keys(updates).length > 0) {
      await orderManager.update(orderId, updates);
      logger.info(MODULE, '财务数据已同步', { orderId, updates });
    }

    return NextResponse.json({ success: true, data: { orderId } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '同步财务数据失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
