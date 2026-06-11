import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { roles } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

// 系统默认角色
const defaultRoles = [
  {
    roleCode: "system_admin",
    roleName: "系统管理员",
    description: "系统管理员，拥有所有权限",
    isSystem: true,
  },
  {
    roleCode: "project_manager",
    roleName: "项目经理",
    description: "负责项目整体管理和协调",
    isSystem: true,
  },
  {
    roleCode: "mechanical_engineer",
    roleName: "机械工程师",
    description: "负责机械相关技术工作",
    isSystem: true,
  },
  {
    roleCode: "electrical_engineer",
    roleName: "电气工程师",
    description: "负责电气相关技术工作",
    isSystem: true,
  },
  {
    roleCode: "visual_engineer",
    roleName: "视觉工程师",
    description: "负责视觉相关技术工作",
    isSystem: true,
  },
  {
    roleCode: "software_engineer",
    roleName: "软件工程师",
    description: "负责软件相关技术工作",
    isSystem: true,
  },
  {
    roleCode: "project_management",
    roleName: "项目管理",
    description: "负责项目计划和进度管理",
    isSystem: true,
  },
  {
    roleCode: "production_planning",
    roleName: "生产计划",
    description: "负责生产计划制定",
    isSystem: true,
  },
  {
    roleCode: "quality_management",
    roleName: "质量管理",
    description: "负责质量检查和控制",
    isSystem: true,
  },
  {
    roleCode: "procurement_management",
    roleName: "采购管理",
    description: "负责采购和供应商管理",
    isSystem: true,
  },
  {
    roleCode: "department_manager",
    roleName: "部门经理",
    description: "负责部门整体管理",
    isSystem: true,
  },
  {
    roleCode: "field_supervisor",
    roleName: "现场负责人",
    description: "负责现场工作协调",
    isSystem: true,
  },
  {
    roleCode: "project_member",
    roleName: "项目成员",
    description: "普通项目成员",
    isSystem: true,
  },
  {
    roleCode: "business",
    roleName: "商务",
    description: "负责商务相关事务",
    isSystem: true,
  },
  {
    roleCode: "safety_officer",
    roleName: "安全员",
    description: "负责安全管理",
    isSystem: true,
  },
];

// POST /api/roles/init - 初始化系统角色
export async function POST() {
  try {
    const db = await getDb();
    let createdCount = 0;
    let updatedCount = 0;

    for (const roleData of defaultRoles) {
      // 检查角色是否已存在
      const existingRole = await db
        .select()
        .from(roles)
        .where(eq(roles.roleCode, roleData.roleCode))
        .limit(1);

      if (existingRole.length === 0) {
        // 创建角色
        await db.insert(roles).values({
          ...roleData,
          isActive: true,
        });
        createdCount++;
      } else {
        // 更新现有角色的系统标记（确保是系统角色）
        const role = existingRole[0];
        if (!role.isSystem) {
          await db
            .update(roles)
            .set({
              isSystem: true,
              roleName: roleData.roleName,
              description: roleData.description,
              updatedAt: new Date(),
            })
            .where(eq(roles.id, role.id));
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `角色初始化完成：创建 ${createdCount} 个，更新 ${updatedCount} 个`,
      data: {
        createdCount,
        updatedCount,
      },
    });
  } catch (error) {
    console.error("Error initializing roles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "初始化角色失败",
      },
      { status: 500 }
    );
  }
}
