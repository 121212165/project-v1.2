/**
 * 工具函数集合
 * 提供各种通用的辅助函数
 */

import { HttpMethod, RequestBodyType, AuthType } from '@/types/api';

/**
 * 格式化字节大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 格式化持续时间
 * @param ms 毫秒数
 * @returns 格式化后的字符串
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${Math.round(ms)}`;
  }
  
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

/**
 * 生成唯一ID
 * @returns 唯一标识符
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 生成UUID v4
 * @returns UUID字符串
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 拷贝后的对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  
  return obj;
};

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
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
 * @param func 要节流的函数
 * @param limit 限制时间（毫秒）
 * @returns 节流后的函数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * 验证URL格式
 * @param url URL字符串
 * @returns 是否为有效URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 验证JSON格式
 * @param str JSON字符串
 * @returns 是否为有效JSON
 */
export const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

/**
 * 格式化JSON字符串
 * @param str JSON字符串
 * @param indent 缩进空格数
 * @returns 格式化后的JSON字符串
 */
export const formatJson = (str: string, indent: number = 2): string => {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, indent);
  } catch {
    return str;
  }
};

/**
 * 压缩JSON字符串
 * @param str JSON字符串
 * @returns 压缩后的JSON字符串
 */
export const minifyJson = (str: string): string => {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed);
  } catch {
    return str;
  }
};

/**
 * 解析查询参数
 * @param url URL字符串
 * @returns 查询参数对象
 */
export const parseQueryParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch {
    // 如果URL无效，尝试解析查询字符串部分
    const queryString = url.includes('?') ? url.split('?')[1] : '';
    if (queryString) {
      queryString.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key) {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }
  }
  
  return params;
};

/**
 * 构建查询字符串
 * @param params 查询参数对象
 * @returns 查询字符串
 */
export const buildQueryString = (params: Record<string, string>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  
  return searchParams.toString();
};

/**
 * 合并URL和查询参数
 * @param baseUrl 基础URL
 * @param params 查询参数
 * @returns 完整URL
 */
