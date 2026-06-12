import { NextRequest, NextResponse } from 'next/server';

/**
 * 每天从网络抓取自动化、智能制造、AI 相关新闻
 * 由于环境限制，这里使用模拟数据，实际部署时应接入真实新闻 API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // 实际部署时应该调用真实的新闻 API，例如：
    // - 新浪科技 API
    // - 36 氪 API
    // - 机器之心 API
    // - 新智元 API
    // 这里使用模拟数据演示功能
    
    const mockNews = [
      {
        id: '1',
        title: '工信部：2026 年智能制造装备产业规模将突破 5 万亿元',
        source: '工信部官网',
        category: '智能制造',
        summary: '工业和信息化部近日发布《智能制造发展规划（2026-2030 年）》，提出到 2026 年，我国智能制造装备产业规模将突破 5 万亿元，年均增长率超过 15%。',
        url: 'https://example.com/news/1',
        publishTime: `${date}T09:00:00Z`,
        relevance: 'high',
      },
      {
        id: '2',
        title: 'AI 大模型在工业质检领域应用取得重大突破',
        source: '机器之心',
        category: 'AI',
        summary: '某科技公司发布的新一代 AI 质检系统，检测准确率达到 99.9%，误检率降低至 0.01%，已在多家制造企业成功应用。',
        url: 'https://example.com/news/2',
        publishTime: `${date}T10:30:00Z`,
        relevance: 'high',
      },
      {
        id: '3',
        title: '自动化生产线效率提升 300%，某企业数字化转型案例',
        source: '智能制造网',
        category: '自动化',
        summary: '通过引入先进的自动化生产线和 MES 系统，该企业生产效率提升 300%，人力成本降低 60%，产品质量显著提升。',
        url: 'https://example.com/news/3',
        publishTime: `${date}T11:15:00Z`,
        relevance: 'medium',
      },
      {
        id: '4',
        title: '2026 年全球工业机器人销量预计增长 25%',
        source: '国际机器人联合会',
        category: '自动化',
        summary: '国际机器人联合会（IFR）发布报告显示，2026 年全球工业机器人销量预计达到 58 万台，同比增长 25%，中国市场份额占比超过 50%。',
        url: 'https://example.com/news/4',
        publishTime: `${date}T13:00:00Z`,
        relevance: 'medium',
      },
      {
        id: '5',
        title: 'AI+ 制造业：从"制造"到"智造"的转型升级',
        source: '36 氪',
        category: 'AI',
        summary: '深度解析 AI 技术如何赋能传统制造业，实现智能化转型。包括预测性维护、智能排产、质量管控等应用场景。',
        url: 'https://example.com/news/5',
        publishTime: `${date}T14:20:00Z`,
        relevance: 'high',
      },
      {
        id: '6',
        title: '数字孪生技术在智慧工厂建设中的应用实践',
        source: '自动化网',
        category: '智能制造',
        summary: '介绍数字孪生技术如何帮助制造企业实现工厂全生命周期管理，包括设计、生产、运维等各个环节。',
        url: 'https://example.com/news/6',
        publishTime: `${date}T15:45:00Z`,
        relevance: 'medium',
      },
      {
        id: '7',
        title: '5G+ 工业互联网：赋能制造业数字化转型',
        source: '人民邮电报',
        category: '智能制造',
        summary: '5G 技术在工业互联网领域的典型应用场景，包括远程操控、机器视觉、AGV 调度等，助力企业实现数字化转型。',
        url: 'https://example.com/news/7',
        publishTime: `${date}T16:30:00Z`,
        relevance: 'medium',
      },
      {
        id: '8',
        title: 'AI 预测性维护系统降低设备故障率 80%',
        source: '工业 AI',
        category: 'AI',
        summary: '某企业引入 AI 预测性维护系统后，设备故障率降低 80%，维护成本降低 50%，设备利用率提升 35%。',
        url: 'https://example.com/news/8',
        publishTime: `${date}T17:00:00Z`,
        relevance: 'high',
      },
      {
        id: '9',
        title: '柔性制造系统：小批量多品种生产的最优解',
        source: '制造工程',
        category: '自动化',
        summary: '柔性制造系统如何应对小批量、多品种的生产需求，实现快速换产、灵活调度，提升企业市场竞争力。',
        url: 'https://example.com/news/9',
        publishTime: `${date}T18:15:00Z`,
        relevance: 'medium',
      },
      {
        id: '10',
        title: '智能仓储系统助力物流效率提升 200%',
        source: '物流技术与应用',
        category: '智能制造',
        summary: '通过引入 AGV、智能货架、自动分拣系统，某企业仓储物流效率提升 200%，人工成本降低 70%。',
        url: 'https://example.com/news/10',
        publishTime: `${date}T19:00:00Z`,
        relevance: 'medium',
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockNews,
      date,
      total: mockNews.length,
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取新闻失败' },
      { status: 500 }
    );
  }
}

// POST 接口：保存抓取结果到数据库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { news } = body;

    // TODO: 保存到数据库
    // const db = await getDb();
    // await db.insert(newsTable).values(news);

    return NextResponse.json({
      success: true,
      message: '新闻保存成功',
    });
  } catch (error: any) {
    console.error('Error saving news:', error);
    return NextResponse.json(
      { success: false, error: error.message || '保存新闻失败' },
      { status: 500 }
    );
  }
}
