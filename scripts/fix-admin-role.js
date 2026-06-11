#!/usr/bin/env node

/**
 * 修复权限管理 - 将admin用户的角色设置为system_admin
 *
 * 使用方法：
 * node scripts/fix-admin-role.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 从 .env 文件加载数据库URL
let databaseUrl = 'postgresql://postgres:postgres@localhost:5432/project_management';

// 尝试从 .env 文件读取
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const dbMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (dbMatch) {
      databaseUrl = dbMatch[1].trim();
    }
  }
} catch (error) {
  console.log('无法读取.env文件，使用默认配置');
}

// 创建数据库连接
const pool = new Pool({
  connectionString: databaseUrl,
});

async function fixAdminRole() {
  console.log('🔧 开始修复admin用户角色...\n');

  try {
    // 查找admin用户
    const result = await pool.query(
      'SELECT id, username, role, email, "fullName" FROM users WHERE username = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('❌ 未找到admin用户！');
      console.log('请先运行: node scripts/init-admin.js');
      process.exit(1);
    }

    const adminUser = result.rows[0];

    console.log('📋 当前用户信息：');
    console.log('   用户名:', adminUser.username);
    console.log('   角色:', adminUser.role);
    console.log('   邮箱:', adminUser.email);
    console.log('   全名:', adminUser.fullName);
    console.log('');

    // 检查角色是否已经是 system_admin
    if (adminUser.role === 'system_admin') {
      console.log('✅ admin用户的角色已经是 system_admin，无需修复！\n');
      console.log('ℹ️  权限管理API已更新，admin角色也可以访问权限管理功能。');
      process.exit(0);
    }

    // 更新用户角色
    console.log('🔄 正在更新admin用户角色为 system_admin...');
    await pool.query(
      'UPDATE users SET role = $1 WHERE username = $2',
      ['system_admin', 'admin']
    );

    console.log('✅ admin用户角色已更新为 system_admin！\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 更新后的用户信息：');
    console.log('   用户名:', adminUser.username);
    console.log('   角色: system_admin');
    console.log('   权限: 系统管理员（可访问权限管理）');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n💡 后续操作：');
    console.log('   1. 重新登录系统');
    console.log('   2. 访问后台管理 -> 权限管理');
    console.log('   3. 测试权限管理功能是否正常\n');

  } catch (error) {
    console.error('\n❌ 修复失败！\n');
    console.error('错误信息：', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 可能的原因：');
      console.error('   1. PostgreSQL 服务未启动');
      console.error('   2. 数据库配置信息不正确');
      console.error('   3. .env 文件中的 DATABASE_URL 配置错误\n');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行修复
fixAdminRole();
