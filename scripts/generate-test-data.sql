-- 生成测试数据 SQL 脚本
-- 为系统每个主要表格生成 20 条测试数据

-- ========================================
-- 1. 生成部门 (5 个)
-- ========================================
INSERT INTO departments (id, name, code, description, "isActive")
SELECT 
    gen_random_uuid(),
    '测试部门' || i,
    'DEPT' || LPAD(i::text, 3, '0'),
    '测试部门描述' || i,
    true
FROM generate_series(1, 5) AS i
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 2. 生成用户 (20 个)
-- ========================================
INSERT INTO users (id, username, email, "fullName", role, "employeeNumber", phone, "isActive")
SELECT 
    gen_random_uuid(),
    'user' || i,
    'user' || i || '@test.com',
    CASE (i % 20)
        WHEN 0 THEN '张三' WHEN 1 THEN '李四' WHEN 2 THEN '王五' WHEN 3 THEN '赵六'
        WHEN 4 THEN '钱七' WHEN 5 THEN '孙八' WHEN 6 THEN '周九' WHEN 7 THEN '吴十'
        WHEN 8 THEN '郑一' WHEN 9 THEN '王菲' WHEN 10 THEN '马云' WHEN 11 THEN '雷军'
        WHEN 12 THEN '马化腾' WHEN 13 THEN '李彦宏' WHEN 14 THEN '刘强东' WHEN 15 THEN '张一鸣'
        WHEN 16 THEN '黄峥' WHEN 17 THEN '宿华' WHEN 18 THEN '程维' WHEN 19 THEN '王小川'
    END,
    'user',
    'EMP' || LPAD(i::text, 5, '0'),
    '138' || (10000000 + i)::text,
    true
FROM generate_series(1, 20) AS i
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. 生成客户 (20 个)
-- ========================================
INSERT INTO customers (id, "customerCode", "customerName", industry, level, contact, phone, email, address)
SELECT 
    gen_random_uuid(),
    'CUST' || LPAD(i::text, 5, '0'),
    CASE (i % 20)
        WHEN 0 THEN '华为技术有限公司' WHEN 1 THEN '腾讯科技有限公司' WHEN 2 THEN '阿里巴巴集团'
        WHEN 3 THEN '百度集团' WHEN 4 THEN '字节跳动科技有限公司' WHEN 5 THEN '美团科技有限公司'
        WHEN 6 THEN '京东集团' WHEN 7 THEN '小米集团' WHEN 8 THEN 'OPPO 广东移动通信有限公司'
        WHEN 9 THEN 'VIVO 移动通信有限公司' WHEN 10 THEN '比亚迪股份有限公司' WHEN 11 THEN '宁德时代新能源科技股份有限公司'
        WHEN 12 THEN '格力电器股份有限公司' WHEN 13 THEN '美的集团' WHEN 14 THEN '海尔智家股份有限公司'
        WHEN 15 THEN 'TCL 科技集团股份有限公司' WHEN 16 THEN '海信集团' WHEN 17 THEN '创维集团'
        WHEN 18 THEN '联想集团' WHEN 19 THEN '华硕电脑股份有限公司'
    END,
    (ARRAY['电子', '互联网', '通信', '制造', '能源', '金融', '零售'])[1 + (i % 7)],
    (ARRAY['A', 'B', 'C', 'D'])[1 + (i % 4)],
    (ARRAY['张三', '李四', '王五', '赵六'])[1 + (i % 4)],
    '0755-' || (10000000 + i)::text,
    'contact' || i || '@company.com',
    '深圳市南山区科技园' || i || '号楼'
FROM generate_series(1, 20) AS i
ON CONFLICT (id) DO NOTHING;

