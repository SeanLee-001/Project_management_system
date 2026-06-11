-- 添加用户菜单配置字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS menu_configuration TEXT;
