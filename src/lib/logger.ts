/**
 * 统一日志工具
 * 
 * 生产环境自动静默 debug/info 级别日志，仅保留 warn/error
 * 开发环境保留所有级别日志
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDevelopment = process.env.NODE_ENV === 'development';
const MIN_LOG_LEVEL: LogLevel = isDevelopment ? 'debug' : 'warn';

function formatMessage(module: string, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${module}]`;
  const interpolated = typeof message === 'string' 
    ? message.replace(/\{(\d+)\}/g, (_, i) => String(args[i] ?? ''))
    : String(message);
  return `${prefix} ${interpolated}`;
}

export const logger = {
  debug(module: string, message: string, ...args: unknown[]) {
    if (LOG_LEVELS['debug'] >= LOG_LEVELS[MIN_LOG_LEVEL]) {
      console.debug(formatMessage(module, message, ...args), ...args);
    }
  },

  info(module: string, message: string, ...args: unknown[]) {
    if (LOG_LEVELS['info'] >= LOG_LEVELS[MIN_LOG_LEVEL]) {
      console.info(formatMessage(module, message, ...args), ...args);
    }
  },

  warn(module: string, message: string, ...args: unknown[]) {
    console.warn(formatMessage(module, message, ...args), ...args);
  },

  error(module: string, message: string, ...args: unknown[]) {
    console.error(formatMessage(module, message, ...args), ...args);
  },
};
