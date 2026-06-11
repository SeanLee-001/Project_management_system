// 系统提示风格配置
export interface AlertStyle {
  id: string;
  name: string;
  description: string;
  preview: string;
  config: {
    containerClass: string;
    overlayClass: string;
    iconClass: string;
    titleClass: string;
    messageClass: string;
    buttonClass: string;
    borderRadius: string;
    shadow: string;
    animation: string;
  };
  typeStyles: {
    info: {
      bgColor: string;
      borderColor: string;
      iconColor: string;
      titleColor: string;
    };
    success: {
      bgColor: string;
      borderColor: string;
      iconColor: string;
      titleColor: string;
    };
    warning: {
      bgColor: string;
      borderColor: string;
      iconColor: string;
      titleColor: string;
    };
    error: {
      bgColor: string;
      borderColor: string;
      iconColor: string;
      titleColor: string;
    };
  };
}

// 预设风格
export const alertStyles: Record<string, AlertStyle> = {
  // 默认风格
  default: {
    id: "default",
    name: "默认风格",
    description: "简洁大方，适合日常使用",
    preview: "🎨 默认",
    config: {
      containerClass: "bg-white dark:bg-gray-800",
      overlayClass: "bg-black bg-opacity-50",
      iconClass: "w-12 h-12",
      titleClass: "text-xl font-bold",
      messageClass: "text-gray-700 dark:text-gray-300",
      buttonClass: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      borderRadius: "rounded-lg",
      shadow: "shadow-2xl",
      animation: "transition-all",
    },
    typeStyles: {
      info: {
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        iconColor: "text-blue-500",
        titleColor: "text-blue-900 dark:text-blue-100",
      },
      success: {
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        iconColor: "text-green-500",
        titleColor: "text-green-900 dark:text-green-100",
      },
      warning: {
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        iconColor: "text-yellow-500",
        titleColor: "text-yellow-900 dark:text-yellow-100",
      },
      error: {
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-200 dark:border-red-800",
        iconColor: "text-red-500",
        titleColor: "text-red-900 dark:text-red-100",
      },
    },
  },

  // 现代风格
  modern: {
    id: "modern",
    name: "现代风格",
    description: "扁平化设计，圆角更大",
    preview: "✨ 现代",
    config: {
      containerClass: "bg-white dark:bg-gray-800",
      overlayClass: "bg-black bg-opacity-40 backdrop-blur-sm",
      iconClass: "w-16 h-16",
      titleClass: "text-2xl font-semibold",
      messageClass: "text-gray-600 dark:text-gray-300 text-base",
      buttonClass: "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg",
      borderRadius: "rounded-2xl",
      shadow: "shadow-2xl",
      animation: "transition-all duration-300",
    },
    typeStyles: {
      info: {
        bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30",
        borderColor: "border-blue-100 dark:border-blue-900",
        iconColor: "text-blue-600",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      success: {
        bgColor: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30",
        borderColor: "border-green-100 dark:border-green-900",
        iconColor: "text-green-600",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      warning: {
        bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30",
        borderColor: "border-yellow-100 dark:border-yellow-900",
        iconColor: "text-orange-600",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      error: {
        bgColor: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30",
        borderColor: "border-red-100 dark:border-red-900",
        iconColor: "text-red-600",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
    },
  },

  // 极简风格
  minimal: {
    id: "minimal",
    name: "极简风格",
    description: "黑白配色，去除装饰",
    preview: "⬜ 极简",
    config: {
      containerClass: "bg-white dark:bg-gray-900",
      overlayClass: "bg-gray-900 bg-opacity-30",
      iconClass: "w-10 h-10",
      titleClass: "text-lg font-medium",
      messageClass: "text-gray-700 dark:text-gray-300",
      buttonClass: "bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600",
      borderRadius: "rounded-sm",
      shadow: "shadow-lg",
      animation: "transition-all",
    },
    typeStyles: {
      info: {
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
        iconColor: "text-gray-700 dark:text-gray-300",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      success: {
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
        iconColor: "text-gray-700 dark:text-gray-300",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      warning: {
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
        iconColor: "text-gray-700 dark:text-gray-300",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
      error: {
        bgColor: "bg-gray-50 dark:bg-gray-800",
        borderColor: "border-gray-300 dark:border-gray-700",
        iconColor: "text-gray-700 dark:text-gray-300",
        titleColor: "text-gray-900 dark:text-gray-100",
      },
    },
  },

  // 卡通风格
  cartoon: {
    id: "cartoon",
    name: "卡通风格",
    description: "活泼可爱，色彩鲜艳",
    preview: "🎭 卡通",
    config: {
      containerClass: "bg-white",
      overlayClass: "bg-purple-500 bg-opacity-20",
      iconClass: "w-14 h-14 animate-bounce",
      titleClass: "text-2xl font-black",
      messageClass: "text-gray-700 font-medium",
      buttonClass: "bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white font-bold transform hover:scale-105",
      borderRadius: "rounded-3xl",
      shadow: "shadow-2xl",
      animation: "transition-all duration-300",
    },
    typeStyles: {
      info: {
        bgColor: "bg-cyan-50",
        borderColor: "border-cyan-400 border-4",
        iconColor: "text-cyan-500",
        titleColor: "text-cyan-700",
      },
      success: {
        bgColor: "bg-green-50",
        borderColor: "border-green-400 border-4",
        iconColor: "text-green-500",
        titleColor: "text-green-700",
      },
      warning: {
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-400 border-4",
        iconColor: "text-yellow-600",
        titleColor: "text-yellow-700",
      },
      error: {
        bgColor: "bg-red-50",
        borderColor: "border-red-400 border-4",
        iconColor: "text-red-500",
        titleColor: "text-red-700",
      },
    },
  },

  // 专业风格
  professional: {
    id: "professional",
    name: "专业风格",
    description: "商务配色，正式严肃",
    preview: "💼 专业",
    config: {
      containerClass: "bg-white dark:bg-gray-800",
      overlayClass: "bg-gray-900 bg-opacity-60",
      iconClass: "w-11 h-11",
      titleClass: "text-lg font-semibold tracking-wide",
      messageClass: "text-gray-700 dark:text-gray-300",
      buttonClass: "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700",
      borderRadius: "rounded-md",
      shadow: "shadow-xl",
      animation: "transition-all",
    },
    typeStyles: {
      info: {
        bgColor: "bg-slate-50 dark:bg-slate-900/30",
        borderColor: "border-slate-300 dark:border-slate-700",
        iconColor: "text-slate-600 dark:text-slate-400",
        titleColor: "text-slate-900 dark:text-slate-100",
      },
      success: {
        bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
        borderColor: "border-emerald-300 dark:border-emerald-700",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        titleColor: "text-emerald-900 dark:text-emerald-100",
      },
      warning: {
        bgColor: "bg-amber-50 dark:bg-amber-900/30",
        borderColor: "border-amber-300 dark:border-amber-700",
        iconColor: "text-amber-600 dark:text-amber-400",
        titleColor: "text-amber-900 dark:text-amber-100",
      },
      error: {
        bgColor: "bg-rose-50 dark:bg-rose-900/30",
        borderColor: "border-rose-300 dark:border-rose-700",
        iconColor: "text-rose-600 dark:text-rose-400",
        titleColor: "text-rose-900 dark:text-rose-100",
      },
    },
  },

  // 科技风格
  tech: {
    id: "tech",
    name: "科技风格",
    description: "霓虹配色，未来感",
    preview: "🔮 科技",
    config: {
      containerClass: "bg-gray-900",
      overlayClass: "bg-black bg-opacity-70",
      iconClass: "w-13 h-13",
      titleClass: "text-xl font-bold uppercase tracking-widest",
      messageClass: "text-gray-300",
      buttonClass: "bg-cyan-500 hover:bg-cyan-600 text-black font-bold",
      borderRadius: "rounded-none",
      shadow: "shadow-cyan-500/50 shadow-2xl",
      animation: "transition-all duration-300",
    },
    typeStyles: {
      info: {
        bgColor: "bg-gray-900",
        borderColor: "border-cyan-500 border-2",
        iconColor: "text-cyan-400",
        titleColor: "text-cyan-400",
      },
      success: {
        bgColor: "bg-gray-900",
        borderColor: "border-green-500 border-2",
        iconColor: "text-green-400",
        titleColor: "text-green-400",
      },
      warning: {
        bgColor: "bg-gray-900",
        borderColor: "border-yellow-500 border-2",
        iconColor: "text-yellow-400",
        titleColor: "text-yellow-400",
      },
      error: {
        bgColor: "bg-gray-900",
        borderColor: "border-red-500 border-2",
        iconColor: "text-red-400",
        titleColor: "text-red-400",
      },
    },
  },

  // 柔和风格
  soft: {
    id: "soft",
    name: "柔和风格",
    description: "温暖配色，舒适柔和",
    preview: "🌸 柔和",
    config: {
      containerClass: "bg-white",
      overlayClass: "bg-pink-100 bg-opacity-50 backdrop-blur-sm",
      iconClass: "w-11 h-11",
      titleClass: "text-lg font-normal",
      messageClass: "text-gray-700",
      buttonClass: "bg-pink-100 hover:bg-pink-200 text-pink-700",
      borderRadius: "rounded-3xl",
      shadow: "shadow-lg",
      animation: "transition-all duration-300",
    },
    typeStyles: {
      info: {
        bgColor: "bg-blue-50/80",
        borderColor: "border-blue-100",
        iconColor: "text-blue-400",
        titleColor: "text-blue-700",
      },
      success: {
        bgColor: "bg-green-50/80",
        borderColor: "border-green-100",
        iconColor: "text-green-400",
        titleColor: "text-green-700",
      },
      warning: {
        bgColor: "bg-yellow-50/80",
        borderColor: "border-yellow-100",
        iconColor: "text-yellow-500",
        titleColor: "text-yellow-700",
      },
      error: {
        bgColor: "bg-red-50/80",
        borderColor: "border-red-100",
        iconColor: "text-red-400",
        titleColor: "text-red-700",
      },
    },
  },

  // 大字体风格
  large: {
    id: "large",
    name: "大字体风格",
    description: "字体放大，易于阅读",
    preview: "🔍 大字体",
    config: {
      containerClass: "bg-white dark:bg-gray-800",
      overlayClass: "bg-black bg-opacity-50",
      iconClass: "w-16 h-16",
      titleClass: "text-3xl font-bold",
      messageClass: "text-xl text-gray-700 dark:text-gray-300",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-xl py-3 px-8 dark:bg-blue-500 dark:hover:bg-blue-600",
      borderRadius: "rounded-xl",
      shadow: "shadow-2xl",
      animation: "transition-all",
    },
    typeStyles: {
      info: {
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-300 dark:border-blue-700",
        iconColor: "text-blue-500",
        titleColor: "text-blue-900 dark:text-blue-100",
      },
      success: {
        bgColor: "bg-green-50 dark:bg-green-900/20",
        borderColor: "border-green-300 dark:border-green-700",
        iconColor: "text-green-500",
        titleColor: "text-green-900 dark:text-green-100",
      },
      warning: {
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-300 dark:border-yellow-700",
        iconColor: "text-yellow-600",
        titleColor: "text-yellow-900 dark:text-yellow-100",
      },
      error: {
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-300 dark:border-red-700",
        iconColor: "text-red-500",
        titleColor: "text-red-900 dark:text-red-100",
      },
    },
  },
};

// 默认风格ID
export const DEFAULT_ALERT_STYLE = "default";

// 获取风格配置
export function getAlertStyle(styleId: string = DEFAULT_ALERT_STYLE): AlertStyle {
  return alertStyles[styleId] || alertStyles[DEFAULT_ALERT_STYLE];
}

// 获取所有风格列表
export function getAlertStylesList(): AlertStyle[] {
  return Object.values(alertStyles);
}
