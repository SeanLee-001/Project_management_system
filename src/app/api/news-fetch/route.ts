import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const MODULE = 'news-fetch';

const MOCK_NEWS = [
  {
    id: '1',
    title: '工信部：2026 年智能制造装备产业规模将突破 5 万亿元',
    source: '工信部官网',
    category: '智能制造',
    summary: '工业和信息化部近日发布《智能制造发展规划（2026-2030 年）》，提出到 2026 年，我国智能制造装备产业规模将突破 5 万亿元，年均增长率超过 15%。',
    url: 'https://example.com/news/1',
    relevance: 'high' as const,
  },
  {
    id: '2',
    title: 'AI 大模型在工业质检领域应用取得重大突破',
    source: '机器之心',
    category: 'AI',
    summary: '某科技公司发布的新一代 AI 质检系统，检测准确率达到 99.9%，误检率降低至 0.01%，已在多家制造企业成功应用。',
    url: 'https://example.com/news/2',
    relevance: 'high' as const,
  },
  {
    id: '3',
    title: '自动化生产线效率提升 300%，某企业数字化转型案例',
    source: '智能制造网',
    category: '自动化',
    summary: '通过引入先进的自动化生产线和 MES 系统，该企业生产效率提升 300%，人力成本降低 60%，产品质量显著提升。',
    url: 'https://example.com/news/3',
    relevance: 'medium' as const,
  },
  {
    id: '4',
    title: '2026 年全球工业机器人销量预计增长 25%',
    source: '国际机器人联合会',
    category: '自动化',
    summary: '国际机器人联合会（IFR）发布报告显示，2026 年全球工业机器人销量预计达到 58 万台，同比增长 25%，中国市场份额占比超过 50%。',
    url: 'https://example.com/news/4',
    relevance: 'medium' as const,
  },
  {
    id: '5',
    title: 'AI+ 制造业：从"制造"到"智造"的转型升级',
    source: '36 氪',
    category: 'AI',
    summary: '深度解析 AI 技术如何赋能传统制造业，实现智能化转型。包括预测性维护、智能排产、质量管控等应用场景。',
    url: 'https://example.com/news/5',
    relevance: 'high' as const,
  },
];

export async function GET() {
  try {
    const date = new Date().toISOString().split('T')[0];
    const newsWithDate = MOCK_NEWS.map(item => ({
      ...item,
      publishTime: `${date}T${String(9 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`,
    }));

    return NextResponse.json({
      success: true,
      data: newsWithDate,
      date,
      total: newsWithDate.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取新闻失败';
    logger.error(MODULE, message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
