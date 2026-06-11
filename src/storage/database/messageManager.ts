import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { messages, insertMessageSchema, updateMessageSchema } from "./shared/schema";
import type { Message, InsertMessage, UpdateMessage } from "./shared/schema";
import { users } from "./shared/schema";

export class MessageManager {
  async createMessage(data: InsertMessage): Promise<Message> {
    const db = await getDb();

    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  async getMessagesByReceiverId(receiverId: string): Promise<Message[]> {
    const db = await getDb();

    // 获取个人消息、系统通告、系统文档和知识库文档
    const messagesList = await db
      .select({
        id: messages.id,
        type: messages.type,
        title: messages.title,
        content: messages.content,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        isRead: messages.isRead,
        readAt: messages.readAt,
        isPinned: messages.isPinned,
        documentUrl: messages.documentUrl,
        relatedId: messages.relatedId,
        relatedType: messages.relatedType,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        sql`(${messages.type} = 'announcement') OR (${messages.type} = 'system_document') OR (${messages.type} = 'knowledge_base') OR (${messages.receiverId} = ${receiverId})`
      )
      .orderBy(
        // 置顶消息排在前面
        sql`CASE WHEN ${messages.isPinned} = true THEN 0 ELSE 1 END`,
        desc(messages.createdAt)
      );

    return messagesList;
  }

  async getUnreadCount(receiverId: string): Promise<number> {
    const db = await getDb();

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          sql`(${messages.type} = 'announcement') OR (${messages.type} = 'system_document') OR (${messages.type} = 'knowledge_base') OR (${messages.receiverId} = ${receiverId})`,
          eq(messages.isRead, false)
        )
      );

    return result.count;
  }

  async markAsRead(id: string): Promise<Message> {
    const db = await getDb();

    const [message] = await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning();

    return message;
  }

  async markAllAsRead(receiverId: string): Promise<void> {
    const db = await getDb();

    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          sql`(${messages.type} = 'announcement') OR (${messages.type} = 'system_document') OR (${messages.type} = 'knowledge_base') OR (${messages.receiverId} = ${receiverId})`,
          eq(messages.isRead, false)
        )
      );
  }

  async deleteMessage(id: string): Promise<void> {
    const db = await getDb();

    await db.delete(messages).where(eq(messages.id, id));
  }

  async sendMessageToUser(data: {
    senderId: string;
    receiverId: string;
    title: string;
    content: string;
    relatedId?: string;
    relatedType?: string;
  }): Promise<Message> {
    return this.createMessage({
      type: "personal",
      senderId: data.senderId,
      receiverId: data.receiverId,
      title: data.title,
      content: data.content,
      relatedId: data.relatedId,
      relatedType: data.relatedType,
    });
  }

  async sendAnnouncement(data: {
    senderId: string;
    title: string;
    content: string;
  }): Promise<Message> {
    return this.createMessage({
      type: "announcement",
      senderId: data.senderId,
      title: data.title,
      content: data.content,
      receiverId: null, // 通告没有接收者
    });
  }
}

export const messageManager = new MessageManager();
