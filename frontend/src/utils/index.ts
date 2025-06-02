import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化时间
 */
export const formatTime = {
  // 相对时间
  fromNow: (date: string | Date) => dayjs(date).fromNow(),
  
  // 标准格式
  standard: (date: string | Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
  
  // 日期格式
  date: (date: string | Date) => dayjs(date).format('YYYY-MM-DD'),
  
  // 时间格式
  time: (date: string | Date) => dayjs(date).format('HH:mm:ss')
};

/**
 * 文件处理工具
 */
export const fileUtils = {
  // 格式化文件大小
  formatSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // 检查文件类型
  isImage: (file: File): boolean => {
    return file.type.startsWith('image/');
  },
  
  // 获取文件扩展名
  getExtension: (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  },
  
  // 验证图片文件
  validateImage: (file: File, maxSize = 5 * 1024 * 1024): { valid: boolean; error?: string } => {
    if (!fileUtils.isImage(file)) {
      return { valid: false, error: '请选择图片文件' };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: `文件大小不能超过 ${fileUtils.formatSize(maxSize)}` };
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: '仅支持 JPEG、PNG、GIF、WebP 格式的图片' };
    }
    
    return { valid: true };
  },
  
  // 文件转Base64
  toBase64: (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};

/**
 * 文本处理工具
 */
export const textUtils = {
  // 截断文本
  truncate: (text: string, maxLength: number, suffix = '...'): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  },
  
  // 高亮关键词
  highlight: (text: string, keywords: string[], className = 'highlight'): string => {
    if (!keywords.length) return text;
    
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
  },
  
  // 计算字符数（中文算2个字符）
  getCharCount: (text: string): number => {
    return text.replace(/[\u4e00-\u9fa5]/g, 'aa').length;
  },
  
  // 验证文本长度
  validateLength: (text: string, minLength = 1, maxLength = 10000): { valid: boolean; error?: string } => {
    const length = text.trim().length;
    
    if (length < minLength) {
      return { valid: false, error: `内容不能少于 ${minLength} 个字符` };
    }
    
    if (length > maxLength) {
      return { valid: false, error: `内容不能超过 ${maxLength} 个字符` };
    }
    
    return { valid: true };
  }
};

/**
 * 颜色工具
 */
export const colorUtils = {
  // 根据严重程度获取颜色
  getSeverityColor: (severity: 'low' | 'medium' | 'high'): string => {
    const colors = {
      low: '#52c41a',    // 绿色
      medium: '#faad14', // 橙色
      high: '#ff4d4f'    // 红色
    };
    return colors[severity];
  },
  
  // 根据状态获取颜色
  getStatusColor: (status: 'compliant' | 'warning' | 'violation'): string => {
    const colors = {
      compliant: '#52c41a',  // 绿色
      warning: '#faad14',    // 橙色
      violation: '#ff4d4f'   // 红色
    };
    return colors[status];
  }
};

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
};

/**
 * 复制到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * 生成随机ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * 下载文件
 */
export const downloadFile = (content: string, filename: string, type = 'text/plain'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};