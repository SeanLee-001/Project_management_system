import { NextRequest, NextResponse } from 'next/server';
import { orderManager } from '@/storage/database';
import { logger } from '@/lib/logger';

const MODULE = 'transactions-api';

interface TransactionRow {
  id: string;
  orderId: string;
  projectName: string;
  customerName: string;
  orderNumber: string;
  contractCode: string;
  deliveryDate: string | null;
  category: string;
  ratio: string;
  receivableAmount: string;
  receivedAmount: string;
  dueDate: string;
  receivedDate: string;
  status1: string;
  status2: string;
  notes: string;
}

const PAYMENT_CATEGORIES = [
  { key: 'prepay', label: '预付款', amountField: 'prepayAmount', dateField: 'prepayDate', ratioField: 'prepayRatio' },
  { key: 'arrival', label: '到货款', amountField: 'arrivalAmount', dateField: 'arrivalDate', ratioField: 'arrivalRatio' },
  { key: 'acceptance', label: '验收款', amountField: 'acceptanceAmount', dateField: 'acceptanceDate', ratioField: 'acceptanceRatio' },
  { key: 'warranty', label: '质保款', amountField: 'warrantyAmount', dateField: 'warrantyDate', ratioField: 'warrantyRatio' },
];

function getOrderField(order: any, field: string): string {
  const val = order[field];
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
}

function parseRatio(ratio: string): number {
  if (!ratio) return 0;
  const cleaned = String(ratio).replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// GET /api/transactions - 获取所有交易数据（从订单自动生成）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const customerName = searchParams.get('customerName') || '';
    const orderNumber = searchParams.get('orderNumber') || '';
    const contractCode = searchParams.get('contractCode') || '';
    const deliveryDate = searchParams.get('deliveryDate') || '';
    const dueDate = searchParams.get('dueDate') || '';

    const allOrders = await orderManager.getAll();

    const rows: TransactionRow[] = [];

    for (const order of allOrders) {
      for (const cat of PAYMENT_CATEGORIES) {
        const r = order[cat.ratioField];
        const ratio = String(r || '');
        const ratioNum = parseRatio(ratio);

        if (ratioNum <= 0) continue;

        const id = `txn-${order.id}-${cat.key}`;
        const receivableAmount = getOrderField(order, cat.amountField);
        const dateRaw = order[cat.dateField];
        const defaultDueDate = dateRaw instanceof Date
          ? dateRaw.toISOString().split('T')[0]
          : (dateRaw || '');

        const dlvDateRaw = order.deliveryDate;
        const deliveryDt = dlvDateRaw instanceof Date
          ? dlvDateRaw.toISOString().split('T')[0]
          : (dlvDateRaw || null);

        // 从订单中读取已保存的交易数据
        const savedReceivedAmount = order[`${cat.key}ReceivedAmount`] || '';
        const savedReceivedDateRaw = order[`${cat.key}Date`];
        const savedReceivedDate = savedReceivedDateRaw instanceof Date
          ? savedReceivedDateRaw.toISOString().split('T')[0]
          : (savedReceivedDateRaw || '');
        const savedReceived = order[`${cat.key}Received`];
        const savedStatus = order[`${cat.key}Status`];
        const savedNotes = order[`${cat.key}TransactionNotes`] || '';

        const receivedAmount = String(savedReceivedAmount || '');
        const receivedDate = savedReceivedDate;
        const status1 = savedStatus || (savedReceived ? '收款完成' : '');

        let status2 = '';
        if (!receivedAmount) {
          status2 = '待收款';
        } else {
          const receivable = parseFloat(receivableAmount) || 0;
          const received = parseFloat(receivedAmount) || 0;
          if (received >= receivable) {
            status2 = '收款完成';
          } else {
            status2 = '部分收款';
          }
          if (receivedDate) {
            if (receivedDate > defaultDueDate) {
              status2 += ' 延期收款';
            } else {
              status2 += ' 按期收款';
            }
          }
        }

        rows.push({
          id,
          orderId: order.id,
          projectName: order.projectName || '',
          customerName: order.customerName || '',
          orderNumber: order.orderNumber || '',
          contractCode: order.contractCode || '',
          deliveryDate: deliveryDt,
          category: `${cat.label} ${ratioNum}%`,
          ratio: String(ratioNum),
          receivableAmount,
          receivedAmount,
          dueDate: defaultDueDate,
          receivedDate,
          status1,
          status2,
          notes: savedNotes,
        });
      }
    }

    let filtered = rows;
    if (keyword || customerName || orderNumber || contractCode || deliveryDate || dueDate) {
      filtered = rows.filter(r => {
        if (keyword) {
          const kw = keyword.toLowerCase();
          if (!(
            r.projectName.toLowerCase().includes(kw) ||
            r.customerName.toLowerCase().includes(kw) ||
            r.orderNumber.toLowerCase().includes(kw) ||
            r.contractCode.toLowerCase().includes(kw)
          )) return false;
        }
        if (customerName && !r.customerName.toLowerCase().includes(customerName.toLowerCase())) return false;
        if (orderNumber && !r.orderNumber.toLowerCase().includes(orderNumber.toLowerCase())) return false;
        if (contractCode && !r.contractCode.toLowerCase().includes(contractCode.toLowerCase())) return false;
        if (deliveryDate && r.deliveryDate !== deliveryDate) return false;
        if (dueDate && r.dueDate !== dueDate) return false;
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取交易数据失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/transactions - 保存交易编辑信息到订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, orderId, receivedAmount, dueDate, receivedDate, status1, notes } = body;

    logger.info(MODULE, '保存交易信息', { id, orderId, receivedAmount, dueDate, receivedDate, status1 });

    // 根据 id 解析出类别 key: txn-{orderId}-{categoryKey}
    const categoryKey = id.split('-').pop() || '';

    if (categoryKey && orderId) {
      const receivedAmountField = `${categoryKey}ReceivedAmount`;
      const dateField = `${categoryKey}Date`;
      const receivedField = `${categoryKey}Received`;
      const statusField = `${categoryKey}Status`;
      const notesField = `${categoryKey}TransactionNotes`;

      const updates: Record<string, any> = {};
      if (receivedAmount !== undefined) updates[receivedAmountField] = receivedAmount;
      if (receivedDate !== undefined) updates[dateField] = receivedDate ? new Date(receivedDate) : null;
      if (dueDate !== undefined) updates[dateField] = dueDate ? new Date(dueDate) : null;
      if (status1 !== undefined) {
        updates[receivedField] = status1 !== '';
        updates[statusField] = status1;
      }
      if (notes !== undefined) updates[notesField] = notes;

      if (Object.keys(updates).length > 0) {
        await orderManager.update(orderId, updates);
        logger.info(MODULE, '交易数据已保存到订单', { orderId, updates });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id, receivedAmount, dueDate, receivedDate, status1, notes },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新交易失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
