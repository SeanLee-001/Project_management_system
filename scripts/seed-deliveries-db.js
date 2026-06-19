#!/usr/bin/env node
/**
 * 向数据库 deliveries 表插入 10 条送货单
 * 使用浏览器 localStorage 格式的数据生成对应的 DB 记录
 */
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: 'postgresql://project_user:project_pass_2024@localhost:5432/project_management' });

async function main() {
  const json = JSON.parse(fs.readFileSync(__dirname + '/delivery-seed-data.json', 'utf-8'));
  const notes = json.deliveryNotes;

  // 查询关联数据
  const { rows: orders } = await pool.query('SELECT id, order_number, customer_name FROM orders LIMIT 10');
  const { rows: users } = await pool.query('SELECT id, username, full_name FROM users LIMIT 10');
  const { rows: projects } = await pool.query('SELECT id, name, customer_name FROM projects LIMIT 10');

  const orderMap = {};
  orders.forEach(o => { orderMap[o.customer_name] = o; });
  const projMap = {};
  projects.forEach(p => { projMap[p.customer_name] = p; });
  const userMap = {};
  users.forEach(u => { userMap[u.full_name] = u; });

  let inserted = 0;
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const ord = orderMap[note.companyName];
    const proj = projMap[note.companyName];
    const user = userMap[note.receiver] || userMap[note.shippedByName];

    try {
      await pool.query(
        `INSERT INTO deliveries (
          id, delivery_number, order_id, order_number,
          customer_id, customer_name, project_id, project_name,
          contact_person, contact_phone, delivery_address,
          planned_delivery_date, status, items, total_quantity, remarks,
          shipped_by, shipped_by_name, received_by
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19
        ) ON CONFLICT (delivery_number) DO NOTHING`,
        [
          note.id, note.noteNumber, ord?.id || null, ord?.order_number || note.orderNumber,
          null, note.companyName, proj?.id || null, proj?.name || null,
          note.receiver, note.contactPhone, note.deliveryAddress,
          note.deliveryDate ? `${note.deliveryDate}T10:00:00+08:00` : null,
          note.status === 'pending' ? 'pending' :
          note.status === 'in_progress' ? 'shipped' :
          note.status === 'completed' ? 'delivered' : 'cancelled',
          JSON.stringify(note.items), note.totalQuantity, note.remarks,
          user?.id || null, user?.full_name || note.shippedByName, note.receiver
        ]
      );
      inserted++;
    } catch (e) {
      console.error(`  Skip ${note.noteNumber}: ${e.message}`);
    }
  }
  console.log(`\n已插入 ${inserted} 条送货单到数据库 deliveries 表`);
  await pool.end();
}

main().catch(console.error);
