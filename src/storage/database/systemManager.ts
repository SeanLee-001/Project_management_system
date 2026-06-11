import { eq, and, SQL, like } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { systemSettings, insertSystemSettingSchema, updateSystemSettingSchema } from "./shared/schema";
import type { SystemSetting, InsertSystemSetting, UpdateSystemSetting } from "./shared/schema";

export class SystemManager {
  async getSetting(key: string): Promise<SystemSetting | null> {
    const db = await getDb();
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting || null;
  }

  async getSettings(keys?: string[]): Promise<SystemSetting[]> {
    const db = await getDb();

    if (keys && keys.length > 0) {
      return db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, keys[0]));
    }

    return db.select().from(systemSettings);
  }

  async upsertSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const db = await getDb();

    const existing = await this.getSetting(key);

    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(systemSettings.key, key))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(systemSettings)
      .values({
        key,
        value,
        description,
      })
      .returning();
    return created;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(systemSettings).where(eq(systemSettings.key, key));
    return (result.rowCount ?? 0) > 0;
  }

  // 获取公司名称（默认为"XXX公司"）
  async getCompanyName(): Promise<string> {
    const setting = await this.getSetting("company_name");
    return setting?.value || "XXX公司";
  }

  // 设置公司名称
  async setCompanyName(name: string): Promise<SystemSetting> {
    return this.upsertSetting("company_name", name, "公司名称");
  }

  // 获取公司logo URL
  async getCompanyLogo(): Promise<string | null> {
    const setting = await this.getSetting("company_logo");
    return setting?.value || null;
  }

  // 设置公司logo URL
  async setCompanyLogo(url: string): Promise<SystemSetting> {
    return this.upsertSetting("company_logo", url, "公司Logo");
  }

  // 获取系统版本号（默认为"1.0.0"）
  async getSystemVersion(): Promise<string> {
    const setting = await this.getSetting("system_version");
    return setting?.value || "1.0.0";
  }

  // 设置系统版本号
  async setSystemVersion(version: string): Promise<SystemSetting> {
    return this.upsertSetting("system_version", version, "系统版本号");
  }

  // 获取系统提示风格（默认为"default"）
  async getAlertStyle(): Promise<string> {
    const setting = await this.getSetting("alert_style");
    return setting?.value || "default";
  }

  // 设置系统提示风格
  async setAlertStyle(styleId: string): Promise<SystemSetting> {
    return this.upsertSetting("alert_style", styleId, "系统提示对话框风格");
  }
}

export const systemManager = new SystemManager();
