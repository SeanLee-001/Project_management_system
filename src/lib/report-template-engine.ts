import type { AggregatedData } from "./report-aggregator";

export interface ReportConfig {
  projectName: string;
  dateFrom: string;
  dateTo: string;
  description: string;
  generatedBy: string;
  generatedAt: string;
  fileList?: { name: string; url?: string; size?: string }[];
}

function formatCurrency(amount: number): string {
  if (amount === 0) return "0.00";
  return amount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function notEmpty(value: string | null | undefined, fallback = "-"): string {
  return value || fallback;
}

function percentBar(rate: number): string {
  const filled = Math.round(rate / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export function generateMarkdownReport(data: AggregatedData, config: ReportConfig): string {
  const { project, tasks, contracts, orders, invoices, transactions, approvals, risks, team } = data;

  const lines: string[] = [];

  // 报告头
  lines.push(`# ${config.projectName} - 项目综合报告`);
  lines.push("");
  lines.push(`**报告期间**: ${config.dateFrom} 至 ${config.dateTo}`);
  lines.push(`**生成日期**: ${config.generatedAt}`);
  lines.push(`**生成人**: ${config.generatedBy}`);
  lines.push("");

  // 前言
  if (config.description) {
    lines.push("---");
    lines.push("");
    lines.push("## 前言");
    lines.push("");
    lines.push(config.description);
    lines.push("");
  }

  // 一、项目概况
  lines.push("---");
  lines.push("");
  lines.push("## 一、项目概况");
  lines.push("");
  if (project) {
    lines.push("| 属性 | 值 |");
    lines.push("|------|-----|");
    lines.push(`| 项目名称 | ${notEmpty(project.name)} |`);
    lines.push(`| 项目状态 | ${notEmpty(project.status)} |`);
    lines.push(`| 负责人 | ${notEmpty(project.manager)} |`);
    lines.push(`| 开始日期 | ${notEmpty(project.startDate)} |`);
    lines.push(`| 预计完成 | ${notEmpty(project.endDate)} |`);
    lines.push(`| 项目描述 | ${notEmpty(project.description, "无")} |`);
    lines.push("");
  } else {
    lines.push("> 暂无项目数据");
    lines.push("");
  }

  // 二、任务进度分析
  lines.push("## 二、任务进度分析");
  lines.push("");
  lines.push(`- **总任务数**: ${tasks.total}`);
  lines.push(`- **已完成**: ${tasks.completed} (${tasks.completionRate})`);
  lines.push(`- **进行中**: ${tasks.inProgress}`);
  lines.push(`- **已延期**: ${tasks.overdue}`);
  lines.push("");
  if (tasks.total > 0) {
    const cRate = parseInt(tasks.completionRate) || 0;
    lines.push(`\`\`\``);
    lines.push(`进度: ${percentBar(cRate)} ${tasks.completionRate}`);
    lines.push(`\`\`\``);
    lines.push("");
  }
  if (tasks.details.length > 0) {
    lines.push("### 任务明细");
    lines.push("");
    lines.push("| 任务名称 | 状态 | 负责人 | 截止日期 |");
    lines.push("|----------|------|--------|----------|");
    for (const t of tasks.details) {
      lines.push(`| ${notEmpty(t.title)} | ${notEmpty(t.status)} | ${notEmpty(t.assignee)} | ${notEmpty(t.dueDate)} |`);
    }
    lines.push("");
  }

  // 三、合同与订单汇总
  lines.push("## 三、合同与订单汇总");
  lines.push("");
  lines.push("### 合同");
  lines.push("");
  lines.push(`- **合同总数**: ${contracts.totalCount}`);
  lines.push(`- **合同总金额**: ¥${formatCurrency(contracts.totalAmount)}`);
  lines.push(`- **已收款**: ¥${formatCurrency(contracts.paidAmount)}`);
  lines.push(`- **待收款**: ¥${formatCurrency(contracts.pendingAmount)}`);
  lines.push(`- **收款率**: ${contracts.collectionRate}`);
  lines.push("");
  if (contracts.details.length > 0) {
    lines.push("| 合同名称 | 金额 | 状态 | 签订日期 |");
    lines.push("|----------|------|------|----------|");
    for (const c of contracts.details) {
      lines.push(`| ${notEmpty(c.name)} | ¥${formatCurrency(c.amount)} | ${notEmpty(c.status)} | ${notEmpty(c.signDate)} |`);
    }
    lines.push("");
  }

  lines.push("### 订单");
  lines.push("");
  lines.push(`- **订单总数**: ${orders.totalCount}`);
  lines.push(`- **订单总金额**: ¥${formatCurrency(orders.totalAmount)}`);
  if (Object.keys(orders.byStatus).length > 0) {
    lines.push("");
    for (const [status, count] of Object.entries(orders.byStatus)) {
      lines.push(`  - ${status}: ${count} 单`);
    }
  }
  lines.push("");

  // 四、财务收支概览
  lines.push("## 四、财务收支概览");
  lines.push("");

  lines.push("### 发票");
  lines.push("");
  lines.push(`- **发票总额**: ¥${formatCurrency(invoices.totalAmount)}`);
  lines.push(`- **已付款**: ¥${formatCurrency(invoices.paidAmount)}`);
  lines.push(`- **未付款**: ¥${formatCurrency(invoices.unpaidAmount)}`);
  lines.push("");
  if (invoices.invoices.length > 0) {
    lines.push("| 发票号 | 金额 | 日期 | 状态 |");
    lines.push("|--------|------|------|------|");
    for (const inv of invoices.invoices) {
      lines.push(`| ${notEmpty(inv.number)} | ¥${formatCurrency(inv.amount)} | ${notEmpty(inv.date)} | ${notEmpty(inv.status)} |`);
    }
    lines.push("");
  }

  lines.push("### 交易明细");
  lines.push("");
  lines.push("| 指标 | 金额 |");
  lines.push("|------|------|");
  lines.push(`| 总收入 | ¥${formatCurrency(transactions.totalIncome)} |`);
  lines.push(`| 总支出 | ¥${formatCurrency(transactions.totalExpense)} |`);
  lines.push(`| 余额 | ¥${formatCurrency(transactions.balance)} |`);
  lines.push("");

  // 五、审批流转统计
  lines.push("## 五、审批流转统计");
  lines.push("");
  lines.push("| 状态 | 数量 |");
  lines.push("|------|------|");
  lines.push(`| 已通过 | ${approvals.approved} |`);
  lines.push(`| 待审批 | ${approvals.pending} |`);
  lines.push(`| 已驳回 | ${approvals.rejected} |`);
  lines.push(`| **合计** | **${approvals.total}** |`);
  lines.push("");

  // 六、风险分析
  lines.push("## 六、风险分析");
  lines.push("");
  if (risks.total > 0) {
    lines.push("### 风险等级分布");
    lines.push("");
    lines.push("| 等级 | 数量 |");
    lines.push("|------|------|");
    lines.push(`| 高风险 | ${risks.high} |`);
    lines.push(`| 中风险 | ${risks.medium} |`);
    lines.push(`| 低风险 | ${risks.low} |`);
    lines.push(`| **合计** | **${risks.total}** |`);
    lines.push("");

    if (risks.details.length > 0) {
      lines.push("### 风险明细");
      lines.push("");
      lines.push("| 风险类型 | 等级 | 描述 | 建议措施 |");
      lines.push("|----------|------|------|----------|");
      for (const r of risks.details) {
        lines.push(`| ${notEmpty(r.type)} | ${notEmpty(r.level)} | ${notEmpty(r.description)} | ${notEmpty(r.suggestion)} |`);
      }
      lines.push("");
    }
  } else {
    lines.push("> 暂无风险数据");
    lines.push("");
  }

  // 七、团队与资源
  lines.push("## 七、团队与资源");
  lines.push("");
  if (team.length > 0) {
    lines.push("| 姓名 | 角色 | 部门 |");
    lines.push("|------|------|------|");
    for (const m of team.slice(0, 30)) {
      lines.push(`| ${notEmpty(m.name)} | ${notEmpty(m.role)} | ${notEmpty(m.department)} |`);
    }
    lines.push("");
  } else {
    lines.push("> 暂无团队数据");
    lines.push("");
  }

  // 八、参考文件
  if (config.fileList && config.fileList.length > 0) {
    lines.push("## 八、参考文件");
    lines.push("");
    for (const f of config.fileList) {
      if (f.url) {
        lines.push(`- [${notEmpty(f.name)}](${f.url}) ${f.size ? `(${f.size} bytes)` : ""}`);
      } else {
        lines.push(`- ${notEmpty(f.name)} ${f.size ? `(${f.size} bytes)` : ""}`);
      }
    }
    lines.push("");
  }

  // 页脚
  lines.push("---");
  lines.push("");
  lines.push(`*报告由系统自动生成于 ${config.generatedAt}*`);

  return lines.join("\n");
}
