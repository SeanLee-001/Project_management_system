#!/usr/bin/env node
/**
 * 为20个订单填充付款比例/发票/交易数据，使交易明细和发票管理页面有数据
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://project_user:project_pass_2024@localhost:5432/project_management' });
const sql = (q, p = []) => pool.query(q, p);

async function main() {
  console.log('=== 填充订单付款比例/发票/交易数据 ===\n');

  // 获取所有订单
  const { rows: orders } = await sql(`SELECT id, order_number, order_amount FROM orders ORDER BY order_number`);

  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d*86400000).toISOString();
  const daysFromNow = (d) => new Date(now.getTime() + d*86400000).toISOString();

  // 付款类别定义
  const cats = ['prepay', 'arrival', 'acceptance', 'warranty'];
  const catNames = ['预付款', '到货款', '验收款', '质保金'];

  // 发票号前缀
  const invPrefix = ['PRE', 'ARR', 'ACC', 'WAR'];

  for (let i = 0; i < orders.length; i++) {
    const o = orders[i];
    const amount = parseInt(o.order_amount) || 500000;

    // 标准比例: 30% / 60% / 5% / 5%
    const ratios = ['30', '60', '5', '5'];
    const amts = [
      Math.round(amount * 0.30).toString(),
      Math.round(amount * 0.60).toString(),
      Math.round(amount * 0.05).toString(),
      Math.round(amount * 0.05).toString(),
    ];

    // 根据订单序号确定完成阶段 (模拟真实进度)
    const stage = i < 6 ? 'all' : i < 12 ? 'arrival' : i < 17 ? 'prepay' : 'none';

    const updates = {};
    const nowStr = daysAgo(0);

    for (let j = 0; j < 4; j++) {
      const c = cats[j];
      updates[`${c}_ratio`] = ratios[j];
      updates[`${c}_amount`] = amts[j];

      // 发票数据
      const shouldInvoice = stage === 'all' ||
        (stage === 'arrival' && j < 2) ||
        (stage === 'prepay' && j < 1);

      if (shouldInvoice && j < 3) {
        updates[`${c}_invoice_number`] = `${invPrefix[j]}-2025-${String(i*4+j+1).padStart(4,'0')}`;
        updates[`${c}_invoice_date`] = daysAgo(90 - j*30);
        updates[`${c}_invoiced`] = true;
        updates[`${c}_invoice_amount`] = amts[j];
        updates[`${c}_invoice_notes`] = `${catNames[j]}发票已开具`;
      } else {
        updates[`${c}_invoice_number`] = null;
        updates[`${c}_invoice_date`] = null;
        updates[`${c}_invoiced`] = false;
        updates[`${c}_invoice_amount`] = null;
        updates[`${c}_invoice_notes`] = null;
      }

      // 交易(收款)数据
      const shouldReceive = stage === 'all' ||
        (stage === 'arrival' && j < 2) ||
        (stage === 'prepay' && j < 1);

      if (shouldReceive && j < 3) {
        updates[`${c}_received`] = true;
        updates[`${c}_received_amount`] = amts[j];
        updates[`${c}_date`] = daysAgo(60 - j*30);
        updates[`${c}_due_date`] = daysAgo(30 - j*30);
        updates[`${c}_status`] = '收款完成';
        updates[`${c}_transaction_notes`] = `${catNames[j]}已全额收款`;
      } else if (j === 0 && stage === 'prepay') {
        // 预付部分收款场景
        const partial = Math.round(parseInt(amts[j]) * 0.6).toString();
        updates[`${c}_received`] = true;
        updates[`${c}_received_amount`] = partial;
        updates[`${c}_date`] = daysAgo(30);
        updates[`${c}_due_date`] = daysAgo(10);
        updates[`${c}_status`] = '部分收款';
        updates[`${c}_transaction_notes`] = `预付部分收款，剩余${parseInt(amts[j]) - parseInt(partial)}元`;
      } else {
        // 未收款，设置到期日
        updates[`${c}_received`] = false;
        updates[`${c}_received_amount`] = '0';
        updates[`${c}_date`] = null;
        updates[`${c}_due_date`] = daysFromNow(30 + j*60);
        updates[`${c}_status`] = null;
        updates[`${c}_transaction_notes`] = null;

        if (j >= 2) {
          // 验收款和质保金通常还未触发
          updates[`${c}_due_date`] = daysFromNow(180);
        }
      }
    }

    // 构建 SET 子句
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
    values.push(o.id);

    await sql(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${idx}`, values);
  }

  console.log(`已更新 ${orders.length} 个订单的付款比例/发票/交易数据`);
  console.log(`  全流程完成(full): 前6单 (预付款+到货款 已收款已开票)`);
  console.log(`  到货完成(arrival): 7-12单 (预付款+到货款 已收款已开票)`);
  console.log(`  预付完成(prepay): 13-17单 (预付款 部分收款/已开票)`);
  console.log(`  未完成(none): 18-20单 (仅设置了比例和到期日)`);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
