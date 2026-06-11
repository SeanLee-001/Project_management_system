-- 添加质保款相关字段到orders表
-- 迁移日期: 2024-01-XX

-- 添加质保金额
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_amount VARCHAR(50);

-- 添加质保金付款日期
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_date TIMESTAMP WITH TIME ZONE;

-- 添加质保款开票金额
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_invoice_amount VARCHAR(50);

-- 添加质保款开票日期
ALTER TABLE orders ADD COLUMN IF NOT EXISTS warranty_invoice_date TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN orders.warranty_amount IS '质保金额';
COMMENT ON COLUMN orders.warranty_date IS '质保金付款日期';
COMMENT ON COLUMN orders.warranty_invoice_amount IS '质保款开票金额';
COMMENT ON COLUMN orders.warranty_invoice_date IS '质保款开票日期';
