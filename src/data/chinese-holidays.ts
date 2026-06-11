// 中国节假日数据

export interface Holiday {
  name: string;
  type: "法定假日" | "传统节日" | "调休补班";
  year: number;
  month: number;
  day: number;
  isHoliday: boolean; // 是否是放假日
  description?: string;
}

export interface HolidaySchedule {
  name: string;
  year: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  holidays: string[]; // 放假日期 YYYY-MM-DD
  workDays: string[]; // 补班日期 YYYY-MM-DD
  description: string;
}

// 生成指定年份的节假日数据
export function generateHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // 元旦 - 1月1日
  holidays.push({
    name: "元旦",
    type: "法定假日",
    year,
    month: 0,
    day: 1,
    isHoliday: true,
    description: "法定节假日，放假1天"
  });

  // 春节（农历正月初一）- 需要根据年份计算
  const springFestival = getSpringFestivalDate(year);
  holidays.push({
    name: "春节",
    type: "法定假日",
    year,
    month: springFestival.month,
    day: springFestival.day,
    isHoliday: true,
    description: "农历正月初一，法定节假日放假3天"
  });
  // 春节前两天和后三天也放假
  for (let i = -2; i <= 3; i++) {
    if (i !== 0) {
      const date = new Date(year, springFestival.month, springFestival.day + i);
      if (date.getMonth() === springFestival.month || (i > 0 && date.getMonth() !== springFestival.month)) {
        holidays.push({
          name: "春节假期",
          type: "法定假日",
          year,
          month: date.getMonth(),
          day: date.getDate(),
          isHoliday: true,
          description: "春节长假"
        });
      }
    }
  }

  // 清明节（4月4日或5日，根据节气）
  const qingming = getQingmingDate(year);
  holidays.push({
    name: "清明节",
    type: "传统节日",
    year,
    month: 3,
    day: qingming,
    isHoliday: true,
    description: "传统节日，放假1天"
  });

  // 劳动节 - 5月1日
  holidays.push({
    name: "劳动节",
    type: "法定假日",
    year,
    month: 4,
    day: 1,
    isHoliday: true,
    description: "法定节假日，放假1天"
  });

  // 端午节（农历五月初五）
  const dragonBoat = getDragonBoatDate(year);
  holidays.push({
    name: "端午节",
    type: "传统节日",
    year,
    month: dragonBoat.month,
    day: dragonBoat.day,
    isHoliday: true,
    description: "传统节日，放假1天"
  });

  // 中秋节（农历八月十五）
  const midAutumn = getMidAutumnDate(year);
  holidays.push({
    name: "中秋节",
    type: "传统节日",
    year,
    month: midAutumn.month,
    day: midAutumn.day,
    isHoliday: true,
    description: "传统节日，放假1天"
  });

  // 国庆节 - 10月1日
  holidays.push({
    name: "国庆节",
    type: "法定假日",
    year,
    month: 9,
    day: 1,
    isHoliday: true,
    description: "法定节假日，放假7天"
  });
  // 国庆节后六天
  for (let i = 1; i <= 6; i++) {
    const date = new Date(year, 9, 1 + i);
    holidays.push({
      name: "国庆长假",
      type: "法定假日",
      year,
      month: date.getMonth(),
      day: date.getDate(),
      isHoliday: true,
      description: "国庆长假"
    });
  }

  // 妇女节 - 3月8日（部分群体放假半天）
  holidays.push({
    name: "妇女节",
    type: "法定假日",
    year,
    month: 2,
    day: 8,
    isHoliday: false,
    description: "妇女放假半天"
  });

  // 青年节 - 5月4日（14周岁以上的青年放假半天）
  holidays.push({
    name: "青年节",
    type: "法定假日",
    year,
    month: 4,
    day: 4,
    isHoliday: false,
    description: "14周岁以上的青年放假半天"
  });

  // 儿童节 - 6月1日（不满14周岁的少年儿童放假1天）
  holidays.push({
    name: "儿童节",
    type: "法定假日",
    year,
    month: 5,
    day: 1,
    isHoliday: false,
    description: "不满14周岁的少年儿童放假1天"
  });

  // 建军节 - 8月1日（现役军人放假半天）
  holidays.push({
    name: "建军节",
    type: "法定假日",
    year,
    month: 7,
    day: 1,
    isHoliday: false,
    description: "现役军人放假半天"
  });

  return holidays;
}

// 获取春节日期（简化计算，实际应使用专业农历算法）
function getSpringFestivalDate(year: number): { month: number; day: number } {
  // 2024-2030年的春节日期
  const springFestivalDates: Record<number, { month: number; day: number }> = {
    2024: { month: 1, day: 10 },
    2025: { month: 0, day: 29 },
    2026: { month: 1, day: 17 },
    2027: { month: 1, day: 6 },
    2028: { month: 0, day: 26 },
    2029: { month: 1, day: 13 },
    2030: { month: 1, day: 3 },
  };
  return springFestivalDates[year] || { month: 1, day: 19 };
}

// 获取清明节日期（4月4日或5日）
function getQingmingDate(year: number): number {
  // 清明节在4月4日或5日之间变动
  const qingmingDates: Record<number, number> = {
    2024: 4,
    2025: 4,
    2026: 5,
    2027: 5,
    2028: 4,
    2029: 4,
    2030: 4,
  };
  return qingmingDates[year] || 4;
}

