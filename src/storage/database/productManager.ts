import { eq, and, SQL, like, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  products,
  insertProductSchema,
  updateProductSchema,
} from "./shared/schema";
import type { Product, InsertProduct, UpdateProduct } from "./shared/schema";

export class ProductManager {
  async createProduct(data: InsertProduct): Promise<Product> {
    const db = await getDb();
    const validated = insertProductSchema.parse(data);
    const [product] = await db.insert(products).values(validated).returning();
    return product;
  }

  async getProducts(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<Product, "id" | "status" | "materialCode" | "projectName">>;
    search?: string;
  } = {}): Promise<Product[]> {
    const { skip = 0, limit = 100, filters = {}, search = "" } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(products.id, filters.id));
    }
    if (filters.status !== undefined) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters.materialCode !== undefined) {
      conditions.push(eq(products.materialCode, filters.materialCode));
    }
    if (filters.projectName !== undefined) {
      conditions.push(eq(products.projectName, filters.projectName));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(skip);
    }

    return db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(skip);
  }

  async getProductById(id: string): Promise<Product | null> {
    const db = await getDb();
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || null;
  }

  async updateProduct(id: string, data: UpdateProduct): Promise<Product | null> {
    const db = await getDb();
    const validated = updateProductSchema.parse(data);
    const [product] = await db
      .update(products)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product || null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getProductOptions(): Promise<{ id: string; materialCode: string; projectName: string }[]> {
    const db = await getDb();
    return db
      .select({
        id: products.id,
        materialCode: products.materialCode,
        projectName: products.projectName,
      })
      .from(products)
      .where(eq(products.status, "active"))
      .orderBy(products.materialCode);
  }

  async getProductByMaterialCode(materialCode: string): Promise<Product | null> {
    const db = await getDb();
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.materialCode, materialCode));
    return product || null;
  }

  async searchProductsByMaterialCode(keyword: string): Promise<Product[]> {
    const db = await getDb();
    return db
      .select()
      .from(products)
      .where(like(products.materialCode, `%${keyword}%`))
      .orderBy(products.materialCode)
      .limit(20);
  }
}

export const productManager = new ProductManager();
