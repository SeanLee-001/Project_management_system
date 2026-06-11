import { eq, like, or, and, sql, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { orders, contracts, customers, products } from "./shared/schema";

export const orderManager = {
  // 获取所有订单
  async getAll() {
    const db = await getDb();
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  },

  // 根据ID获取订单
  async getById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return results[0] || null;
  },

  // 根据合同编码获取订单
  async getByContractCode(contractCode: string) {
    const db = await getDb();
    return db
      .select()
      .from(orders)
      .where(eq(orders.contractCode, contractCode))
      .orderBy(desc(orders.createdAt));
  },

  // 根据客户编码获取订单
  async getByCustomerCode(customerCode: string) {
    const db = await getDb();
    return db
      .select()
      .from(orders)
      .where(eq(orders.customerCode, customerCode))
      .orderBy(desc(orders.createdAt));
  },

  // 高级查询（支持多种条件组合）
  async advancedSearch(params: {
    keyword?: string;
    year?: number;
    month?: number;
    startDate?: string;
    endDate?: string;
    customerCode?: string;
    customerName?: string;
    status?: string;
  }) {
    const db = await getDb();
    const conditions = [];

    // 关键词搜索
    if (params.keyword) {
      conditions.push(
        or(
          like(orders.customerName, `%${params.keyword}%`),
          like(orders.contractCode, `%${params.keyword}%`),
          like(orders.projectName, `%${params.keyword}%`),
          like(orders.materialCode, `%${params.keyword}%`)
        )
      );
    }

    // 年度查询 - 使用 SQL 的 date_part 函数
    if (params.year) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${orders.orderDate}) = ${params.year}`
      );
    }

    // 年度和月度查询
    if (params.year && params.month) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${orders.orderDate}) = ${params.year} AND EXTRACT(MONTH FROM ${orders.orderDate}) = ${params.month}`
      );
    }

    // 日期范围查询
    if (params.startDate && params.endDate) {
      conditions.push(
        and(
          sql`${orders.orderDate} >= ${new Date(params.startDate)}`,
          sql`${orders.orderDate} <= ${new Date(params.endDate)}`
        )
      );
    }

    // 客户查询
    if (params.customerCode) {
      conditions.push(eq(orders.customerCode, params.customerCode));
    }

    // 客户名称查询（模糊匹配）
    if (params.customerName) {
      conditions.push(like(orders.customerName, `%${params.customerName}%`));
    }

    // 状态查询
    if (params.status) {
      conditions.push(eq(orders.status, params.status));
    }

    // 如果有条件，组合查询；否则返回所有
    if (conditions.length > 0) {
      return db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt));
    } else {
      return db.select().from(orders).orderBy(desc(orders.createdAt));
    }
  },

  // 模糊查询订单（按客户名称、合同号、项目名称或物料编码）
  async search(keyword: string) {
    const db = await getDb();
    return db
      .select()
      .from(orders)
      .where(
        or(
          like(orders.customerName, `%${keyword}%`),
          like(orders.contractCode, `%${keyword}%`),
          like(orders.projectName, `%${keyword}%`),
          like(orders.materialCode, `%${keyword}%`)
        )
      )
      .orderBy(desc(orders.createdAt));
  },

  // 创建订单
  async create(data: {
    orderDate?: Date | string;
    contractCode?: string;
    customerCode?: string;
    customerName?: string;
    materialCode?: string;
    projectName?: string;
    specification?: string;
    quantity?: string;
    deliveryDate?: Date | string;
    actualDeliveryDate?: Date | string;
    status?: string;
    projectProgress?: string;
    paymentTerms?: string;
    orderAmount?: string;
    prepayRatio?: string;
    prepayAmount?: string;
    prepayReceived?: boolean;
    prepayDate?: Date | string;
    prepayInvoiceAmount?: string;
    prepayInvoiceDate?: Date | string;
    prepayInvoiced?: boolean;
    arrivalAmount?: string;
    arrivalReceived?: boolean;
    arrivalDate?: Date | string;
    arrivalInvoiceAmount?: string;
    arrivalInvoiceDate?: Date | string;
    arrivalInvoiced?: boolean;
    arrivalRatio?: string;
    acceptanceRatio?: string;
    acceptanceAmount?: string;
    acceptanceReceived?: boolean;
    acceptanceDate?: Date | string;
    acceptanceInvoiceAmount?: string;
    acceptanceInvoiceDate?: Date | string;
    acceptanceInvoiced?: boolean;
    warrantyRatio?: string;
    warrantyAmount?: string;
    warrantyReceived?: boolean;
    warrantyDate?: Date | string;
    warrantyInvoiceAmount?: string;
    warrantyInvoiceDate?: Date | string;
    warrantyInvoiced?: boolean;
    notes?: string;
  }) {
    const db = await getDb();

    // 如果提供了合同编码，从合同中获取相关信息
    let orderData = { ...data };
    if (data.contractCode) {
      const contract = await db
        .select()
        .from(contracts)
        .where(eq(contracts.contractCode, data.contractCode))
        .limit(1);

      if (contract.length > 0) {
        // 从合同中自动填充客户信息
        if (!orderData.customerCode) orderData.customerCode = contract[0].customerCode;
        if (!orderData.customerName) orderData.customerName = contract[0].customerName;

        // 从合同中自动带出订单日期（来自合同日期）和项目名称（来自合同名称）
        if (!orderData.orderDate && contract[0].contractDate) {
          orderData.orderDate = contract[0].contractDate;
        }
        if (!orderData.projectName && contract[0].contractName) {
          orderData.projectName = contract[0].contractName;
        }
      }
    }

    // 检查客户状态
    if (orderData.customerCode) {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerCode, orderData.customerCode))
        .limit(1);

      if (customer.length > 0) {
        if (customer[0].status === 'inactive') {
          throw new Error(`客户 "${customer[0].customerName}" (${customer[0].customerCode}) 已停止合作，禁止交易`);
        }
        // 确保使用数据库中的客户名称
        if (customer[0].customerName) {
          orderData.customerName = customer[0].customerName;
        }
      }
    }

    // 检查产品状态
    if (orderData.materialCode) {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.materialCode, orderData.materialCode))
        .limit(1);

      if (product.length > 0) {
        if (product[0].status === 'inactive') {
          throw new Error(`产品 "${product[0].projectName}" (${product[0].materialCode}) 已停用，禁止使用`);
        }
        // 自动填充产品信息
        if (!orderData.projectName && product[0].projectName) {
          orderData.projectName = product[0].projectName;
        }
        if (!orderData.specification && product[0].specification) {
          orderData.specification = product[0].specification;
        }
      }
    }

    // 转换日期字符串为Date对象，并确保布尔字段有默认值
    const values = {
      ...orderData,
      orderDate: orderData.orderDate ? new Date(orderData.orderDate) : undefined,
      deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : undefined,
      actualDeliveryDate: orderData.actualDeliveryDate ? new Date(orderData.actualDeliveryDate) : undefined,
      prepayRatio: orderData.prepayRatio || undefined,
      prepayAmount: orderData.prepayAmount || undefined,
      prepayReceived: orderData.prepayReceived ?? false,
      prepayDate: orderData.prepayDate ? new Date(orderData.prepayDate) : undefined,
      prepayInvoiceAmount: orderData.prepayInvoiceAmount || undefined,
      prepayInvoiceDate: orderData.prepayInvoiceDate ? new Date(orderData.prepayInvoiceDate) : undefined,
      prepayInvoiced: orderData.prepayInvoiced ?? false,
      arrivalAmount: orderData.arrivalAmount || undefined,
      arrivalReceived: orderData.arrivalReceived ?? false,
      arrivalDate: orderData.arrivalDate ? new Date(orderData.arrivalDate) : undefined,
      arrivalInvoiceAmount: orderData.arrivalInvoiceAmount || undefined,
      arrivalInvoiceDate: orderData.arrivalInvoiceDate ? new Date(orderData.arrivalInvoiceDate) : undefined,
      arrivalInvoiced: orderData.arrivalInvoiced ?? false,
      arrivalRatio: orderData.arrivalRatio || undefined,
      acceptanceRatio: orderData.acceptanceRatio || undefined,
      acceptanceAmount: orderData.acceptanceAmount || undefined,
      acceptanceReceived: orderData.acceptanceReceived ?? false,
      acceptanceDate: orderData.acceptanceDate ? new Date(orderData.acceptanceDate) : undefined,
      acceptanceInvoiceAmount: orderData.acceptanceInvoiceAmount || undefined,
      acceptanceInvoiceDate: orderData.acceptanceInvoiceDate ? new Date(orderData.acceptanceInvoiceDate) : undefined,
      acceptanceInvoiced: orderData.acceptanceInvoiced ?? false,
      warrantyRatio: orderData.warrantyRatio || undefined,
      warrantyAmount: orderData.warrantyAmount || undefined,
      warrantyReceived: orderData.warrantyReceived ?? false,
      warrantyDate: (orderData as any).warrantyDate ? new Date((orderData as any).warrantyDate) : undefined,
      warrantyInvoiceAmount: (orderData as any).warrantyInvoiceAmount || undefined,
      warrantyInvoiceDate: (orderData as any).warrantyInvoiceDate ? new Date((orderData as any).warrantyInvoiceDate) : undefined,
      warrantyInvoiced: (orderData as any).warrantyInvoiced ?? false,
    };

    const results = await db.insert(orders).values(values).returning();
    return results[0];
  },

  // 更新订单
  async update(
    id: string,
    data: {
      orderDate?: Date | string;
      contractCode?: string;
      customerCode?: string;
      customerName?: string;
      materialCode?: string;
      projectName?: string;
      specification?: string;
      quantity?: string;
      deliveryDate?: Date | string;
      actualDeliveryDate?: Date | string;
      status?: string;
      projectProgress?: string;
      paymentTerms?: string;
      orderAmount?: string;
      prepayRatio?: string;
      prepayAmount?: string;
      prepayReceived?: boolean;
      prepayDate?: Date | string;
      prepayInvoiceAmount?: string;
      prepayInvoiceDate?: Date | string;
      prepayInvoiced?: boolean;
      arrivalAmount?: string;
      arrivalReceived?: boolean;
      arrivalDate?: Date | string;
      arrivalInvoiceAmount?: string;
      arrivalInvoiceDate?: Date | string;
      arrivalInvoiced?: boolean;
      arrivalRatio?: string;
      acceptanceRatio?: string;
      acceptanceAmount?: string;
      acceptanceReceived?: boolean;
      acceptanceDate?: Date | string;
      acceptanceInvoiceAmount?: string;
      acceptanceInvoiceDate?: Date | string;
      acceptanceInvoiced?: boolean;
      warrantyRatio?: string;
      warrantyAmount?: string;
      warrantyReceived?: boolean;
      warrantyDate?: Date | string;
      warrantyInvoiceAmount?: string;
      warrantyInvoiceDate?: Date | string;
      warrantyInvoiced?: boolean;
      notes?: string;
    }
  ) {
    const db = await getDb();

    // 转换日期字符串为Date对象
    const values = {
      ...data,
      orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      actualDeliveryDate: data.actualDeliveryDate ? new Date(data.actualDeliveryDate) : undefined,
      prepayRatio: data.prepayRatio || undefined,
      prepayAmount: data.prepayAmount || undefined,
      prepayReceived: data.prepayReceived ?? false,
      prepayDate: data.prepayDate ? new Date(data.prepayDate) : undefined,
      prepayInvoiceAmount: data.prepayInvoiceAmount || undefined,
      prepayInvoiceDate: data.prepayInvoiceDate ? new Date(data.prepayInvoiceDate) : undefined,
      prepayInvoiced: data.prepayInvoiced ?? false,
      arrivalAmount: data.arrivalAmount || undefined,
      arrivalReceived: data.arrivalReceived ?? false,
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
      arrivalInvoiceAmount: data.arrivalInvoiceAmount || undefined,
      arrivalInvoiceDate: data.arrivalInvoiceDate ? new Date(data.arrivalInvoiceDate) : undefined,
      arrivalInvoiced: data.arrivalInvoiced ?? false,
      arrivalRatio: data.arrivalRatio || undefined,
      acceptanceRatio: data.acceptanceRatio || undefined,
      acceptanceAmount: data.acceptanceAmount || undefined,
      acceptanceReceived: data.acceptanceReceived ?? false,
      acceptanceDate: data.acceptanceDate ? new Date(data.acceptanceDate) : undefined,
      acceptanceInvoiceAmount: data.acceptanceInvoiceAmount || undefined,
      acceptanceInvoiceDate: data.acceptanceInvoiceDate ? new Date(data.acceptanceInvoiceDate) : undefined,
      acceptanceInvoiced: data.acceptanceInvoiced ?? false,
      warrantyRatio: data.warrantyRatio || undefined,
      warrantyAmount: data.warrantyAmount || undefined,
      warrantyReceived: data.warrantyReceived ?? false,
      warrantyDate: (data as any).warrantyDate ? new Date((data as any).warrantyDate) : undefined,
      warrantyInvoiceAmount: (data as any).warrantyInvoiceAmount || undefined,
      warrantyInvoiceDate: (data as any).warrantyInvoiceDate ? new Date((data as any).warrantyInvoiceDate) : undefined,
      warrantyInvoiced: (data as any).warrantyInvoiced ?? false,
    };

    const results = await db
      .update(orders)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return results[0];
  },

  // 删除订单
  async delete(id: string) {
    const db = await getDb();
    const results = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();
    return results[0];
  },

  // 检查订单号是否存在（如果需要唯一性约束）
  async checkOrderCodeExists(orderCode: string, excludeId?: string) {
    const db = await getDb();
    const conditions = [eq(orders.contractCode, orderCode)];

    if (excludeId) {
      conditions.push(eq(orders.id, excludeId));
    }

    const results = await db
      .select()
      .from(orders)
      .where(and(...conditions));

    return results.length > 0;
  },
};
