"use client";

import { useState, useEffect } from "react";
import {
  isHoliday,
  isWorkDay,
  isHolidayDay,
  getHolidaySchedule,
  type Holiday,
  type HolidaySchedule
} from "@/data/chinese-holidays";

type ToolType = "calculator" | "calendar" | "tax" | "loan" | "notepad" | "excel";

interface UtilityToolsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UtilityTools({ isOpen, onClose }: UtilityToolsProps) {
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">实用工具</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧工具菜单 */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-2">
              <ToolButton
                icon="🧮"
                label="计算器"
                selected={selectedTool === "calculator"}
                onClick={() => setSelectedTool("calculator")}
              />
              <ToolButton
                icon="📅"
                label="黄历万年历"
                selected={selectedTool === "calendar"}
                onClick={() => setSelectedTool("calendar")}
              />
              <ToolButton
                icon="💰"
                label="个人所得税计算"
                selected={selectedTool === "tax"}
                onClick={() => setSelectedTool("tax")}
              />
              <ToolButton
                icon="🏦"
                label="贷款计算器"
                selected={selectedTool === "loan"}
                onClick={() => setSelectedTool("loan")}
              />
              <ToolButton
                icon="📊"
                label="Excel函数学习"
                selected={selectedTool === "excel"}
                onClick={() => setSelectedTool("excel")}
              />
              <ToolButton
                icon="📝"
                label="记事本"
                selected={selectedTool === "notepad"}
                onClick={() => setSelectedTool("notepad")}
              />
            </div>
          </div>

