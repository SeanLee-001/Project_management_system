import { NextRequest, NextResponse } from 'next/server';
import { orderManager } from '@/storage/database';
import { logger } from '@/lib/logger';

const MODULE = 'invoices-api';

interface InvoiceRow {
  id: string;
  orderId: string;
  projectName: string;
  customerName: string;
  orderNumber: string;
  contractCode: string;
  deliveryDate: string | null;
  category: string;
  ratio: string;
  invoiceNumber: string;
  amount: string;
  invoiceDate: string;
  notes: string;
}

const PAYMENT_CATEGORIES = [
  { key: 'prepay', label: '预付款', ratioField: 'prepayRatio', invoiceDateField: 'prepayInvoiceDate', invoiceAmountField: 'prepayAmount', invoicedField: 'prepayInvoiced' },
  { key: 'arrival', label: '到货款', ratioField: 'arrivalRatio', invoiceDateField: 'arrivalInvoiceDate', invoiceAmountField: 'arrivalAmount', invoicedField: 'arrivalInvoiced' },
  { key: 'acceptance', label: '验收款', ratioField: 'acceptanceRatio', invoiceDateField: 'acceptanceInvoiceDate', invoiceAmountField: 'acceptanceAmount', invoicedField: 'acceptanceInvoiced' },
  { key: 'warranty', label: '质保款', ratioField: 'warrantyRatio', invoiceDateField: 'warrantyInvoiceDate', invoiceAmountField: 'warrantyAmount', invoicedField: 'warrantyInvoiced' },
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

// GET /api/invoices - 获取所有发票数据（从订单自动生成）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const customerName = searchParams.get('customerName') || '';
    const orderNumber = searchParams.get('orderNumber') || '';
    const contractCode = searchParams.get('contractCode') || '';
    const deliveryDate = searchParams.get('deliveryDate') || '';
    const invoiceDate = searchParams.get('invoiceDate') || '';
    const invoiceStatus = searchParams.get('invoiceStatus') || '';

    const allOrders = await orderManager.getAll();

    const rows: InvoiceRow[] = [];
    let seq = 0;

    for (const order of allOrders) {
      for (const cat of PAYMENT_CATEGORIES) {
        const r = order[cat.ratioField];
        const ratio = String(r || '');
        const ratioNum = parseRatio(ratio);

        if (ratioNum <= 0) continue;

        seq++;
        const id = `inv-${order.id}-${cat.key}`;
        const invoiceDateRaw = order[cat.invoiceDateField];
        const invoiceDate = invoiceDateRaw instanceof Date
          ? invoiceDateRaw.toISOString().split('T')[0]
          : (invoiceDateRaw || '');
        const invoiceAmount = getOrderField(order, cat.invoiceAmountField);

        // 从订单中读取已保存的发票号和备注
        const savedInvoiceNumber = order[`${cat.key}InvoiceNumber`] || '';
        const savedNotes = order[`${cat.key}InvoiceNotes`] || '';
        const invoiceNumber = savedInvoiceNumber || '';

        const deliveryDateRaw = order.deliveryDate;
        const deliveryDate = deliveryDateRaw instanceof Date
          ? deliveryDateRaw.toISOString().split('T')[0]
          : (deliveryDateRaw || null);

        rows.push({
          id,
          orderId: order.id,
          projectName: order.projectName || '',
          customerName: order.customerName || '',
          orderNumber: order.orderNumber || '',
          contractCode: order.contractCode || '',
          deliveryDate,
          category: `${cat.label} ${ratioNum}%`,
          ratio: String(ratioNum),
          invoiceNumber,
          amount: invoiceAmount,
          invoiceDate,
          notes: savedNotes,
        });
      }
    }

    // 过滤
    let filtered = rows;
    if (keyword || customerName || orderNumber || contractCode || deliveryDate || invoiceDate || invoiceStatus) {
      filtered = rows.filter(r => {
        if (keyword) {
          const kw = keyword.toLowerCase();
          if (!(
            r.projectName.toLowerCase().includes(kw) ||
            r.customerName.toLowerCase().includes(kw) ||
            r.orderNumber.toLowerCase().includes(kw) ||
            r.contractCode.toLowerCase().includes(kw) ||
            r.invoiceNumber.toLowerCase().includes(kw)
          )) return false;
        }
        if (customerName && !r.customerName.toLowerCase().includes(customerName.toLowerCase())) return false;
        if (orderNumber && !r.orderNumber.toLowerCase().includes(orderNumber.toLowerCase())) return false;
        if (contractCode && !r.contractCode.toLowerCase().includes(contractCode.toLowerCase())) return false;
        if (deliveryDate && r.deliveryDate !== deliveryDate) return false;
        if (invoiceDate && r.invoiceDate !== invoiceDate) return false;
        if (invoiceStatus) {
          const hasInvoice = !!r.invoiceNumber;
          if (invoiceStatus === 'completed' && !hasInvoice) return false;
          if (invoiceStatus === 'pending' && hasInvoice) return false;
        }
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取发票数据失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/invoices - 保存发票编辑信息到订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, orderId, invoiceNumber, invoiceDate, notes } = body;

    logger.info(MODULE, '保存发票信息', { id, orderId, invoiceNumber, invoiceDate });

    // 根据 id 解析出类别 key: inv-{orderId}-{categoryKey}
    const categoryKey = id.split('-').pop() || '';

    // 构建要更新的字段
    const updates: Record<string, any> = {};

    if (categoryKey) {
      const dateField = `${categoryKey}InvoiceDate`;
      const invoicedField = `${categoryKey}Invoiced`;
      const invoiceNumberField = `${categoryKey}InvoiceNumber`;
      const notesField = `${categoryKey}InvoiceNotes`;

      if (invoiceDate !== undefined) updates[dateField] = invoiceDate ? new Date(invoiceDate) : null;
      if (invoiceNumber !== undefined) {
        updates[invoiceNumberField] = invoiceNumber;
        updates[invoicedField] = !!invoiceNumber;
      }
      if (notes !== undefined) updates[notesField] = notes;
    }

    if (Object.keys(updates).length > 0 && orderId) {
      await orderManager.update(orderId, updates);
      logger.info(MODULE, '发票数据已保存到订单', { orderId, updates });
    }

    return NextResponse.json({
      success: true,
      data: { id, invoiceNumber, invoiceDate, notes },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新发票失败';
    logger.error(MODULE, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
