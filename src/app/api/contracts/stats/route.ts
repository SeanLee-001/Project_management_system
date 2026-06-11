import { NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { contracts } from "@/storage/database/shared/schema";
import { eq, sql, gte, and, lte, sum, count } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const db = await getDb();
    
    // 获取所有合同
    const allContracts = await db.select().from(contracts);
    
    // 基本统计
    const total = allContracts.length;
    const active = allContracts.filter(c => c.status === 'active').length;
    const expired = allContracts.filter(c => c.status === 'expired').length;
    const terminated = allContracts.filter(c => c.status === 'terminated').length;
    const draft = allContracts.filter(c => c.status === 'draft').length;
    
    // 金额统计
    const totalAmount = allContracts.reduce((sum, c) => {
      const amount = parseFloat(c.contractAmount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const activeAmount = allContracts.filter(c => c.status === 'active').reduce((sum, c) => {
      const amount = parseFloat(c.contractAmount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const expiredAmount = allContracts.filter(c => c.status === 'expired').reduce((sum, c) => {
      const amount = parseFloat(c.contractAmount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const terminatedAmount = allContracts.filter(c => c.status === 'terminated').reduce((sum, c) => {
      const amount = parseFloat(c.contractAmount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    // 获取最近N天的合同
    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 30; // 默认统计最近30天

    const startDate = new Date();
    startDate.setDate(new Date().getDate() - days);
    
    const newContracts = allContracts.filter(c => new Date(c.createdAt) >= startDate);
    
    // 按月统计
    const monthlyMap = new Map<string, { count: number; amount: number }>();
    newContracts.forEach(contract => {
      const date = new Date(contract.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = parseFloat(contract.contractAmount || '0') || 0;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { count: 0, amount: 0 });
      }
      const stats = monthlyMap.get(monthKey)!;
      stats.count++;
      stats.amount += amount;
    });
    
    const monthlyStats = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      amount: data.amount
    })).sort((a, b) => a.month.localeCompare(b.month));
    
    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        expired,
        terminated,
        draft,
        totalAmount,
        activeAmount,
        expiredAmount,
        terminatedAmount,
        newContracts: newContracts.length,
        monthlyStats,
      }
    });
  } catch (error) {
    console.error("获取合同统计数据失败:", error);
    return NextResponse.json({
      success: false,
      error: "获取合同统计数据失败"
    }, { status: 500 });
  }
}