// 获取端午节日期（农历五月初五）
function getDragonBoatDate(year: number): { month: number; day: number } {
  const dragonBoatDates: Record<number, { month: number; day: number }> = {
    2024: { month: 5, day: 10 },
    2025: { month: 5, day: 31 },
    2026: { month: 5, day: 19 },
    2027: { month: 5, day: 9 },
    2028: { month: 5, day: 28 },
    2029: { month: 5, day: 16 },
    2030: { month: 5, day: 6 },
  };
  return dragonBoatDates[year] || { month: 5, day: 25 };
}

// 获取中秋节日期（农历八月十五）
function getMidAutumnDate(year: number): { month: number; day: number } {
  const midAutumnDates: Record<number, { month: number; day: number }> = {
    2024: { month: 8, day: 17 },
    2025: { month: 9, day: 6 },
    2026: { month: 8, day: 25 },
    2027: { month: 8, day: 15 },
    2028: { month: 10, day: 3 },
    2029: { month: 9, day: 22 },
    2030: { month: 9, day: 12 },
  };
  return midAutumnDates[year] || { month: 8, day: 22 };
}

// 获取指定年份的放假安排
export function getHolidaySchedule(year: number): HolidaySchedule[] {
  const schedules: HolidaySchedule[] = [];

  // 元旦放假安排
  schedules.push({
    name: "元旦",
    year,
    startDate: `${year}-01-01`,
    endDate: `${year}-01-01`,
    holidays: [`${year}-01-01`],
    workDays: [],
    description: "1月1日放假，共1天"
  });

  // 春节放假安排
  const springFestival = getSpringFestivalDate(year);
  const sfDate = new Date(year, springFestival.month, springFestival.day);
  const sfStart = new Date(sfDate);
  sfStart.setDate(sfDate.getDate() - 2);
  const sfEnd = new Date(sfDate);
  sfEnd.setDate(sfDate.getDate() + 3);

  schedules.push({
    name: "春节",
    year,
    startDate: formatDate(sfStart),
    endDate: formatDate(sfEnd),
    holidays: getDatesBetween(sfStart, sfEnd),
    workDays: [],
    description: `农历正月初一及前后共${getDaysBetween(sfStart, sfEnd) + 1}天`
  });

  // 清明节放假安排
  schedules.push({
    name: "清明节",
    year,
    startDate: `${year}-04-04`,
    endDate: `${year}-04-04`,
    holidays: [`${year}-04-${getQingmingDate(year)}`],
    workDays: [],
    description: "放假1天"
  });

  // 劳动节放假安排
  schedules.push({
    name: "劳动节",
    year,
    startDate: `${year}-05-01`,
    endDate: `${year}-05-05`,
    holidays: [`${year}-05-01`, `${year}-05-02`, `${year}-05-03`, `${year}-05-04`, `${year}-05-05`],
    workDays: [`${year}-04-27`], // 假设4月27日为调休补班日
    description: "5月1日至5日放假，共5天"
  });

  // 端午节放假安排
  const dragonBoat = getDragonBoatDate(year);
  const dbDate = new Date(year, dragonBoat.month, dragonBoat.day);
  schedules.push({
    name: "端午节",
    year,
    startDate: formatDate(dbDate),
    endDate: formatDate(dbDate),
    holidays: [`${year}-${String(dragonBoat.month + 1).padStart(2, '0')}-${String(dragonBoat.day).padStart(2, '0')}`],
    workDays: [],
    description: "放假1天"
  });

  // 中秋节放假安排
  const midAutumn = getMidAutumnDate(year);
  const maDate = new Date(year, midAutumn.month, midAutumn.day);
  schedules.push({
    name: "中秋节",
    year,
    startDate: formatDate(maDate),
    endDate: formatDate(maDate),
    holidays: [`${year}-${String(midAutumn.month + 1).padStart(2, '0')}-${String(midAutumn.day).padStart(2, '0')}`],
    workDays: [],
    description: "放假1天"
  });

  // 国庆节放假安排
  schedules.push({
    name: "国庆节",
    year,
    startDate: `${year}-10-01`,
    endDate: `${year}-10-07`,
    holidays: [
      `${year}-10-01`, `${year}-10-02`, `${year}-10-03`, `${year}-10-04`,
      `${year}-10-05`, `${year}-10-06`, `${year}-10-07`
    ],
    workDays: [`${year}-09-29`, `${year}-10-12`], // 假设9月29日和10月12日为调休补班日
    description: "10月1日至7日放假，共7天"
  });

  return schedules;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 获取两个日期之间的所有日期
function getDatesBetween(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// 计算两个日期之间的天数
function getDaysBetween(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// 检查指定日期是否是节假日
export function isHoliday(date: Date): Holiday | null {
  const year = date.getFullYear();
  const holidays = generateHolidays(year);

  return holidays.find(holiday =>
    holiday.month === date.getMonth() &&
    holiday.day === date.getDate()
  ) || null;
}

// 检查指定日期是否是补班日
export function isWorkDay(date: Date): boolean {
  const year = date.getFullYear();
  const schedules = getHolidaySchedule(year);

  for (const schedule of schedules) {
    if (schedule.workDays.includes(formatDate(date))) {
      return true;
    }
  }

  return false;
}

// 检查指定日期是否是放假日
export function isHolidayDay(date: Date): boolean {
  const year = date.getFullYear();
  const schedules = getHolidaySchedule(year);

  for (const schedule of schedules) {
    if (schedule.holidays.includes(formatDate(date))) {
      return true;
    }
  }

  return false;
}
