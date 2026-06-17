import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import {
  approvalRequests,
  approvalHistory,
  orders,
  contracts,
} from "./shared/schema";

export const approvalManager = {
  // 获取所有审批申请
  async getAll() {
    const db = await getDb();
    return db
      .select()
      .from(approvalRequests)
      .orderBy(desc(approvalRequests.createdAt));
  },

  // 根据ID获取审批申请
  async getById(id: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, id));
    return results[0] || null;
  },

  // 根据审批单号获取审批申请
  async getByRequestNumber(requestNumber: string) {
    const db = await getDb();
    const results = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.requestNumber, requestNumber));
    return results[0] || null;
  },

  // 根据申请类型获取审批申请
  async getByRequestType(requestType: string) {
    const db = await getDb();
    return db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.requestType, requestType))
      .orderBy(desc(approvalRequests.createdAt));
  },

  // 根据状态获取审批申请
  async getByStatus(status: string) {
    const db = await getDb();
    return db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.status, status))
      .orderBy(desc(approvalRequests.createdAt));
  },

  // 根据当前审批人ID获取待审批的申请
  async getByApproverId(approverId: string) {
    const db = await getDb();
    return db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.currentApproverId, approverId),
          eq(approvalRequests.status, "pending")
        )
      )
      .orderBy(desc(approvalRequests.createdAt));
  },

  // 创建审批申请
  async create(data: {
    requestType: string; // order-订单，contract-合同
    requestId: string; // 关联的订单或合同ID
    title: string;
    content?: string;
    applicantId: string;
    applicantName: string;
    currentApproverId: string;
    currentApproverName: string;
    totalSteps?: string;
    relatedData?: string;
  }) {
    const db = await getDb();

    // 生成审批单号（格式：APR + 日期 + 6位随机数）
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const requestNumber = `APR${dateStr}${randomNum}`;

    const values = {
      requestNumber,
      requestType: data.requestType,
      requestId: data.requestId,
      title: data.title,
      content: data.content,
      status: "pending",
      applicantId: data.applicantId,
      applicantName: data.applicantName,
      currentApproverId: data.currentApproverId,
      currentApproverName: data.currentApproverName,
      currentStep: "level1",
      totalSteps: data.totalSteps || "level1",
      relatedData: data.relatedData,
    };

    const results = await db.insert(approvalRequests).values(values).returning();

    // 更新关联的订单或合同的审批状态
    if (data.requestType === "order") {
      await db
        .update(orders)
        .set({
          approvalStatus: "pending",
          approvalRequestId: results[0].id,
        })
        .where(eq(orders.id, data.requestId));
    } else if (data.requestType === "contract") {
      await db
        .update(contracts)
        .set({
          approvalStatus: "pending",
          approvalRequestId: results[0].id,
        })
        .where(eq(contracts.id, data.requestId));
    }

    return results[0];
  },

  // 审批通过
  async approve(id: string, approverId: string, approverName: string, note?: string) {
    const db = await getDb();

    // 获取审批申请
    const approval = await this.getById(id);
    if (!approval) {
      throw new Error("审批申请不存在");
    }

    if (approval.status !== "pending") {
      throw new Error("审批申请已处理");
    }

    if (approval.currentApproverId !== approverId) {
      throw new Error("您不是当前审批人");
    }

    // 添加审批历史
    await db.insert(approvalHistory).values({
      requestId: id,
      step: approval.currentStep,
      approverId: approverId,
      approverName: approverName,
      action: "approve",
      actionNote: note,
      actionAt: new Date(),
    });

    // 判断是否还有下一级审批
    let nextStep = null;
    if (approval.currentStep === "level1" && approval.totalSteps !== "level1") {
      nextStep = "level2";
    } else if (approval.currentStep === "level2" && approval.totalSteps === "level3") {
      nextStep = "level3";
    }

    let updateData: any = {
      updatedAt: new Date(),
    };

    if (nextStep) {
      // 进入下一级审批
      updateData.currentStep = nextStep;
      // TODO: 这里需要根据审批流程配置获取下一级审批人
      // 暂时保持当前审批人，实际需要从审批流程配置中获取
    } else {
      // 审批完成
      updateData.status = "approved";
      updateData.approvalDate = new Date();
      updateData.approvalNote = note;

      // 检查是否是删除操作
      let isDeleteOperation = false;
      if (approval.relatedData) {
        try {
          const relatedData = typeof approval.relatedData === 'string'
            ? JSON.parse(approval.relatedData)
            : approval.relatedData;
          isDeleteOperation = relatedData.operation === "delete";
        } catch (error) {
          console.error("解析relatedData失败:", error);
        }
      }

      // 更新关联的订单或合同
      if (approval.requestType === "order") {
        if (isDeleteOperation) {
          // 删除操作：执行实际删除
          await db.delete(orders).where(eq(orders.id, approval.requestId));
        } else {
          // 非删除操作：检查是否有变更数据
          let updateOrderData: any = {
            approvalStatus: "approved",
            updatedAt: new Date(),
          };
          
          // 如果有变更数据，应用变更
          if (approval.relatedData) {
            try {
              const relatedData = typeof approval.relatedData === 'string'
                ? JSON.parse(approval.relatedData)
                : approval.relatedData;
              
              if (relatedData.operation === "edit" && relatedData.changes) {
                // 应用订单编辑的变更
                Object.entries(relatedData.changes).forEach(([key, value]: [string, any]) => {
                  if (value?.new !== undefined) {
                    updateOrderData[key] = value.new;
                  }
                });
              }
            } catch (error) {
              console.error("解析订单 relatedData 失败:", error);
            }
          }
          
          await db
            .update(orders)
            .set(updateOrderData)
            .where(eq(orders.id, approval.requestId));

          // 审批完成后清除 approvalRequestId，允许后续再次编辑
          await db
            .update(orders)
            .set({ approvalRequestId: null })
            .where(eq(orders.id, approval.requestId));
        }
      } else if (approval.requestType === "contract") {
        if (isDeleteOperation) {
          // 删除操作：执行实际删除
          await db.delete(contracts).where(eq(contracts.id, approval.requestId));
        } else {
          // 非删除操作：检查是否有变更数据
          let updateContractData: any = {
            approvalStatus: "approved",
            updatedAt: new Date(),
          };
          
          // 如果有变更数据，应用变更
          if (approval.relatedData) {
            try {
              const relatedData = typeof approval.relatedData === 'string'
                ? JSON.parse(approval.relatedData)
                : approval.relatedData;
              
              if (relatedData.operation === "edit" && relatedData.changes) {
                // 应用合同编辑的变更
                Object.entries(relatedData.changes).forEach(([key, value]: [string, any]) => {
                  if (value?.new !== undefined) {
                    updateContractData[key] = value.new;
                  }
                });
              }
            } catch (error) {
              console.error("解析合同 relatedData 失败:", error);
            }
          }
          
          await db
            .update(contracts)
            .set(updateContractData)
            .where(eq(contracts.id, approval.requestId));

          await db
            .update(contracts)
            .set({ approvalRequestId: null })
            .where(eq(contracts.id, approval.requestId));
        }
      }
    }

    const results = await db
      .update(approvalRequests)
      .set(updateData)
      .where(eq(approvalRequests.id, id))
      .returning();

    return results[0];
  },

  // 审批拒绝
  async reject(id: string, approverId: string, approverName: string, note?: string) {
    const db = await getDb();

    // 获取审批申请
    const approval = await this.getById(id);
    if (!approval) {
      throw new Error("审批申请不存在");
    }

    if (approval.status !== "pending") {
      throw new Error("审批申请已处理");
    }

    if (approval.currentApproverId !== approverId) {
      throw new Error("您不是当前审批人");
    }

    // 添加审批历史
    await db.insert(approvalHistory).values({
      requestId: id,
      step: approval.currentStep,
      approverId: approverId,
      approverName: approverName,
      action: "reject",
      actionNote: note,
      actionAt: new Date(),
    });

    // 更新审批申请状态为已拒绝
    const updateData: any = {
      status: "rejected",
      approvalNote: note,
      updatedAt: new Date(),
    };

    const results = await db
      .update(approvalRequests)
      .set(updateData)
      .where(eq(approvalRequests.id, id))
      .returning();

    // 更新关联的订单或合同的审批状态
    if (approval.requestType === "order") {
      await db
        .update(orders)
        .set({
          approvalStatus: "rejected",
          approvalRequestId: null,
        })
        .where(eq(orders.id, approval.requestId));
    } else if (approval.requestType === "contract") {
      await db
        .update(contracts)
        .set({
          approvalStatus: "rejected",
          approvalRequestId: null,
        })
        .where(eq(contracts.id, approval.requestId));
    }

    return results[0];
  },

  // 管理员一键审核（跳过所有审批步骤直接通过）
  async forceApprove(id: string, approverId: string, approverName: string, note?: string) {
    const db = await getDb();

    // 获取审批申请
    const approval = await this.getById(id);
    if (!approval) {
      throw new Error("审批申请不存在");
    }

    if (approval.status !== "pending") {
      throw new Error("审批申请已处理");
    }

    // 添加审批历史（管理员直接完成审批）
    await db.insert(approvalHistory).values({
      requestId: id,
      step: approval.currentStep,
      approverId: approverId,
      approverName: approverName,
      action: "approve",
      actionNote: note || "管理员一键审核",
      actionAt: new Date(),
    });

    // 如果存在多级审批，跳过所有中间步骤，直接完成
    let updateData: any = {
      status: "approved",
      approvalDate: new Date(),
      approvalNote: note || "管理员一键审核",
      updatedAt: new Date(),
    };

    const results = await db
      .update(approvalRequests)
      .set(updateData)
      .where(eq(approvalRequests.id, id))
      .returning();

    // 检查是否是删除操作
    let isDeleteOperation = false;
    if (approval.relatedData) {
      try {
        const relatedData = typeof approval.relatedData === 'string'
          ? JSON.parse(approval.relatedData)
          : approval.relatedData;
        isDeleteOperation = relatedData.operation === "delete";
      } catch (error) {
        console.error("解析relatedData失败:", error);
      }
    }

    // 更新关联的订单或合同
    if (approval.requestType === "order") {
      if (isDeleteOperation) {
        // 删除操作：执行实际删除
        await db.delete(orders).where(eq(orders.id, approval.requestId));
      } else {
        // 非删除操作：检查是否有变更数据
        let updateOrderData: any = {
          approvalStatus: "approved",
          updatedAt: new Date(),
        };
        
        // 如果有变更数据，应用变更
        if (approval.relatedData) {
          try {
            const relatedData = typeof approval.relatedData === 'string'
              ? JSON.parse(approval.relatedData)
              : approval.relatedData;
            
            if (relatedData.operation === "edit" && relatedData.changes) {
              // 应用订单编辑的变更
              Object.entries(relatedData.changes).forEach(([key, value]: [string, any]) => {
                if (value?.new !== undefined) {
                  updateOrderData[key] = value.new;
                }
              });
            }
          } catch (error) {
            console.error("解析订单 relatedData 失败:", error);
          }
        }
        
        await db
          .update(orders)
          .set(updateOrderData)
          .where(eq(orders.id, approval.requestId));

        await db
          .update(orders)
          .set({ approvalRequestId: null })
          .where(eq(orders.id, approval.requestId));
      }
    } else if (approval.requestType === "contract") {
      if (isDeleteOperation) {
        // 删除操作：执行实际删除
        await db.delete(contracts).where(eq(contracts.id, approval.requestId));
      } else {
        // 非删除操作：检查是否有变更数据
        let updateContractData: any = {
          approvalStatus: "approved",
          updatedAt: new Date(),
        };
        
        // 如果有变更数据，应用变更
        if (approval.relatedData) {
          try {
            const relatedData = typeof approval.relatedData === 'string'
              ? JSON.parse(approval.relatedData)
              : approval.relatedData;
            
            if (relatedData.operation === "edit" && relatedData.changes) {
              // 应用合同编辑的变更
              Object.entries(relatedData.changes).forEach(([key, value]: [string, any]) => {
                if (value?.new !== undefined) {
                  updateContractData[key] = value.new;
                }
              });
            }
          } catch (error) {
            console.error("解析合同 relatedData 失败:", error);
          }
        }
        
        await db
          .update(contracts)
          .set(updateContractData)
          .where(eq(contracts.id, approval.requestId));

        await db
          .update(contracts)
          .set({ approvalRequestId: null })
          .where(eq(contracts.id, approval.requestId));
      }
    }

    return results[0];
  },

  // 取消审批
  async cancel(id: string) {
    const db = await getDb();

    // 获取审批申请
    const approval = await this.getById(id);
    if (!approval) {
      throw new Error("审批申请不存在");
    }

    if (approval.status !== "pending") {
      throw new Error("只能取消待审批的申请");
    }

    // 检查是否有任何审批历史记录（说明已经有审批人审批过）
    const history = await db
      .select()
      .from(approvalHistory)
      .where(eq(approvalHistory.requestId, id));

    if (history.length > 0) {
      throw new Error("已有审批通过的步骤，无法撤销");
    }

    // 更新审批申请状态为已取消
    const results = await db
      .update(approvalRequests)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(approvalRequests.id, id))
      .returning();

    // 更新关联的订单或合同的审批状态为无需审批
    if (approval.requestType === "order") {
      await db
        .update(orders)
        .set({
          approvalStatus: "none",
          approvalRequestId: null,
        })
        .where(eq(orders.id, approval.requestId));
    } else if (approval.requestType === "contract") {
      await db
        .update(contracts)
        .set({
          approvalStatus: "none",
          approvalRequestId: null,
        })
        .where(eq(contracts.id, approval.requestId));
    }

    return results[0];
  },

  // 获取审批历史
  async getHistory(requestId: string) {
    const db = await getDb();
    return db
      .select()
      .from(approvalHistory)
      .where(eq(approvalHistory.requestId, requestId))
      .orderBy(approvalHistory.actionAt);
  },

  // 高级查询
  async advancedSearch(params: {
    requestType?: string;
    status?: string;
    applicantId?: string;
    approverId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const db = await getDb();
    const conditions = [];

    if (params.requestType) {
      conditions.push(eq(approvalRequests.requestType, params.requestType));
    }

    if (params.status) {
      conditions.push(eq(approvalRequests.status, params.status));
    }

    if (params.applicantId) {
      conditions.push(eq(approvalRequests.applicantId, params.applicantId));
    }

    if (params.approverId) {
      conditions.push(eq(approvalRequests.currentApproverId, params.approverId));
    }

    if (params.startDate && params.endDate) {
      conditions.push(
        sql`${approvalRequests.createdAt} >= ${new Date(params.startDate)} AND ${approvalRequests.createdAt} <= ${new Date(params.endDate)}`
      );
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(approvalRequests)
        .where(and(...conditions))
        .orderBy(desc(approvalRequests.createdAt));
    } else {
      return db.select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
    }
  },
  
  /**
   * 按状态删除审批记录
   * @param status 要删除的状态
   * @returns 删除的记录数
   */
  deleteByStatus: async (status: string) => {
    const result = await db.delete(approvalRequests)
      .where(eq(approvalRequests.status, status));
    return result.rowCount || 0;
  },
};
