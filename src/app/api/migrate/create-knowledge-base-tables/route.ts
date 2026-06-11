import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    console.log('开始创建知识库相关表...');

    // 创建 knowledge_base 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
        task_id VARCHAR(36) REFERENCES tasks(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'general',
        tags TEXT,
        created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        updated_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        view_count VARCHAR(20) DEFAULT '0',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);

    console.log('knowledge_base 表创建成功');

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_title_idx ON knowledge_base(title);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_project_id_idx ON knowledge_base(project_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_task_id_idx ON knowledge_base(task_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON knowledge_base(category);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_created_by_idx ON knowledge_base(created_by);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_created_at_idx ON knowledge_base(created_at);
    `);

    console.log('knowledge_base 表索引创建成功');

    // 创建 knowledge_base_attachments 表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_base_attachments (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        knowledge_base_id VARCHAR(36) NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        file_size VARCHAR(50),
        file_type VARCHAR(100) NOT NULL,
        uploaded_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    console.log('knowledge_base_attachments 表创建成功');

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_attachments_kb_id_idx ON knowledge_base_attachments(knowledge_base_id);
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS knowledge_base_attachments_file_type_idx ON knowledge_base_attachments(file_type);
    `);

    console.log('knowledge_base_attachments 表索引创建成功');

    console.log('知识库相关表创建完成！');

    return NextResponse.json({
      success: true,
      message: '知识库相关表创建成功',
    });
  } catch (error) {
    console.error('创建知识库表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
