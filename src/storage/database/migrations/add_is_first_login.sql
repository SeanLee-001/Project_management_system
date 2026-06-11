-- 添加 isFirstLogin 字段到 users 表
-- 如果字段已存在则忽略
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT true NOT NULL;

-- 为现有用户设置默认值
UPDATE users SET is_first_login = true WHERE is_first_login IS NULL;
