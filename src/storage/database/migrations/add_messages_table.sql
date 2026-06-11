-- 创建 messages 表 - 消息中心
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'personal' CHECK (type IN ('personal', 'announcement')),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sender_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  receiver_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_type_idx ON messages(type);
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON messages(is_read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at);