export const buildUrl = (baseUrl: string, params?: Record<string, string>): string => {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = buildQueryString(params);
  if (!queryString) {
    return baseUrl;
  }
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryString}`;
};

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : '';
};

/**
 * 获取MIME类型
 * @param filename 文件名
 * @returns MIME类型
 */
export const getMimeType = (filename: string): string => {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    // 文本
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
    
    // 图片
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    
    // 文档
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // 压缩
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    
    // 音视频
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * 转换驼峰命名
 * @param str 字符串
 * @returns 驼峰命名字符串
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/[-_\s]+(\w)/g, (_, letter) => letter.toUpperCase());
};

/**
 * 转换蛇形命名
 * @param str 字符串
 * @returns 蛇形命名字符串
 */
export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
};

/**
 * 转换短横线命名
 * @param str 字符串
 * @returns 短横线命名字符串
 */
export const toKebabCase = (str: string): string => {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
};

/**
 * 转换首字母大写
 * @param str 字符串
 * @returns 首字母大写字符串
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * 转换标题格式
 * @param str 字符串
 * @returns 标题格式字符串
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * 截断字符串
 * @param str 字符串
 * @param length 最大长度
 * @param suffix 后缀
 * @returns 截断后的字符串
 */
export const truncate = (str: string, length: number, suffix: string = '...'): string => {
  if (str.length <= length) {
    return str;
  }
  return str.slice(0, length - suffix.length) + suffix;
};

/**
 * 转义HTML字符
 * @param str 字符串
 * @returns 转义后的字符串
 */
export const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return str.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
};

/**
 * 转义正则表达式字符
 * @param str 字符串
 * @returns 转义后的字符串
 */
export const escapeRegExp = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 获取随机颜色
 * @returns 十六进制颜色值
 */
export const getRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

/**
 * 获取对比色
 * @param hexColor 十六进制颜色值
 * @returns 对比色（黑色或白色）
 */
export const getContrastColor = (hexColor: string): string => {
  const color = hexColor.replace('#', '');
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

/**
 * 下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME类型
 */
export const downloadFile = (
  content: string | Blob,
  filename: string,
  mimeType?: string
): void => {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType || 'text/plain' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 读取文件内容
 * @param file 文件对象
 * @returns Promise<string>
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

/**
 * 读取文件为Base64
 * @param file 文件对象
 * @returns Promise<string>
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

/**
 * 获取HTTP方法颜色
 * @param method HTTP方法
 * @returns 颜色值
 */
export const getMethodColor = (method: HttpMethod): string => {
  const colors = {
    GET: '#52c41a',
    POST: '#1890ff',
    PUT: '#fa8c16',
    DELETE: '#ff4d4f',
    PATCH: '#722ed1',
    HEAD: '#13c2c2',
    OPTIONS: '#eb2f96',
  };
  return colors[method] || '#666666';
};

/**
 * 获取状态码颜色
 * @param status 状态码
 * @returns 颜色值
 */
export const getStatusColor = (status: number): string => {
  if (status >= 200 && status < 300) return '#52c41a';
  if (status >= 300 && status < 400) return '#fa8c16';
  if (status >= 400 && status < 500) return '#ff4d4f';
  if (status >= 500) return '#ff4d4f';
  return '#666666';
};

/**
 * 获取请求体类型显示名称
 * @param type 请求体类型
 * @returns 显示名称
 */
export const getBodyTypeLabel = (type: RequestBodyType): string => {
  const labels = {
    [RequestBodyType.NONE]: '无',
    [RequestBodyType.JSON]: 'JSON',
    [RequestBodyType.RAW]: '原始文本',
    [RequestBodyType.XML]: 'XML',
    [RequestBodyType.FORM_DATA]: 'Form Data',
    [RequestBodyType.URL_ENCODED]: 'URL Encoded',
    [RequestBodyType.BINARY]: '二进制',
    [RequestBodyType.GRAPHQL]: 'GraphQL',
  };
  return labels[type] || '未知';
};

/**
 * 获取认证类型显示名称
 * @param type 认证类型
 * @returns 显示名称
 */
export const getAuthTypeLabel = (type: AuthType): string => {
  const labels = {
    [AuthType.NONE]: '无认证',
    [AuthType.BASIC]: 'Basic Auth',
    [AuthType.BEARER]: 'Bearer Token',
    [AuthType.API_KEY]: 'API Key',
    [AuthType.OAUTH2]: 'OAuth 2.0',
  };
  return labels[type] || '未知';
};

/**
 * 本地存储工具
 */
export const storage = {
  /**
   * 设置本地存储
   * @param key 键
   * @param value 值
   */
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to set localStorage:', error);
    }
  },
  
  /**
   * 获取本地存储
   * @param key 键
   * @param defaultValue 默认值
   * @returns 存储的值
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Failed to get localStorage:', error);
      return defaultValue || null;
    }
  },
  
  /**
   * 删除本地存储
   * @param key 键
   */
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove localStorage:', error);
    }
  },
  
  /**
   * 清空本地存储
   */
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};

/**
 * 会话存储工具
 */
export const sessionStorage = {
  /**
   * 设置会话存储
   * @param key 键
   * @param value 值
   */
  set: (key: string, value: any): void => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to set sessionStorage:', error);
    }
  },
  
  /**
   * 获取会话存储
   * @param key 键
   * @param defaultValue 默认值
   * @returns 存储的值
   */
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Failed to get sessionStorage:', error);
      return defaultValue || null;
    }
  },
  
  /**
   * 删除会话存储
   * @param key 键
   */
  remove: (key: string): void => {
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove sessionStorage:', error);
    }
  },
  
  /**
   * 清空会话存储
   */
  clear: (): void => {
    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error);
    }
  },
};