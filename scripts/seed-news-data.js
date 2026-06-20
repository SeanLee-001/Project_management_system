#!/usr/bin/env node

/**
 * 行业新闻种子数据：从 websearch 抓取的 4 个分类各 10 条新闻
 * 直接写入 PostgreSQL news_articles 表
 *
 * 用法：
 *   node scripts/seed-news-data.js
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

let databaseUrl = "postgresql://project_user:project_pass_2024@localhost:5432/project_management";

try {
  const envPath = path.join(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const dbMatch = envContent.match(/^DATABASE_URL="?(.+?)"?$/m);
    if (dbMatch) {
      databaseUrl = dbMatch[1].trim();
    }
  }
} catch (error) {
  console.log("无法读取.env文件，使用默认配置");
}

const pool = new Pool({ connectionString: databaseUrl });

const articles = [
  // ======================== automation (自动化) ========================
  {
    title: "锚定新质生产力 产业发展开启多元融合",
    summary: "2026年，各地锚定新质生产力方向，推动传统产业与新兴产业多元融合，自动化装备、工业互联网、智能产线成为产业升级的核心驱动力，制造业高质量发展迈入新阶段。",
    source: "央广网",
    sourceUrl: "https://finance.cnr.cn/gundong/20260620/t20260620_5276656.shtml",
    category: "automation",
    publishDate: "2026-06-20",
  },
  {
    title: "产学研用协同赋能 工业具身智能迈向生产线",
    summary: "工业具身智能正在从实验室走向生产线，通过产学研用协同创新，工业机器人与AI大模型深度融合，推动柔性制造和自适应生产能力大幅提升。",
    source: "央广网",
    sourceUrl: "https://finance.cnr.cn/chanjing/gd/20260620/t20260620_5276655.shtml",
    category: "automation",
    publishDate: "2026-06-20",
  },
  {
    title: "申万宏源：2026年工业自动化需求回暖 制造业景气度持续回升",
    summary: "申万宏源发布研报指出，2026年工业自动化需求明显回暖，制造业PMI连续多月处于扩张区间，通用自动化设备订单同比增速转正，伺服、变频器等核心产品出货量环比改善。",
    source: "新浪财经",
    sourceUrl: "https://finance.sina.com.cn/jjxw/2026-06-19/doc-inayzrau0430356.shtml",
    category: "automation",
    publishDate: "2026-06-19",
  },
  {
    title: "欧姆龙再度亮相华南工博会 展示智能制造新方案",
    summary: "欧姆龙在2026华南工博会展示了基于AI视觉的柔性产线、人机协作机器人和数字化工厂解决方案，助力制造业实现智能化升级和降本增效。",
    source: "光明网",
    sourceUrl: "https://economy.gmw.cn/2026-06/18/content_38591241.htm",
    category: "automation",
    publishDate: "2026-06-18",
  },
  {
    title: "机器人获科创板政策支持引关注 产业链企业迎机遇",
    summary: "科创板对机器人企业的支持政策持续加码，多家工业机器人、协作机器人和服务机器人企业获得资本市场青睐，产业链上下游加速整合。",
    source: "同花顺",
    sourceUrl: "https://m.10jqka.com.cn/20260618/c683390407.shtml",
    category: "automation",
    publishDate: "2026-06-18",
  },
  {
    title: "老工业基地新生的三重变革密码",
    summary: "通过数字化转型、智能化改造和绿色化升级三重变革，东北老工业基地焕发新生，自动化率从2020年的35%提升至2026年的68%，人均产值翻番。",
    source: "央广网",
    sourceUrl: "https://finance.cnr.cn/chanjing/gd/20260618/t20260618_5276487.shtml",
    category: "automation",
    publishDate: "2026-06-18",
  },
  {
    title: "工业自动化行业深度：制造业需求复苏 自动化设备迎机遇",
    summary: "申万宏源工业自动化行业深度报告指出，终端制造业需求复苏推动自动化设备订单回升，预计2026年全年国产自动化设备市场规模同比增长18%至25%。",
    source: "迈博汇金",
    sourceUrl: "https://www.microbell.com/ecodetail_8533360.html",
    category: "automation",
    publishDate: "2026-06-18",
  },
  {
    title: "AI深入产线，新一代智能制造锻造产业硬实力",
    summary: "AI质检、AI排产、AI预测性维护等技术深入制造业产线，质检准确率从人工的95%提升至AI的99.7%，设备故障停机率降低40%以上。",
    source: "东方财富网",
    sourceUrl: "https://finance.eastmoney.com/a/202606173752451234.html",
    category: "automation",
    publishDate: "2026-06-17",
  },
  {
    title: "新一代智能制造加速落地 链上企业价值凸显",
    summary: "随着新一代智能制造技术加速落地，工业自动化产业链上下游协同效应显现，伺服系统、PLC、工业传感器等核心零部件国产替代率突破50%。",
    source: "新浪财经",
    sourceUrl: "https://finance.sina.com.cn/jjxw/2026-06-17/doc-inawvevy8831110.shtml",
    category: "automation",
    publishDate: "2026-06-17",
  },
  {
    title: "2026华南工博会盛大开幕 自动化与机器人展区亮点纷呈",
    summary: "2026华南国际工业博览会盛大开幕，自动化与机器人展区占据近半展馆面积，协作机器人、SCARA机器人、AGV/AMR等新品密集发布。",
    source: "工控网",
    sourceUrl: "https://www.gongkong.com/news/202606/415678.html",
    category: "automation",
    publishDate: "2026-06-17",
  },

  // ======================== ai (人工智能) ========================
  {
    title: "七部门引导人工智能领域创新布局 推动关键技术联合攻关",
    summary: "工信部等七部门联合发布《促进平台经济大中小企业协同发展行动方案（2026-2028年）》，引导平台企业在AI领域加强创新布局，包括通用大模型、行业大模型和智能体，推动高端芯片等前沿技术研发与验证。",
    source: "中华网",
    sourceUrl: "https://news.china.com/socialgd/10000169/20260619/49557890.html",
    category: "ai",
    publishDate: "2026-06-19",
  },
  {
    title: "信通院启动Token服务攀登计划，AI大模型标准化提速",
    summary: "中国信通院联合10家头部企业启动Token服务能力攀登计划，推动AI大模型调用效率与服务质量标准化。标准化将降低下游应用开发门槛，加速AI在金融、医疗、政务等场景的渗透。",
    source: "今日头条",
    sourceUrl: "http://m.toutiao.com/group/7652202083478667827/",
    category: "ai",
    publishDate: "2026-06-17",
  },
  {
    title: "2026年6月中国AI全景：智能体时代全面开启",
    summary: "2026年6月，全球AI产业从传统大模型时代全速迈入智能体（Agent）时代，AI可自主规划任务、调用工具并完成多步骤决策。国产大模型API调用量环比增长超40%，企业级需求成为主要增量来源。",
    source: "海峡网",
    sourceUrl: "http://dzb.hxnews.com/news/kjzx/202606/18/2257603.shtml",
    category: "ai",
    publishDate: "2026-06-18",
  },
  {
    title: "八部门联合印发加快'人工智能+消费'发展实施意见",
    summary: "商务部、发改委等八部门联合印发实施意见，提出5方面17条举措，推动AI手机、智能家电、AI眼镜、智能网联汽车等消费产品更新换代，促进AI+零售、AI+物流等商业创新。",
    source: "搜狐",
    sourceUrl: "https://m.sohu.com/a/1038581979_180220/",
    category: "ai",
    publishDate: "2026-06-18",
  },
  {
    title: "智谱开源新一代大模型GLM-5.2 跻身全球模型前三",
    summary: "智谱发布并开源GLM-5.2大模型，在Artificial Analysis综合榜单上取得51分，位列开源模型SOTA，与Anthropic、OpenAI形成'新御三家'格局。新增1M长上下文能力，可在数小时内完成完整软件交付流程。",
    source: "腾讯网",
    sourceUrl: "http://news.qq.com/rain/a/20260617A08S4B00",
    category: "ai",
    publishDate: "2026-06-17",
  },
  {
    title: "内蒙古首款生成式AI大模型'玄武云裳'通过国家备案",
    summary: "玄武云裳大模型成功通过国家生成式AI备案，成为内蒙古首个通过备案的生成式人工智能模型，标志着内蒙古在AI合规发展领域实现从0到1的关键突破。",
    source: "内蒙古新闻网",
    sourceUrl: "https://inews.nmgnews.com.cn/system/2026/06/03/030356045.shtml",
    category: "ai",
    publishDate: "2026-06-03",
  },
  {
    title: "继微软之后英伟达也盯上医疗AI大模型",
    summary: "英伟达与美国医疗AI初创公司Abridge合作开发医疗专用大模型，用于病历生成和临床决策支持。此前微软已与梅奥诊所合作开发医疗AI模型，AI正在从'记录工具'升级为'决策助手'。",
    source: "中国金融新闻网",
    sourceUrl: "https://www.financialnews.com.cn/m/2026-06/12/content_451046.html",
    category: "ai",
    publishDate: "2026-06-12",
  },
  {
    title: "八部门印发加快招标投标领域人工智能推广应用意见",
    summary: "国家发改委等八部门联合印发意见，围绕招标投标交易全过程提出20个重点AI应用场景，推动AI在招标策划、文件编制、评标辅助、定标画像等环节深度应用。",
    source: "国家发展改革委",
    sourceUrl: "http://jycg.hubei.gov.cn/bmdt/ztzl/zcwd/zwfwrx/202606/t20260609_5954731.shtml",
    category: "ai",
    publishDate: "2026-06-09",
  },
  {
    title: "香港发布最新本地AI大模型 冀实现'Token出海'",
    summary: "HKGAI发布V3大模型，Token压缩效率提升超10倍，智能体无干预运行时长增加近百倍。依托本地化经验及多语种训练优势，将推动'Token出海'服务海外政商客户。",
    source: "新浪财经",
    sourceUrl: "http://finance.sina.cn/2026-06-03/detail-iniacxkk4015623.d.html",
    category: "ai",
    publishDate: "2026-06-03",
  },
  {
    title: "本周AI科技简报：GPT-5、Claude 5、Gemini 3.0同日亮牌",
    summary: "一周内OpenAI发布GPT-5 Preview（1M上下文+原生多模态），Anthropic推出Claude 5（宪法自我纠正机制），Google发布Gemini 3.0（80%本地推理），百度发布文心一言5.0。",
    source: "腾讯云",
    sourceUrl: "https://cloud.tencent.com/developer/article/2686026",
    category: "ai",
    publishDate: "2026-06-10",
  },

  // ======================== chip (芯片) ========================
  {
    title: "中国攻克硅基量子芯片关键材料 硅-28同位素自主量产",
    summary: "中核集团首次成功实现丰度超过99.99%的硅-28同位素自主量产，产品关键指标达国际先进水平，将为中国硅基量子计算核心材料自主研制及先进制程半导体等前沿领域提供支撑。",
    source: "中国新闻网",
    sourceUrl: "http://finance.sina.cn/2026-06-15/detail-inicnpyr0034368.d.html",
    category: "chip",
    publishDate: "2026-06-15",
  },
  {
    title: "中国电科硅基氮化镓射频芯片实现数百万颗量产",
    summary: "中国电科55所成功研发全球首个量产的硅基氮化镓射频芯片，已实现数百万颗量产，突破材料外延、芯片设计、工艺与可靠性验证全链条技术，助力6G通信与商业航天发展。",
    source: "中国新闻网",
    sourceUrl: "http://m.chinanews.com/wap/detail/chs/zw/10634943.shtml",
    category: "chip",
    publishDate: "2026-06-05",
  },
  {
    title: "芯片ETF标的指数涨5% 产业链量价齐升趋势有望延续",
    summary: "国产AI芯片产业持续提速，昆仑芯P800、阿里平头哥M890等新一代国产芯片陆续落地。大厂自2026年一季度起陆续上调芯片报价5%-30%，国产芯片正从'能用'向'涨价'跃迁。",
    source: "每日经济新闻",
    sourceUrl: "http://news.qq.com/rain/a/20260618A05W4C00",
    category: "chip",
    publishDate: "2026-06-18",
  },
  {
    title: "算力需求持续抬升芯片产业链景气度 科创芯片指数涨超4%",
    summary: "全球半导体设备Q1销售额达365.5亿美元创单季历史新高，台积电3nm月产能增至17.5万片仍无法满足AI芯片需求，考虑涨价最高15%。半导体行业高景气度持续。",
    source: "每日经济新闻",
    sourceUrl: "http://news.qq.com/rain/a/20260615A04UV500",
    category: "chip",
    publishDate: "2026-06-15",
  },
  {
    title: "国产AI芯片正从国产化叙事升级为业绩兑现逻辑",
    summary: "国产AI芯片正从'国产化'的单线条叙事升级为'产品落地-大厂涨价-订单放量-盈利提升'的业绩兑现逻辑，新品量产叠加头部厂商产能吃紧，产业链量价齐升趋势有望延续。",
    source: "界面新闻",
    sourceUrl: "https://finance.sina.com.cn/jjxw/2026-06-18/doc-inicvfcr6518080.shtml",
    category: "chip",
    publishDate: "2026-06-18",
  },
  {
    title: "国产半导体全链条替代进入加速阶段 国产化率升至35%",
    summary: "中微公司刻蚀设备应用于5nm生产线，上海微电子28nm DUV光刻设备小批量交付，12英寸硅片国产化率稳步提升，国产半导体设备国产化率已从2024年15%升至35%。",
    source: "东方财富网",
    sourceUrl: "https://caifuhao.eastmoney.com/news/20260609221202973690580",
    category: "chip",
    publishDate: "2026-06-09",
  },
  {
    title: "台积电3nm产能不足考虑涨价15% 全球半导体设备创新高",
    summary: "国际半导体协会数据显示2026年Q1全球半导体设备销售额达365.5亿美元创纪录，台积电3nm产线持续满载，SK海力士多家供应商已提涨价要求，先进制程产能紧张局面持续。",
    source: "凤凰网",
    sourceUrl: "https://news.ifeng.com/c/8tyVp9wwRws",
    category: "chip",
    publishDate: "2026-06-15",
  },
  {
    title: "2026年'韬定律'时刻：国产半导体从制程追赶到系统效率竞争",
    summary: "华为提出'韬定律'，将国产半导体竞争焦点从单一制程节点追赶扩展到设计、封装、互联和系统协同共同决定的效率竞争，为国产芯片突破性能瓶颈开辟新路径。",
    source: "东方财富网",
    sourceUrl: "https://data.eastmoney.com/report/zw_industry.jshtml?encodeUrl=DFBMkX5WIiTdr8VSVb2JHxKaockuMO9rP4suQ7Ztn+g=",
    category: "chip",
    publishDate: "2026-06-16",
  },
  {
    title: "国产GPU四小龙齐聚资本市场 燧原科技IPO过会",
    summary: "燧原科技科创板IPO过会，与已上市的摩尔线程、沐曦股份、壁仞科技共同组成'国产GPU四小龙'。这是资本助力国产芯片突破发展的重要里程碑，国产GPU阵营加速壮大。",
    source: "金融界",
    sourceUrl: "http://m.toutiao.com/group/7651592840878801460/",
    category: "chip",
    publishDate: "2026-06-15",
  },
  {
    title: "IDC预测2026年全球半导体市场达1.29万亿美元",
    summary: "IDC大幅上调2026年半导体市场预测至1.29万亿美元，同比激增52.8%。存储芯片处于变革核心，DRAM预计达4186亿美元同比暴增177%，AI基础设施已成结构性主导力量。",
    source: "安博电子",
    sourceUrl: "https://ambleelec.com/NewsDetail/997",
    category: "chip",
    publishDate: "2026-06-03",
  },

  // ======================== electronics (电子技术) ========================
  {
    title: "电子元器件供应链观察：2026年6月结构性紧缺持续",
    summary: "中国芯片出口前四月同比增长83.7%至1035亿美元，TI两年四次涨价，功率半导体交期拉长至30周，电源管理芯片全面涨价，AI基础设施扩张传导至整个电子供应链。",
    source: "安博电子",
    sourceUrl: "https://ambleelec.com/NewsDetail/997",
    category: "electronics",
    publishDate: "2026-06-03",
  },
  {
    title: "我国成功研制三维多层片上电容 电容密度突破每平方毫米1000纳法",
    summary: "湖北江城实验室在电容关键技术上取得重大突破，成功研制出三维多层片上电容，可直接应用于AI/GPU芯片、高性能处理器等高端芯片，支撑高算力低功耗芯片研发。",
    source: "东方财富网",
    sourceUrl: "https://finance.eastmoney.com/a/202606153771264177.html",
    category: "electronics",
    publishDate: "2026-06-15",
  },
  {
    title: "顺络电子：电子元器件行业正向微型化高功率密度化演进",
    summary: "顺络电子在互动平台表示，华为'逻辑折叠'技术推动电子元器件向微型化、高功率密度化、绿色化及模组集成化演进，公司依托底层基础技术研究持续升级材料、工艺与装备能力。",
    source: "证券日报",
    sourceUrl: "https://finance.eastmoney.com/a/202606043760432315.html",
    category: "electronics",
    publishDate: "2026-06-04",
  },
  {
    title: "MLCC史诗级涨价潮来袭 AI算力与新能源车双轮驱动",
    summary: "MLCC现货价格普遍上涨15%-20%，AI服务器用高容产品涨幅达50%-60%。村田、太阳诱电、三星电机全球头部厂商集体调价，高端产线稼动率突破90%，紧缺订单交期延长至4个月。",
    source: "36氪",
    sourceUrl: "https://36kr.com/p/3845611027728640",
    category: "electronics",
    publishDate: "2026-06-09",
  },
  {
    title: "电子布涨价100% MLCC产业发展专题座谈会召开",
    summary: "全球70%PPE树脂供应中断，电子布价格涨幅达100%年内已5轮涨价。工信部电子信息司召开MLCC产业发展专题座谈会，系统梳理AI需求下MLCC技术演进与产业发展趋势。",
    source: "财富号",
    sourceUrl: "https://caifuhao.eastmoney.com/news/20260618185928806010330",
    category: "electronics",
    publishDate: "2026-06-18",
  },
  {
    title: "本周电子元器件行情解析：高端紧缺通用平稳",
    summary: "电子元器件行业结构性紧缺格局已固化，AI算力、新能源汽车、工控自动化三大需求托举市场。高端物料交期持续拉长至18-24周，消费类物料供需宽松价格稳定。",
    source: "搜狐",
    sourceUrl: "https://biznews.sohu.com/a/1030878003_122506823",
    category: "electronics",
    publishDate: "2026-06-02",
  },
  {
    title: "2026年Q2电子元器件行情报告：市场规模突破1.5万亿美元",
    summary: "WSTS大幅上调全球半导体市场预测，2026年市场规模突破1.5万亿美元同比增长90%，存储器市场预计同比激增约250%超8000亿美元，AI基础设施建设仍是核心增长动力。",
    source: "电子工程世界",
    sourceUrl: "https://m.eeworld.com.cn/news_mp/fc/a430877.jspx",
    category: "electronics",
    publishDate: "2026-06-09",
  },
  {
    title: "深南电路拟定增48.82亿用于AI算力电子电路产品项目",
    summary: "深南电路拟定增募资不超过48.82亿元，用于AI算力电子电路产品项目等。PCB行业受益AI服务器和高速网络设备需求增长，高端PCB产能持续吃紧。",
    source: "东方财富网",
    sourceUrl: "https://finance.eastmoney.com/a/202606143770751019.html",
    category: "electronics",
    publishDate: "2026-06-14",
  },
  {
    title: "全球电子元器件行业发展趋势：高端化智能化绿色化",
    summary: "全球电子元器件行业向高端化、智能化和绿色化方向发展。AI算力基础设施建设、新能源汽车普及、工业自动化推进和物联网应用扩展成为四大核心驱动力。",
    source: "中研网",
    sourceUrl: "https://m.chinairn.com/scfx/20260615/171815167.shtml",
    category: "electronics",
    publishDate: "2026-06-15",
  },
  {
    title: "TI两年四次涨价 模拟芯片行业从价格内卷转向价值回归",
    summary: "德州仪器近半年内四次涨价，标志着模拟芯片行业从'以价换量'的价格内卷转向'价值回归'。具备车规级认证、高可靠性隔离技术能力的厂商将掌握定价主动权。",
    source: "安博电子",
    sourceUrl: "https://ambleelec.com/NewsDetail/997",
    category: "electronics",
    publishDate: "2026-06-03",
  },
];

async function seed() {
  console.log("行业新闻种子数据导入...\n");
  console.log(`共 ${articles.length} 篇新闻待写入\n`);

  let inserted = 0;
  let skipped = 0;

  for (const article of articles) {
    if (!article.title || !article.source || !article.category || !article.publishDate) {
      skipped++;
      continue;
    }

    try {
      await pool.query(
        `INSERT INTO news_articles (title, summary, source, source_url, category, publish_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          article.title.slice(0, 500),
          article.summary || null,
          article.source.slice(0, 200),
          article.sourceUrl || null,
          article.category,
          new Date(article.publishDate),
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`插入失败: ${article.title} - ${err.message}`);
    }
  }

  // 统计各分类数量
  const { rows: counts } = await pool.query(
    `SELECT category, COUNT(*) as cnt FROM news_articles GROUP BY category ORDER BY cnt DESC`
  );

  console.log("\n======= 导入完成 =======");
  console.log(`成功写入: ${inserted} 篇`);
  if (skipped > 0) console.log(`跳过: ${skipped} 篇`);
  console.log("\n各分类统计:");
  for (const row of counts) {
    const labels = { automation: "自动化", ai: "人工智能", chip: "芯片", electronics: "电子技术" };
    console.log(`  ${labels[row.category] || row.category}: ${row.cnt} 篇`);
  }
  console.log(`  总计: ${counts.reduce((sum, r) => sum + parseInt(r.cnt), 0)} 篇`);

  await pool.end();
}

seed().catch((err) => {
  console.error("导入失败:", err);
  pool.end();
  process.exit(1);
});
