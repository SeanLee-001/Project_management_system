/**
 * 本地部署数据库初始化脚本
 * 
 * 用法: pnpm db:init
 * 
 * 前置条件:
 * 1. PostgreSQL 已安装并运行
 * 2. 已创建数据库（如: createdb project_management）
 * 3. .env 中已配置 PGDATABASE_URL
 */

import { sql, eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import * as schema from "../src/storage/database/shared/schema";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🚀 开始初始化本地数据库...\n");

  // Step 1: 检查数据库连接
  console.log("📡 Step 1: 检查数据库连接...");
  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb(schema);
    const result = await db.execute(sql`SELECT version()`);
    console.log("✅ 数据库连接成功!");
    console.log(`   PostgreSQL 版本: ${result.rows[0]?.version?.toString().split(",")[0]}\n`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ 数据库连接失败!");
    console.error(`   错误: ${msg}`);
    console.error("\n请检查以下配置:");
    console.error("  1. PostgreSQL 服务是否已启动");
    console.error("  2. .env 文件中 PGDATABASE_URL 是否正确配置");
    console.error("  3. 数据库是否已创建 (createdb project_management)");
    console.error("\nPGDATABASE_URL 格式示例:");
    console.error("  PGDATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/project_management");
    process.exit(1);
  }

  // Step 2: 启用必要扩展
  console.log("🔧 Step 2: 启用 PostgreSQL 扩展...");
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log("✅ pgcrypto 扩展已启用\n");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  pgcrypto 扩展启用失败 (PG 13+ 可忽略): ${msg}\n`);
  }

  // Step 3: 创建默认角色
  console.log("👤 Step 3: 创建默认角色和超级管理员...");
  try {
    const existingRoles = await db.select().from(schema.roles);
    if (existingRoles.length === 0) {
      await db.insert(schema.roles).values([
        { roleCode: "system_admin", roleName: "超级管理员", description: "系统最高权限角色，可管理所有功能", isSystem: true, isActive: true },
        { roleCode: "project_manager", roleName: "项目经理", description: "项目管理角色，可管理项目和任务", isSystem: false, isActive: true },
        { roleCode: "project_member", roleName: "普通用户", description: "基础用户角色，使用基本功能", isSystem: false, isActive: true },
      ]);
      console.log("✅ 默认角色已创建 (超级管理员/项目经理/普通用户)");
    } else {
      console.log("ℹ️  角色已存在，跳过创建");
    }

    // 创建超级管理员
    const existingUsers = await db.select().from(schema.users);
    if (existingUsers.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const superAdminRole = await db.select().from(schema.roles).where(eq(schema.roles.roleCode, "system_admin")).limit(1);

      await db.insert(schema.users).values({
        username: "admin",
        email: "admin@localhost",
        password: hashedPassword,
        fullName: "超级管理员",
        role: "system_admin",
        departmentId: superAdminRole[0]?.id,
        isActive: true,
        isFirstLogin: true,
        approvalStatus: "approved",
      });
      console.log("✅ 超级管理员已创建 (用户名: admin, 密码: admin123)");
      console.log("   ⚠️  请登录后立即修改默认密码!");
    } else {
      console.log("ℹ️  用户已存在，跳过创建");
    }

    // 创建默认部门
    const existingDepts = await db.select().from(schema.departments);
    if (existingDepts.length === 0) {
      await db.insert(schema.departments).values([
        { departmentCode: "MGT", departmentName: "管理层", description: "公司管理层" },
        { departmentCode: "TECH", departmentName: "技术部", description: "技术研发部门" },
        { departmentCode: "MKT", departmentName: "市场部", description: "市场销售部门" },
        { departmentCode: "ADM", departmentName: "行政部", description: "行政人事部门" },
        { departmentCode: "FIN", departmentName: "财务部", description: "财务审计部门" },
      ]);
      console.log("✅ 默认部门已创建");
    } else {
      console.log("ℹ️  部门已存在，跳过创建");
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  初始化默认数据失败: ${msg}`);
    console.warn("   这可能是因为表结构尚未创建，请先执行: pnpm db:upgrade");
  }

  console.log("\n🎉 数据库初始化完成!");
  console.log("\n📝 下一步:");
  console.log("  1. 运行 pnpm dev 启动开发服务器");
  console.log("  2. 访问 http://localhost:5000");
  console.log("  3. 使用 admin / admin123 登录");
  console.log("  4. 登录后请立即修改默认密码");
}

main().catch(console.error);
