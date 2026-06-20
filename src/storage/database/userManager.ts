import { eq, and, SQL, like, or } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { users, departments, insertUserSchema, updateUserSchema } from "./shared/schema";
import type { User, InsertUser, UpdateUser } from "./shared/schema";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export class UserManager {
  async createUser(data: InsertUser, skipApproval: boolean = false): Promise<User> {
    const db = await getDb();

    const passwordToHash = data.password || generateSecurePassword();
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);

    // 设置密码过期时间为1个月后
    const passwordExpireAt = new Date();
    passwordExpireAt.setMonth(passwordExpireAt.getMonth() + 1);

    // 审核状态逻辑：
    // - 系统管理员：默认审核通过
    // - 管理员创建的用户（skipApproval=true）：直接审核通过
    // - 用户注册：默认待审核
    const approvalStatus = data.role === "system_admin" || skipApproval ? "approved" : "pending";

    const [user] = await db.insert(users).values({
      ...data,
      password: hashedPassword,
      passwordExpireAt,
      isFirstLogin: true, // 标记为首次登录
      approvalStatus, // 设置审核状态
    }).returning();
    return user;
  }

  async getUsers(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<User, "id" | "role" | "isActive">>;
  } = {}): Promise<User[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(users.id, filters.id));
    }
    if (filters.role !== undefined) {
      conditions.push(eq(users.role, filters.role));
    }
    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    let usersList: User[];
    if (conditions.length > 0) {
      usersList = await db
        .select()
        .from(users)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(users.createdAt);
    } else {
      usersList = await db
        .select()
        .from(users)
        .limit(limit)
        .offset(skip)
        .orderBy(users.createdAt);
    }

    // 为每个用户附加审核人信息
    return await this.enrichUsersWithApproverInfo(usersList);
  }

  // 为用户列表附加审核人信息
  private async enrichUsersWithApproverInfo(usersList: User[]): Promise<User[]> {
    const enrichedUsers = await Promise.all(
      usersList.map(async (user) => {
        if (user.approvedBy) {
          const approver = await this.getUserById(user.approvedBy);
          if (approver) {
            return {
              ...user,
              approver: {
                id: approver.id,
                username: approver.username,
                fullName: approver.fullName,
              },
            } as User & { approver?: { id: string; username: string; fullName: string | null } };
          }
        }
        return user;
      })
    );

    return enrichedUsers;
  }

  async getUserById(id: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return null;

    // 如果用户有审核人，附加审核人信息
    if (user.approvedBy) {
      const approver = await this.getUserById(user.approvedBy);
      if (approver) {
        return {
          ...user,
          approver: {
            id: approver.id,
            username: approver.username,
            fullName: approver.fullName,
          },
        } as User & { approver?: { id: string; username: string; fullName: string | null } };
      }
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || null;
  }

  async getUserByEmployeeNumber(employeeNumber: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.employeeNumber, employeeNumber));
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  }

  async getUserByMacAddress(macAddress: string): Promise<User | null> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.macAddress, macAddress));
    return user || null;
  }

  async updateUser(id: string, data: UpdateUser): Promise<User | null> {
    const db = await getDb();
    const validated = updateUserSchema.parse(data);
    const [user] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async updatePassword(id: string, newPassword: string): Promise<User | null> {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 设置密码过期时间为1个月后
    const passwordExpireAt = new Date();
    passwordExpireAt.setMonth(passwordExpireAt.getMonth() + 1);

    const [user] = await db
      .update(users)
      .set({ password: hashedPassword, passwordExpireAt, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async forceChangePassword(id: string, newPassword: string): Promise<User | null> {
    const db = await getDb();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 设置密码过期时间为1个月后
    const passwordExpireAt = new Date();
    passwordExpireAt.setMonth(passwordExpireAt.getMonth() + 1);

    const [user] = await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordExpireAt,
        isFirstLogin: false, // 标记为已非首次登录
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  async resetUserPassword(id: string): Promise<User | null> {
    const db = await getDb();
    const newPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 设置密码过期时间为1个月后
    const passwordExpireAt = new Date();
    passwordExpireAt.setMonth(passwordExpireAt.getMonth() + 1);

    const [user] = await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordExpireAt,
        isFirstLogin: true, // 标记为首次登录
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || null;
  }

  isPasswordExpired(user: User): boolean {
    if (!user.passwordExpireAt) return false;
    return new Date() > user.passwordExpireAt;
  }

  async deleteUser(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async verifyPassword(
    user: User,
    password: string
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async updateLoginInfo(userId: string, userAgent: string, loginIP: string | null | undefined): Promise<User | null> {
    const db = await getDb();

    // 解析User-Agent获取终端信息
    const deviceInfo = this.parseUserAgent(userAgent);

    const [user] = await db
      .update(users)
      .set({
        lastLoginTime: new Date(),
        loginDevice: deviceInfo,
        loginIP: loginIP || null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async updateLogoutInfo(userId: string): Promise<User | null> {
    const db = await getDb();

    // 获取当前用户信息
    const currentUser = await this.getUserById(userId);
    if (!currentUser || !currentUser.lastLoginTime) {
      return null;
    }

    // 计算登录时长（秒）
    const loginTime = new Date(currentUser.lastLoginTime);
    const logoutTime = new Date();
    const duration = Math.floor((logoutTime.getTime() - loginTime.getTime()) / 1000); // 转换为秒

    // 格式化登录时长为易读形式
    const formattedDuration = this.formatDuration(duration);

    const [user] = await db
      .update(users)
      .set({
        loginDuration: formattedDuration,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  private parseUserAgent(userAgent: string): string {
    // 简单的User-Agent解析
    let device = "未知设备";
    const ua = userAgent.toLowerCase();

    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      if (ua.includes("iphone") || ua.includes("ipad")) {
        device = "iOS设备";
      } else if (ua.includes("android")) {
        device = "Android设备";
      } else {
        device = "移动设备";
      }
    } else {
      if (ua.includes("chrome")) {
        device = "Chrome浏览器";
      } else if (ua.includes("firefox")) {
        device = "Firefox浏览器";
      } else if (ua.includes("safari")) {
        device = "Safari浏览器";
      } else if (ua.includes("edge")) {
        device = "Edge浏览器";
      } else {
        device = "桌面浏览器";
      }
    }

    return device;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }

  async getUserOptions(): Promise<{ id: string; fullName: string | null; username: string }[]> {
    const db = await getDb();
    return db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.fullName);
  }

  // 模糊查询用户（按工号、用户名、全名、邮箱、手机）
  async searchUsers(query: string, departmentId?: string): Promise<{ id: string; fullName: string | null; username: string; employeeNumber: string | null; email: string; phone: string | null; departmentName: string | null }[]> {
    if ((!query || query.trim().length === 0) && !departmentId) {
      return [];
    }

    const db = await getDb();

    const conditions: SQL[] = [eq(users.isActive, true)];

    if (departmentId) {
      conditions.push(eq(users.departmentId, departmentId));
    }

    if (query && query.trim().length > 0) {
      const searchPattern = `%${query.trim()}%`;
      conditions.push(
        or(
          like(users.employeeNumber, searchPattern),
          like(users.username, searchPattern),
          like(users.fullName, searchPattern),
          like(users.email, searchPattern),
          like(users.phone, searchPattern)
        )
      );
    }

    const results = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        username: users.username,
        employeeNumber: users.employeeNumber,
        email: users.email,
        phone: users.phone,
        departmentName: departments.departmentName,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(and(...conditions))
      .orderBy(users.fullName)
      .limit(20);

    return results;
  }
}

export const userManager = new UserManager();
