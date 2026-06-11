#!/usr/bin/env node

/**
 * 初始化管理员账户脚本
 * 用于创建系统默认管理员账户
 *
 * 使用方法：
 * node scripts/init-admin.js
 *
 * 注意：生产环境请务必修改默认密码！
 */

const { drizzle } = require('drizzle-orm/node-postgres');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { eq } = require('drizzle-orm');
require('dotenv').config();

// 从 schema 导入 users 表
const { users, UserRole } = require('../src/storage/database/shared/schema');

// 创建数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://project_user:your_secure_password@localhost:5432/project_management',
});

const db = drizzle(pool);

// 默认管理员配置
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123', // ⚠️ 生产环境请务必修改！
  email: 'admin@example.com',
  fullName: '系统管理员',
  role: UserRole.SYSTEM_ADMIN,
};

async function initAdmin() {
  console.log('🚀 开始初始化管理员账户...\n');

  try {
    // 检查管理员是否已存在
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, DEFAULT_ADMIN.username))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log(`⚠️  管理员账户 "${DEFAULT_ADMIN.username}" 已存在！`);
      console.log('如需重置密码，请手动删除该用户后重新运行此脚本。');
      console.log('\n删除命令示例（psql）：');
      console.log(`DELETE FROM users WHERE username = '${DEFAULT_ADMIN.username}';`);
      process.exit(0);
    }

    // 加密密码
    console.log('🔐 正在加密密码...');
    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    // 创建管理员账户
    console.log('📝 正在创建管理员账户...');
    await db.insert(users).values({
      username: DEFAULT_ADMIN.username,
      email: DEFAULT_ADMIN.email,
      password: hashedPassword,
      fullName: DEFAULT_ADMIN.fullName,
      role: DEFAULT_ADMIN.role,
      isActive: true,
      isFirstLogin: true, // 首次登录后需要修改密码
      approvalStatus: 'approved', // 直接通过审批
    });

    console.log('\n✅ 管理员账户创建成功！\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 登录信息：');
    console.log('   用户名：', DEFAULT_ADMIN.username);
    console.log('   密码：', DEFAULT_ADMIN.password);
    console.log('   邮箱：', DEFAULT_ADMIN.email);
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n⚠️  重要提示：');
    console.log('   1. 首次登录后请立即修改密码！');
    console.log('   2. 生产环境部署前请务必更改默认密码！');
    console.log('   3. 请妥善保管管理员账户信息！\n');

  } catch (error) {
    console.error('\n❌ 初始化失败！\n');
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

// 运行初始化
initAdmin();