          {/* 右侧工具内容 */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedTool === "calculator" && <Calculator />}
            {selectedTool === "calendar" && <Calendar />}
            {selectedTool === "tax" && <TaxCalculator />}
            {selectedTool === "loan" && <LoanCalculator />}
            {selectedTool === "excel" && <ExcelFunctions />}
            {selectedTool === "notepad" && <Notepad />}
            {!selectedTool && (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <p>请从左侧选择一个工具</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
        selected
          ? "bg-blue-500 text-white"
          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

// 科学计算器组件
function Calculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [angleMode, setAngleMode] = useState<"DEG" | "RAD">("DEG");
  const [isSecond, setIsSecond] = useState(false);

  // 科学计算函数
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const evaluateScientific = (expr: string): number => {
    // 替换科学函数和运算符
    let processed = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/√/g, "Math.sqrt")
      .replace(/π/g, "Math.PI")
      .replace(/e/g, "Math.E")
      .replace(/sin\(/g, (isSecond ? "Math.asin(" : "Math.sin("))
      .replace(/cos\(/g, (isSecond ? "Math.acos(" : "Math.cos("))
      .replace(/tan\(/g, (isSecond ? "Math.atan(" : "Math.tan("))
      .replace(/log\(/g, "Math.log10(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/!\)/g, ")");

    // 如果是三角函数且使用角度制，需要转换输入
    if (angleMode === "DEG" && !isSecond) {
      // 简单处理：直接在JavaScript中使用角度制
      const originalSin = Math.sin;
      const originalCos = Math.cos;
      const originalTan = Math.tan;

      Math.sin = (x) => originalSin(toRadians(x));
      Math.cos = (x) => originalCos(toRadians(x));
      Math.tan = (x) => originalTan(toRadians(x));

      const result = eval(processed);

      // 恢复原始函数
      Math.sin = originalSin;
      Math.cos = originalCos;
      Math.tan = originalTan;

      return result;
    }

    return eval(processed);
  };

  const handleClick = (value: string) => {
    if (value === "C") {
      setDisplay("0");
      setExpression("");
    } else if (value === "AC") {
      setDisplay("0");
      setExpression("");
      setHistory([]);
    } else if (value === "DEL") {
      setDisplay(display.length === 1 ? "0" : display.slice(0, -1));
    } else if (value === "2nd") {
      setIsSecond(!isSecond);
    } else if (value === "DEG/RAD") {
      setAngleMode(angleMode === "DEG" ? "RAD" : "DEG");
    } else if (value === "=") {
      try {
        const result = evaluateScientific(display);
        const formattedResult = Number.isFinite(result) ? result.toString() : "错误";
        setHistory([...history, `${display} = ${formattedResult}`]);
        setDisplay(formattedResult);
        setExpression("");
      } catch (error) {
        setDisplay("错误");
      }
    } else {
      setDisplay(display === "0" ? value : display + value);
    }
  };

  // 科学函数按钮
  const sciButtons1 = isSecond 
    ? ["sin⁻¹", "cos⁻¹", "tan⁻¹", "log", "ln"]
    : ["sin", "cos", "tan", "log", "ln"];
  
  const sciButtons2 = isSecond
    ? ["x²", "1/x", "n!", "π", "e"]
    : ["x²", "√", "^", "(", ")"];

  const basicButtons = [
    ["7", "8", "9", "DEL", "AC"],
    ["4", "5", "6", "×", "÷"],
    ["1", "2", "3", "+", "-"],
    ["0", ".", "π", "e", "="],
  ];

  const getButtonClass = (btn: string) => {
    if (btn === "=") return "bg-blue-500 hover:bg-blue-600 text-white col-span-1";
    if (["C", "AC", "DEL"].includes(btn)) return "bg-red-500 hover:bg-red-600 text-white";
    if (["×", "÷", "+", "-"].includes(btn)) return "bg-orange-500 hover:bg-orange-600 text-white";
    if (["sin", "cos", "tan", "sin⁻¹", "cos⁻¹", "tan⁻¹", "log", "ln"].includes(btn)) return "bg-purple-500 hover:bg-purple-600 text-white text-sm";
    if (["x²", "√", "^", "(", ")", "1/x", "n!"].includes(btn)) return "bg-indigo-500 hover:bg-indigo-600 text-white text-sm";
    if (["π", "e"].includes(btn)) return "bg-cyan-500 hover:bg-cyan-600 text-white";
    if (btn === "2nd") return "bg-gray-700 hover:bg-gray-600 text-white text-xs";
    if (btn === "DEG/RAD") return "bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold";
    return "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">科学计算器</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleClick("2nd")}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isSecond ? "bg-purple-500 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            2nd
          </button>
          <button
            onClick={() => handleClick("DEG/RAD")}
            className="px-3 py-1 rounded text-xs font-bold transition-colors bg-teal-500 hover:bg-teal-600 text-white"
          >
            {angleMode}
          </button>
        </div>
      </div>

      {/* 显示区域 */}
      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
        <div className="text-right text-4xl font-bold text-gray-900 dark:text-white mb-2 overflow-x-auto">
          {display}
        </div>
        {expression && (
          <div className="text-right text-sm text-gray-500 dark:text-gray-400">
            {expression}
          </div>
        )}
      </div>

      {/* 科学函数区域 */}
      <div className="grid grid-cols-5 gap-2">
        {sciButtons1.map((btn) => (
          <button
            key={btn}
            onClick={() => handleClick(btn + "(")}
            className={`h-10 rounded-lg font-medium transition-colors ${getButtonClass(btn)}`}
          >
            {btn}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {sciButtons2.map((btn) => {
          let clickValue = btn;
          if (btn === "x²") clickValue = "^2";
          if (btn === "1/x") clickValue = "^(-1)";
          if (btn === "n!") clickValue = "!";
          return (
            <button
              key={btn}
              onClick={() => handleClick(clickValue)}
              className={`h-10 rounded-lg font-medium transition-colors ${getButtonClass(btn)}`}
            >
              {btn}
            </button>
          );
        })}
      </div>

      {/* 基础数字和运算符 */}
      <div className="grid grid-cols-5 gap-2">
        {basicButtons.flat().map((btn) => (
          <button
            key={btn}
            onClick={() => handleClick(btn)}
            className={`h-14 rounded-lg font-medium transition-colors ${getButtonClass(btn)}`}
          >
            {btn}
          </button>
        ))}
      </div>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h4>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-red-500 hover:text-red-600"
            >
              清空
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto">
            {history.slice().reverse().slice(0, 10).map((item, index) => (
              <div
                key={index}
                onClick={() => {
                  const result = item.split(" = ")[1];
                  if (result && result !== "错误") {
                    setDisplay(result);
                  }
                }}
                className="text-sm text-gray-600 dark:text-gray-400 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 rounded cursor-pointer"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 黄历万年历组件
function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showHolidayInfo, setShowHolidayInfo] = useState(false);
  const [holidaySchedule, setHolidaySchedule] = useState<HolidaySchedule[]>([]);

  useEffect(() => {
    const year = currentDate.getFullYear();
    setHolidaySchedule(getHolidaySchedule(year));
  }, [currentDate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getLunarDate = (year: number, month: number, day: number) => {
    // 简化版农历计算（实际应使用专业农历算法）
    const lunarMap = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"];
    const lunarDayMap = ["初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
      "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
      "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
    // 简化计算，实际应使用复杂农历算法
    const lunarMonth = (month + 9) % 12;
    const lunarDay = day;
    return `${lunarMap[lunarMonth]}${lunarDayMap[lunarDay - 1] || "三十"}`;
  };

  const getGanZhiYear = (year: number) => {
    const gan = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    const zhi = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    const ganIndex = (year - 4) % 10;
    const zhiIndex = (year - 4) % 12;
    return `${gan[ganIndex]}${zhi[zhiIndex]}年`;
  };

  const getZodiac = (year: number) => {
    const zodiacs = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    return zodiacs[(year - 4) % 12];
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    setShowHolidayInfo(true);
  };

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
        >
          上月
        </button>
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {year}年 {monthNames[month]}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getGanZhiYear(year)} · {getZodiac(year)}年
          </p>
        </div>
        <button
          onClick={nextMonth}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
        >
          下月
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-2 font-medium text-gray-700 dark:text-gray-300">
            {day}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, index) => (
          <div key={`empty-${index}`} className="p-2"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = new Date(year, month, day);
          const isToday = new Date().toDateString() === date.toDateString();
          const holiday = isHoliday(date);
          const isHolidayDayFlag = isHolidayDay(date);
          const isWorkDayFlag = isWorkDay(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          let bgColor = "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white";
          if (isToday) {
            bgColor = "bg-blue-500 text-white";
          } else if (holiday && holiday.isHoliday) {
            bgColor = "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 text-gray-900 dark:text-white";
          } else if (isWorkDayFlag) {
            bgColor = "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 text-gray-900 dark:text-white";
          } else if (isHolidayDayFlag) {
            bgColor = "bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/40 text-gray-900 dark:text-white";
          } else if (isWeekend) {
            bgColor = "bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white";
          }

          return (
            <div
              key={day}
              onClick={() => handleDateClick(day)}
              className={`p-2 rounded-lg text-center cursor-pointer transition-colors relative ${bgColor}`}
            >
              <div className="font-medium">{day}</div>
              <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {getLunarDate(year, month, day)}
              </div>
              {(holiday && holiday.isHoliday) && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
              )}
              {isWorkDayFlag && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full"></div>
              )}
              {holiday && !holiday.isHoliday && (
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* 图例说明 */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>法定假日</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span>调休补班</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>特殊节日</span>
        </div>
      </div>

      {/* 放假安排 */}
      {holidaySchedule.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">节假日放假安排</h4>
          <div className="space-y-3">
            {holidaySchedule.map((schedule, index) => (
              <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-white">{schedule.name}</h5>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {schedule.startDate} 至 {schedule.endDate}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {schedule.description}
                </p>
                {schedule.holidays.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {schedule.holidays.map((holiday, hIndex) => (
                      <span
                        key={hIndex}
                        className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
                      >
                        {holiday}
                      </span>
                    ))}
                  </div>
                )}
                {schedule.workDays.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">补班：</span>
                    {schedule.workDays.map((workDay, wIndex) => (
                      <span
                        key={wIndex}
                        className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded"
                      >
                        {workDay}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 选中日期的详细信息 */}
      {showHolidayInfo && selectedDate && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日
            </h4>
            <button
              onClick={() => setShowHolidayInfo(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-gray-700 dark:text-gray-300">
              农历：{getLunarDate(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())}
            </div>
            {(() => {
              const holiday = isHoliday(selectedDate);
              if (holiday) {
                return (
                  <div className={`p-2 rounded ${holiday.isHoliday ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                    <div className="font-medium">{holiday.name}</div>
                    <div className="text-xs mt-1">{holiday.description}</div>
                  </div>
                );
              }
              return null;
            })()}
            {isWorkDay(selectedDate) && (
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                <div className="font-medium">调休补班日</div>
                <div className="text-xs mt-1">此日为节假日调休补班日</div>
              </div>
            )}
            {isHolidayDay(selectedDate) && !isHoliday(selectedDate) && (
              <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                <div className="font-medium">放假</div>
                <div className="text-xs mt-1">此日为节假日假期</div>
              </div>
            )}
            {!isHoliday(selectedDate) && !isHolidayDay(selectedDate) && !isWorkDay(selectedDate) && (
              <div className="text-gray-500 dark:text-gray-400">
                无特殊节日安排
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">农历说明</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          此万年历显示公历日期对应的农历日期、干支纪年、生肖以及中国法定节假日和放假安排。
          点击日期可查看详细信息。
        </p>
      </div>
    </div>
  );
}

// 个人所得税计算器组件
function TaxCalculator() {
  const [income, setIncome] = useState("");
  const [deduction, setDeduction] = useState("5000");
  const [insurance, setInsurance] = useState("0");
  const [specialDeductions, setSpecialDeductions] = useState("0");
  const [result, setResult] = useState<{
    taxIncome: number;
    taxAmount: number;
    afterTaxIncome: number;
  } | null>(null);

  const taxBrackets = [
    { threshold: 36000, rate: 0.03, deduction: 0 },
    { threshold: 144000, rate: 0.1, deduction: 210 },
    { threshold: 300000, rate: 0.2, deduction: 1410 },
    { threshold: 420000, rate: 0.25, deduction: 2660 },
    { threshold: 660000, rate: 0.3, deduction: 4410 },
    { threshold: 960000, rate: 0.35, deduction: 7160 },
    { threshold: Infinity, rate: 0.45, deduction: 15160 },
  ];

  const calculateTax = () => {
    const preTaxIncome = parseFloat(income) || 0;
    const deductionAmount = parseFloat(deduction) || 0;
    const insuranceAmount = parseFloat(insurance) || 0;
    const specialDeductionAmount = parseFloat(specialDeductions) || 0;

    const taxIncome = preTaxIncome - deductionAmount - insuranceAmount - specialDeductionAmount;
    const positiveTaxIncome = Math.max(0, taxIncome);

    let taxAmount = 0;
    for (const bracket of taxBrackets) {
      if (positiveTaxIncome <= bracket.threshold) {
        taxAmount = positiveTaxIncome * bracket.rate - bracket.deduction;
        break;
      }
    }

    setResult({
      taxIncome: positiveTaxIncome,
      taxAmount,
      afterTaxIncome: preTaxIncome - insuranceAmount - taxAmount,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">个人所得税计算器</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            税前月收入（元）
          </label>
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="请输入税前月收入"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            起征点（元）
          </label>
          <input
            type="number"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            社保公积金（元）
          </label>
          <input
            type="number"
            value={insurance}
            onChange={(e) => setInsurance(e.target.value)}
            placeholder="请输入个人缴纳部分"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            专项附加扣除（元）
          </label>
          <input
            type="number"
            value={specialDeductions}
            onChange={(e) => setSpecialDeductions(e.target.value)}
            placeholder="子女教育、赡养老人等"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={calculateTax}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          计算个税
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">计算结果</h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">应纳税所得额：</span>
            <span className="font-medium text-gray-900 dark:text-white">¥{result.taxIncome.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">个人所得税：</span>
            <span className="font-medium text-red-600 dark:text-red-400">¥{result.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">税后实际收入：</span>
            <span className="font-medium text-green-600 dark:text-green-400">¥{result.afterTaxIncome.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">税率表</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>1-36000元：3%</div>
          <div>36000-144000元：10%</div>
          <div>144000-300000元：20%</div>
          <div>300000-420000元：25%</div>
          <div>420000-660000元：30%</div>
          <div>660000-960000元：35%</div>
          <div>960000元以上：45%</div>
        </div>
      </div>
    </div>
  );
}

// 贷款计算器组件
function LoanCalculator() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("4.65");
  const [months, setMonths] = useState("360");
  const [calcType, setCalcType] = useState<"equalPayment" | "equalPrincipal">("equalPayment");
  const [result, setResult] = useState<{
    monthlyPayment: number;
    totalInterest: number;
    totalAmount: number;
    firstMonthPayment?: number;
    lastMonthPayment?: number;
  } | null>(null);

  const calculateLoan = () => {
    const p = parseFloat(principal) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = parseInt(months) || 0;

    if (p <= 0 || r <= 0 || n <= 0) return;

    if (calcType === "equalPayment") {
      // 等额本息
      const monthlyPayment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const totalAmount = monthlyPayment * n;
      const totalInterest = totalAmount - p;

      setResult({
        monthlyPayment,
        totalInterest,
        totalAmount,
      });
    } else {
      // 等额本金
      const monthlyPrincipal = p / n;
      const firstMonthPayment = monthlyPrincipal + p * r;
      const lastMonthPayment = monthlyPrincipal + (monthlyPrincipal * r);
      const totalInterest = ((n + 1) * p * r) / 2;
      const totalAmount = p + totalInterest;

      setResult({
        monthlyPayment: (totalAmount / n), // 平均月供
        totalInterest,
        totalAmount,
        firstMonthPayment,
        lastMonthPayment,
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">贷款计算器</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            贷款金额（万元）
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="请输入贷款金额"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            年利率（%）
          </label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            贷款期限（月）
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="60">5年（60期）</option>
            <option value="120">10年（120期）</option>
            <option value="180">15年（180期）</option>
            <option value="240">20年（240期）</option>
            <option value="300">25年（300期）</option>
            <option value="360">30年（360期）</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            还款方式
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="equalPayment"
                checked={calcType === "equalPayment"}
                onChange={(e) => setCalcType(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">等额本息</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="equalPrincipal"
                checked={calcType === "equalPrincipal"}
                onChange={(e) => setCalcType(e.target.value as any)}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">等额本金</span>
            </label>
          </div>
        </div>

        <button
          onClick={calculateLoan}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          计算贷款
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">计算结果</h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">贷款总额：</span>
            <span className="font-medium text-gray-900 dark:text-white">¥{(parseFloat(principal) || 0 * 10000).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">还款总额：</span>
            <span className="font-medium text-gray-900 dark:text-white">¥{result.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">支付利息：</span>
            <span className="font-medium text-red-600 dark:text-red-400">¥{result.totalInterest.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {calcType === "equalPayment" ? "每月还款" : "平均月供"}：
            </span>
            <span className="font-medium text-blue-600 dark:text-blue-400">
              ¥{result.monthlyPayment.toFixed(2)}
            </span>
          </div>
          {result.firstMonthPayment && result.lastMonthPayment && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">首月还款：</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ¥{result.firstMonthPayment.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">末月还款：</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ¥{result.lastMonthPayment.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// 记事本组件
function Notepad() {
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const savedContent = localStorage.getItem("notepad-content");
    if (savedContent) {
      setContent(savedContent);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("notepad-content", content);
    setSaved(true);
    alert("保存成功！");
  };

  const handleClear = () => {
    if (confirm("确定要清空记事本吗？")) {
      setContent("");
      localStorage.removeItem("notepad-content");
      setSaved(true);
    }
  };

  const handleChange = (value: string) => {
    setContent(value);
    setSaved(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">记事本</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            清空
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {saved ? "已保存" : "保存"}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="在这里输入您的笔记..."
        className="flex-1 w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[400px] font-mono text-sm"
      />

      <div className="text-xs text-gray-500 dark:text-gray-400">
        {saved ? "✓ 已保存到浏览器本地存储" : "⚠ 未保存"}
      </div>
    </div>
  );
}

// Excel函数学习组件
function ExcelFunctions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);

  const categories = [
    { id: "all", name: "全部", icon: "📋" },
    { id: "math", name: "数学函数", icon: "🔢" },
    { id: "text", name: "文本函数", icon: "📝" },
    { id: "date", name: "日期函数", icon: "📅" },
    { id: "lookup", name: "查找函数", icon: "🔍" },
    { id: "logical", name: "逻辑函数", icon: "🧠" },
    { id: "statistical", name: "统计函数", icon: "📊" },
  ];

  const excelFunctions: Record<string, any[]> = {
    math: [
      {
        name: "SUM",
        category: "数学函数",
        description: "计算参数的总和",
        syntax: "SUM(number1, [number2], ...)",
        example: "=SUM(A1:A10)",
        explanation: "SUM函数用于计算一组数字的总和。可以输入数字、单元格引用或单元格区域。例如：=SUM(A1:A10)计算A1到A10所有单元格的总和。",
      },
      {
        name: "AVERAGE",
        category: "数学函数",
        description: "计算参数的平均值",
        syntax: "AVERAGE(number1, [number2], ...)",
        example: "=AVERAGE(B2:B20)",
        explanation: "AVERAGE函数计算一组数值的算术平均值。忽略空单元格和包含文本的单元格。例如：=AVERAGE(B2:B20)计算B2到B20的平均值。",
      },
      {
        name: "ROUND",
        category: "数学函数",
        description: "按指定位数四舍五入数字",
        syntax: "ROUND(number, num_digits)",
        example: "=ROUND(3.14159, 2) 结果为 3.14",
        explanation: "ROUND函数将数字四舍五入到指定的位数。num_digits为正数时四舍五入到小数点右侧，为负数时四舍五入到小数点左侧。例如：=ROUND(123.45, -1) 结果为 120",
      },
      {
        name: "MOD",
        category: "数学函数",
        description: "返回两数相除的余数",
        syntax: "MOD(number, divisor)",
        example: "=MOD(10, 3) 结果为 1",
        explanation: "MOD函数返回除法的余数。常用于判断奇偶数或循环计数。例如：=MOD(A1,2)=0判断A1是否为偶数。",
      },
    ],
    text: [
      {
        name: "CONCATENATE / CONCAT",
        category: "文本函数",
        description: "连接多个文本字符串",
        syntax: "CONCATENATE(text1, [text2], ...)",
        example: '=CONCATENATE("Hello", " ", "World") 结果为 "Hello World"',
        explanation: "CONCATENATE函数将多个文本字符串连接成一个字符串。也可以使用&运算符：=A1&\" \"&B1。CONCAT是新版函数，用法相同。",
      },
      {
        name: "LEFT",
        category: "文本函数",
        description: "从文本左侧提取指定字符数",
        syntax: "LEFT(text, [num_chars])",
        example: '=LEFT("Excel学习", 2) 结果为 "Ex"',
        explanation: "LEFT函数从文本字符串的左侧提取指定数量的字符。num_chars省略时默认为1。例如：=LEFT(A1, 3)提取A1单元格的前3个字符。",
      },
      {
        name: "RIGHT",
        category: "文本函数",
        description: "从文本右侧提取指定字符数",
        syntax: "RIGHT(text, [num_chars])",
        example: '=RIGHT("Excel学习", 2) 结果为 "习"',
        explanation: "RIGHT函数从文本字符串的右侧提取指定数量的字符。例如：=RIGHT(A1, 4)提取A1单元格的后4个字符。",
      },
      {
        name: "LEN",
        category: "文本函数",
        description: "返回文本字符串的长度",
        syntax: "LEN(text)",
        example: '=LEN("Hello") 结果为 5',
        explanation: "LEN函数返回文本字符串中的字符数（包括空格）。例如：=LEN(A1)返回A1单元格的字符数量。",
      },
      {
        name: "FIND",
        category: "文本函数",
        description: "查找一个文本在另一个文本中的位置",
        syntax: "FIND(find_text, within_text, [start_num])",
        example: '=FIND("Excel", "学习Excel函数") 结果为 3',
        explanation: "FIND函数返回一个文本在另一个文本中的起始位置。区分大小写。未找到时返回#VALUE!错误。例如：=FIND(\"a\", A1, 1)从A1的第1个字符开始查找\"a\"。",
      },
    ],
    date: [
      {
        name: "TODAY",
        category: "日期函数",
        description: "返回当前日期",
        syntax: "TODAY()",
        example: "=TODAY() 结果为 2026-01-13",
        explanation: "TODAY函数返回当前系统的日期。每次打开工作表时都会更新。例如：=TODAY()+30返回30天后的日期。",
      },
      {
        name: "NOW",
        category: "日期函数",
        description: "返回当前日期和时间",
        syntax: "NOW()",
        example: "=NOW() 结果为 2026-01-13 16:30:00",
        explanation: "NOW函数返回当前的日期和时间。会随时间变化而更新。用于计算时间差。",
      },
      {
        name: "DATEDIF",
        category: "日期函数",
        description: "计算两个日期之间的差值",
        syntax: "DATEDIF(start_date, end_date, unit)",
        example: '=DATEDIF("2025-01-01", "2026-01-01", "Y") 结果为 1',
        explanation: "DATEDIF函数计算两个日期之间的差值。unit参数：Y=年，M=月，D=天。例如：=DATEDIF(A1, TODAY(), \"Y\")计算从A1到现在的年数。",
      },
      {
        name: "EOMONTH",
        category: "日期函数",
        description: "返回某个月份最后一天的日期",
        syntax: "EOMONTH(start_date, months)",
        example: '=EOMONTH("2026-01-15", 0) 结果为 2026-01-31',
        explanation: "EOMONTH函数返回指定月数前/后的最后一天日期。months为0返回当月最后一天。例如：=EOMONTH(TODAY(), -1)返回上个月的最后一天。",
      },
    ],
    lookup: [
      {
        name: "VLOOKUP",
        category: "查找函数",
        description: "垂直查找值",
        syntax: "VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])",
        example: '=VLOOKUP(A2, $D$2:$F$100, 3, FALSE)',
        explanation: "VLOOKUP函数在表格的第一列中查找值，并返回该行中指定列的值。range_lookup：FALSE精确匹配，TRUE近似匹配。这是最常用的查找函数之一。",
      },
      {
        name: "HLOOKUP",
        category: "查找函数",
        description: "水平查找值",
        syntax: "HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])",
        explanation: "HLOOKUP函数与VLOOKUP类似，但在表格的第一行中查找值，并返回该列中指定行的值。",
      },
      {
        name: "INDEX",
        category: "查找函数",
        description: "返回表格或区域中的值",
        syntax: "INDEX(array, row_num, [column_num])",
        example: "=INDEX(A1:C10, 5, 2) 结果为 返回A1:C10第5行第2列的值",
        explanation: "INDEX函数返回表格或区域中指定行和列交叉处的值。常与MATCH函数组合使用，实现更灵活的查找。",
      },
      {
        name: "MATCH",
        category: "查找函数",
        description: "查找值在数组中的位置",
        syntax: "MATCH(lookup_value, lookup_array, [match_type])",
        example: '=MATCH("Excel", A1:A10, 0) 结果为 返回Excel在A1:A10中的位置',
        explanation: "MATCH函数在查找数组中查找值，并返回其相对位置。match_type：0精确匹配，1小于等于，-1大于等于。常与INDEX组合使用。",
      },
    ],
    logical: [
      {
        name: "IF",
        category: "逻辑函数",
        description: "根据条件返回不同值",
        syntax: "IF(logical_test, value_if_true, [value_if_false])",
        example: '=IF(A1>60, "及格", "不及格")',
        explanation: "IF函数根据逻辑测试的结果返回不同的值。如果条件为TRUE返回第一个值，为FALSE返回第二个值。可以嵌套最多64层。",
      },
      {
        name: "AND",
        category: "逻辑函数",
        description: "所有条件都为TRUE时返回TRUE",
        syntax: "AND(logical1, [logical2], ...)",
        example: '=AND(A1>60, B1>60) 结果为 两个条件都满足才返回TRUE',
        explanation: "AND函数检查所有条件是否都为TRUE。只有所有条件都满足时才返回TRUE，否则返回FALSE。常与IF函数配合使用。",
      },
      {
        name: "OR",
        category: "逻辑函数",
        description: "任意条件为TRUE时返回TRUE",
        syntax: "OR(logical1, [logical2], ...)",
        example: '=OR(A1>60, B1>60) 结果为 任意一个条件满足就返回TRUE',
        explanation: "OR函数检查是否有任意一个条件为TRUE。只要有一个条件满足就返回TRUE，所有条件都不满足才返回FALSE。",
      },
      {
        name: "IFERROR",
        category: "逻辑函数",
        description: "如果公式错误则返回指定值",
        syntax: "IFERROR(value, value_if_error)",
        example: "=IFERROR(VLOOKUP(A1, B:D, 3, FALSE), \"未找到\")",
        explanation: "IFERROR函数检查公式是否产生错误，如果出错则返回指定的值，否则返回公式本身的结果。常用于处理查找错误。",
      },
    ],
    statistical: [
      {
        name: "COUNT",
        category: "统计函数",
        description: "计算包含数字的单元格数量",
        syntax: "COUNT(value1, [value2], ...)",
        example: "=COUNT(A1:A10) 结果为 返回A1:A10中数字单元格的数量",
        explanation: "COUNT函数统计包含数字的单元格数量。忽略文本和空单元格。例如：=COUNT(B2:B100)统计成绩区域有多少个数字。",
      },
      {
        name: "COUNTA",
        category: "统计函数",
        description: "计算非空单元格数量",
        syntax: "COUNTA(value1, [value2], ...)",
        explanation: "COUNTA函数统计非空单元格的数量，包括文本、数字、公式结果等。只计算完全为空的单元格。",
      },
      {
        name: "COUNTIF",
        category: "统计函数",
        description: "计算满足条件的单元格数量",
        syntax: "COUNTIF(range, criteria)",
        example: '=COUNTIF(A1:A10, ">60") 结果为 统计大于60的单元格数',
        explanation: "COUNTIF函数统计满足指定条件的单元格数量。criteria可以是数字、文本、表达式或单元格引用。支持通配符?和*。",
      },
      {
        name: "SUMIF",
        category: "统计函数",
        description: "根据条件求和",
        syntax: "SUMIF(range, criteria, [sum_range])",
        example: '=SUMIF(A:A, "销售部", B:B) 结果为 求和A列为销售部的B列值',
        explanation: "SUMIF函数对满足条件的单元格求和。range条件范围，criteria条件，sum_range求和范围（可选）。不指定则对range求和。",
      },
      {
        name: "MAX",
        category: "统计函数",
        description: "返回参数中的最大值",
        syntax: "MAX(number1, [number2], ...)",
        example: "=MAX(A1:A10) 结果为 返回A1:A10中的最大值",
        explanation: "MAX函数返回一组数值中的最大值。忽略文本和空单元格。例如：=MAX(C2:C100)查找最高分。",
      },
      {
        name: "MIN",
        category: "统计函数",
        description: "返回参数中的最小值",
        syntax: "MIN(number1, [number2], ...)",
        example: "=MIN(A1:A10) 结果为 返回A1:A10中的最小值",
        explanation: "MIN函数返回一组数值中的最小值。忽略文本和空单元格。例如：=MIN(C2:C100)查找最低分。",
      },
    ],
  };

  // 获取所有函数
  const allFunctions = Object.values(excelFunctions).flat();

  // 根据分类和搜索条件筛选函数
  const filteredFunctions = allFunctions.filter((func) => {
    const matchesCategory = selectedCategory === "all" || func.category.includes(categories.find(c => c.id === selectedCategory)?.name || "");
    const matchesSearch = func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         func.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excel函数学习</h3>

      {/* 搜索框 */}
      <div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索函数名称或说明..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-blue-500 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* 函数列表 */}
      {!selectedFunction ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            共找到 {filteredFunctions.length} 个函数
          </p>
          <div className="grid gap-3">
            {filteredFunctions.map((func, index) => (
              <div
                key={index}
                onClick={() => setSelectedFunction(func.name)}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 dark:text-white">{func.name}</h4>
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">
                        {func.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{func.description}</p>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* 函数详情 */
        <div className="space-y-4">
          <button
            onClick={() => setSelectedFunction(null)}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>返回列表</span>
          </button>

          {allFunctions
            .filter((f) => f.name === selectedFunction)
            .map((func, index) => (
              <div key={index} className="space-y-4">
                {/* 函数名称 */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{func.name}</h4>
                    <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">
                      {func.category}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{func.description}</p>
                </div>

                {/* 语法 */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">语法</h5>
                  <code className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                    {func.syntax}
                  </code>
                </div>

                {/* 示例 */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">示例</h5>
                  <code className="text-sm text-green-700 dark:text-green-400 font-mono">
                    {func.example}
                  </code>
                </div>

                {/* 详细说明 */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">详细说明</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {func.explanation}
                  </p>
                </div>

                {/* 提示 */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    提示：可以在Excel中使用F1键或点击"插入函数"按钮获取更多帮助。
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
