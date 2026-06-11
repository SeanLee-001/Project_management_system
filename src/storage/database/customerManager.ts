import { eq, and, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { customers, customerContacts } from "./shared/schema";

export const customerManager = {
  // 获取所有客户
  async getAll() {
    const db = await getDb();
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  },

  // 根据ID获取客户
  async getById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return results[0] || null;
  },

  // 根据客户编号获取客户
  async getByCustomerCode(customerCode: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(customers)
      .where(eq(customers.customerCode, customerCode));
    return results[0] || null;
  },

  // 创建客户
  async create(data: {
    customerCode: string;
    customerName: string;
    phone?: string;
    address?: string;
    customerType: string;
    status?: string;
  }) {
    const db = await getDb();
    const results = await db.insert(customers).values(data).returning();
    return results[0];
  },

  // 更新客户
  async update(
    id: string,
    data: {
      customerName?: string;
      phone?: string;
      address?: string;
      customerType?: string;
      status?: string;
    }
  ) {
    const db = await getDb();
    const results = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return results[0];
  },

  // 删除客户
  async delete(id: string) {
    const db = await getDb();
    const results = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return results[0];
  },

  // 获取客户的联系人
  async getContacts(customerId: string) {
    const db = await getDb();
    return db
      .select()
      .from(customerContacts)
      .where(eq(customerContacts.customerId, customerId))
      .orderBy(desc(customerContacts.createdAt));
  },

  // 创建联系人
  async createContact(data: {
    customerId: string;
    contactType: string;
    contactName: string;
    contactPhone?: string;
    contactEmail?: string;
    position?: string;
  }) {
    const db = await getDb();
    const results = await db.insert(customerContacts).values(data).returning();
    return results[0];
  },

  // 更新联系人
  async updateContact(
    id: string,
    data: {
      contactType?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      position?: string;
    }
  ) {
    const db = await getDb();
    const results = await db
      .update(customerContacts)
      .set(data)
      .where(eq(customerContacts.id, id))
      .returning();
    return results[0];
  },

  // 删除联系人
  async deleteContact(id: string) {
    const db = await getDb();
    const results = await db
      .delete(customerContacts)
      .where(eq(customerContacts.id, id))
      .returning();
    return results[0];
  },

  // 获取特定类型的联系人
  async getContactsByType(customerId: string, contactType: string) {
    const db = await getDb();
    return db
      .select()
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.customerId, customerId),
          eq(customerContacts.contactType, contactType)
        )
      )
      .orderBy(desc(customerContacts.createdAt));
  },
};
