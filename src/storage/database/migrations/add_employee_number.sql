-- 添加用户工号字段到users表
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50);
