import { eq, like, or, and, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { contracts, customers } from "./shared/schema";

export const contractManager = {
  // 获取所有合同
  async getAll() {
    const db = await getDb();
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  },

  // 根据ID获取合同
  async getById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, id));
    return results[0] || null;
  },

  // 根据合同编码获取合同
  async getByContractCode(contractCode: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(contracts)
      .where(eq(contracts.contractCode, contractCode));
    return results[0] || null;
  },

  // 根据客户编码获取合同
  async getByCustomerCode(customerCode: string) {
    const db = await getDb();
    return db
      .select()
      .from(contracts)
      .where(eq(contracts.customerCode, customerCode))
      .orderBy(desc(contracts.createdAt));
  },

  // 模糊查询合同（按客户名称、合同名称或合同编码）
  async search(keyword: string) {
    const db = await getDb();
    return db
      .select()
      .from(contracts)
      .where(
        or(
          like(contracts.customerName, `%${keyword}%`),
          like(contracts.contractName, `%${keyword}%`),
          like(contracts.contractCode, `%${keyword}%`)
        )
      )
      .orderBy(desc(contracts.createdAt));
  },

  // 创建合同
  async create(data: {
    contractCode: string;
    contractName: string;
    contractDate?: string | Date;
    customerCode: string;
    customerId: string;
    customerName: string;
    contractAmount?: string;
    technicalManager?: string;
    technicalPhone?: string;
    procurementManager?: string;
    procurementPhone?: string;
    attachment1Url?: string;
    attachment2Url?: string;
    attachment3Url?: string;
    status?: string;
  }) {
    const db = await getDb();
    const values = {
      ...data,
      contractDate: data.contractDate ? new Date(data.contractDate) : undefined,
    };
    const results = await db.insert(contracts).values(values).returning();
    return results[0];
  },

  // 更新合同
  async update(
    id: string,
    data: {
      contractName?: string;
      contractDate?: string | Date;
      customerCode?: string;
      customerId?: string;
      customerName?: string;
      contractAmount?: string;
      technicalManager?: string;
      technicalPhone?: string;
      procurementManager?: string;
      procurementPhone?: string;
      attachment1Url?: string;
      attachment2Url?: string;
      attachment3Url?: string;
      status?: string;
    }
  ) {
    const db = await getDb();
    const values = {
      ...data,
      contractDate: data.contractDate ? new Date(data.contractDate) : undefined,
    };
    const results = await db
      .update(contracts)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return results[0];
  },

  // 删除合同
  async delete(id: string) {
    const db = await getDb();
    const results = await db
      .delete(contracts)
      .where(eq(contracts.id, id))
      .returning();
    return results[0];
  },

  // 检查合同编码是否存在
  async checkContractCodeExists(contractCode: string, excludeId?: string) {
    const db = await getDb();
    const conditions = [eq(contracts.contractCode, contractCode)];

    if (excludeId) {
      conditions.push(eq(contracts.id, excludeId));
    }

    const results = await db
      .select()
      .from(contracts)
      .where(and(...conditions));

    return results.length > 0;
  },
};
