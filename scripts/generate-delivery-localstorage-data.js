#!/usr/bin/env node
/**
 * 为送货管理 4 个表各生成 10 组数据的浏览器控制台脚本
 * 使用方法：node scripts/generate-delivery-localstorage-data.js
 * 然后将输出复制到浏览器控制台执行
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://project_user:project_pass_2024@localhost:5432/project_management' });

function id() { return 'DL' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function today() { return new Date().toISOString().slice(0, 10); }
function futureDate(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function pastDate(days) { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); }

async function main() {
  const { rows: orders } = await pool.query('SELECT id, order_number, customer_name FROM orders LIMIT 10');
  const { rows: products } = await pool.query('SELECT id, material_code, project_name, specification, description FROM products LIMIT 10');
  const { rows: users } = await pool.query('SELECT id, username, full_name FROM users LIMIT 10');
  const { rows: projects } = await pool.query('SELECT id, name, customer_name FROM projects LIMIT 10');

  await pool.end();

  const addressList = [
    '深圳市南山区科技园路88号A栋',
    '北京市海淀区中关村大街1号',
    '上海市浦东新区张江高科技园区',
    '广州市天河区珠江新城',
    '杭州市西湖区文三路',
    '武汉市东湖高新区光谷大道',
    '成都市高新区天府软件园',
    '苏州市工业园区苏虹路',
    '重庆市渝北区金开大道',
    '东莞市松山湖高新区',
  ];

  // ===== 1. 送货单 (deliveryNotes) - 10 组 =====
  const deliveryNotes = [];
  for (let i = 0; i < 10; i++) {
    const ord = orders[i];
    const proj = projects[i];
    const user = users[i % users.length];
    const prod = products[i];
    const noteId = id();
    const noteNumber = `DL${today().replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
    const itemsCount = 2 + (i % 3);
    const items = [];
    for (let j = 0; j < itemsCount; j++) {
      const p = products[(i + j) % products.length];
      items.push({
        id: id(), productId: p.id, materialCode: p.material_code,
        productName: p.project_name, specification: p.specification,
        description: p.description, unit: '台', quantity: 5 + j * 3
      });
    }
    const totalQuantity = items.reduce((s, it) => s + it.quantity, 0);
    const statuses = ['pending', 'pending', 'pending', 'in_progress', 'in_progress', 'in_progress', 'completed', 'completed', 'cancelled'];
    deliveryNotes.push({
      id: noteId, noteNumber, orderId: ord?.id || '', orderNumber: ord?.order_number || '',
      supplierId: '', supplierName: users[(i + 3) % users.length]?.full_name || '供应商A',
      companyId: ord?.id ? '' : '', companyName: ord?.customer_name || addressList[i].match(/^(.*?市)/)?.[0] || '',
      receiver: user?.full_name || `收货人${i + 1}`, contactPhone: `138${String(i + 1).padStart(3, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      deliveryAddress: addressList[i], deliveryDate: futureDate(3 + i),
      items, totalQuantity, status: statuses[i % statuses.length],
      remarks: i < 8 ? `第${i + 1}批送货，请验收` : (i === 8 ? '已完成交付' : '客户取消'),
      receipt: i >= 7 ? [{ name: `签收单_${i + 1}.pdf`, url: '', type: 'application/pdf', uploadedAt: pastDate(5 + i) }] : [],
      failureHistory: i === 8 ? [{ time: pastDate(1), reason: '客户产能不足，推迟接收', type: 'delay' }] : [],
      createTime: pastDate(5 + i * 2),
      shippedByName: user?.full_name || '',
    });
  }

  // ===== 2. 发货单 (shipmentOrders) - 10 组 =====
  const shipmentOrders = [];
  const shipmentStatuses = ['pending_ship', 'shipped', 'in_distribution', 'delivered'];
  for (let i = 0; i < 10; i++) {
    const note = deliveryNotes[i];
    const user = users[i % users.length];
    const shipId = id();
    const shipNum = `SH${today().replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
    const status = i < 7 ? shipmentStatuses[i % 4] : (i < 9 ? 'completed' : 'cancelled');
    shipmentOrders.push({
      id: shipId, shipmentNumber: shipNum,
      deliveryNoteId: note.id, deliveryNoteNumber: note.noteNumber,
      supplierName: note.supplierId ? `供应商_${String.fromCharCode(65 + i)}` : '',
      companyName: note.companyName,
      status,
      shipTime: i < 8 ? pastDate(2 + i) : undefined,
      shipOperator: user?.full_name || `发货员${i + 1}`,
      receipt: i >= 5 ? [{ name: `发货回执_${shipNum}.jpg`, url: '', type: 'image/jpeg', uploadedAt: pastDate(1 + i) }] : [],
      cancelReason: i >= 8 ? '订单变更取消' : undefined,
      failureHistory: i === 7 ? [{ time: pastDate(2), reason: '车辆调度延误', type: 'logistics' }] : [],
      createTime: pastDate(3 + i * 2),
    });
  }

  // ===== 3. 配送单 (distributionOrders) - 10 组 =====
  const distributionOrders = [];
  const distStatuses = ['pending_distribute', 'in_distribution', 'delivered'];
  const distTypes = ['logistics', 'express', 'company'];
  const logisticsCompanies = ['顺丰物流', '德邦物流', '圆通速递', '中通快递', '韵达快递', '京东物流', 'EMS', '安能物流', '壹米滴答', '跨越速运'];
  for (let i = 0; i < 10; i++) {
    const ship = shipmentOrders[i];
    const user = users[(i + 2) % users.length];
    const distId = id();
    const distNum = `DS${today().replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`;
    const dtype = distTypes[i % 3];
    const dist = {
      id: distId, distributionNumber: distNum,
      shipmentId: ship.id, shipmentNumber: ship.shipmentNumber,
      deliveryNoteId: ship.deliveryNoteId,
      supplierName: ship.supplierName,
      companyName: ship.companyName,
      deliveryAddress: addressList[i],
      receiver: `收货人${i + 1}`,
      receiverPhone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      distributionType: dtype,
      status: i < 6 ? distStatuses[i % 3] : (i < 8 ? 'delivered' : 'failed'),
      distributeTime: i < 8 ? pastDate(1 + i) : undefined,
      completeTime: i < 6 ? pastDate(Math.floor(i / 2)) : undefined,
      distributor: user?.full_name || `配送员${i + 1}`,
      failReason: i >= 8 ? '收货地址不明确，无法送达' : undefined,
      receipt: i >= 4 ? [{ name: `${i < 8 ? '签收' : '退件'}_${distNum}.pdf`, url: '', type: 'application/pdf', uploadedAt: pastDate(i) }] : [],
      cancelReason: undefined,
      failureHistory: i >= 8 ? [{ time: pastDate(3), reason: '三次派送无人签收', type: 'delivery' }] : [],
      createTime: pastDate(2 + i * 2),
    };
    if (dtype === 'logistics') {
      Object.assign(dist, {
        logisticsCompany: logisticsCompanies[i],
        logisticsNumber: `LG${Date.now().toString(36).toUpperCase()}${i}`,
        logisticsDriverName: `司机${String.fromCharCode(65 + i)}`,
        logisticsDriverId: `4403${String(1980 + i)}${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
        logisticsDriverPhone: `137${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      });
    } else if (dtype === 'express') {
      Object.assign(dist, {
        expressCompany: logisticsCompanies[i],
        expressNumber: `SF${Date.now().toString(36).toUpperCase()}${i}`,
      });
    } else {
      Object.assign(dist, {
        companyDriverName: `司机${String.fromCharCode(65 + i)}`,
        companyDriverId: `4403${String(1980 + i)}${String(i + 1).padStart(2, '0')}${String(i + 1).padStart(4, '0')}`,
        companyDriverPhone: `136${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      });
    }
    distributionOrders.push(dist);
  }

  // ===== 4. 物料标签 (materialLabels) - 10 组 =====
  const materialLabels = [];
  for (let i = 0; i < 10; i++) {
    const prod = products[i];
    const note = deliveryNotes[i];
    materialLabels.push({
      id: id(),
      labelCode: `LBL-${today().replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
      productId: prod.id,
      productCode: prod.material_code,
      productName: prod.project_name,
      supplierId: '',
      supplierName: users[i % users.length]?.full_name || '供应商A',
      purchaseOrder: note.orderNumber || '',
      quantity: String(10 + i * 5),
      unit: '套',
      receiveDate: pastDate(4 + i),
      companyName: note.companyName,
      createTime: pastDate(5 + i),
      updateTime: pastDate(1 + i),
    });
  }

  // 生成浏览器控制台脚本
  console.log('// ===== 复制以下代码到浏览器控制台执行 =====');
  console.log('// 将向送货管理的 4 个表各注入 10 组测试数据\n');
  console.log(`const __seed_deliveryNotes = ${JSON.stringify(deliveryNotes)};`);
  console.log(`const __seed_shipmentOrders = ${JSON.stringify(shipmentOrders)};`);
  console.log(`const __seed_distributionOrders = ${JSON.stringify(distributionOrders)};`);
  console.log(`const __seed_materialLabels = ${JSON.stringify(materialLabels)};\n`);
  console.log(`localStorage.setItem('delivery_notes', JSON.stringify(__seed_deliveryNotes));`);
  console.log(`localStorage.setItem('delivery_shipment_orders', JSON.stringify(__seed_shipmentOrders));`);
  console.log(`localStorage.setItem('delivery_distribution_orders', JSON.stringify(__seed_distributionOrders));`);
  console.log(`localStorage.setItem('delivery_labels', JSON.stringify(__seed_materialLabels));`);
  console.log(`console.log('已注入 4 表各 10 组数据，刷新页面生效');`);

  // 同时输出 JSON 文件供参考
  const fs = require('fs');
  fs.writeFileSync('/workspace/project-management-system/scripts/delivery-seed-data.json', JSON.stringify({
    deliveryNotes, shipmentOrders, distributionOrders, materialLabels
  }, null, 2));
  console.log('\n// JSON 数据已保存到 scripts/delivery-seed-data.json');
}

main().catch(console.error);
