/**
 * cURL 代码生成器
 * 生成cURL命令行请求代码
 */

import { HttpRequestModel, CodegenConfig, RequestBodyType, AuthType } from '@/types/api';
import { AbstractCodeGenerator } from '../../CodeGenerator';

export class CurlGenerator extends AbstractCodeGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const { method, headers, body, auth } = request;
    const enabledHeaders = this.getEnabledHeaders(request);
    const fullUrl = this.buildUrl(request);
    
    let curlCommand = 'curl';
    
    // 添加请求方法
    if (method !== 'GET') {
      curlCommand += ` -X ${method}`;
    }
    
    // 添加URL
    curlCommand += ` '${this.escapeShellString(fullUrl)}'`;
    
    // 添加请求头
    const allHeaders = this.getAllHeaders(enabledHeaders, auth, body);
    allHeaders.forEach(header => {
      curlCommand += ` \\
  -H '${this.escapeShellString(header.key)}: ${this.escapeShellString(header.value)}'`;
    });
    
    // 添加认证
    const authOption = this.buildAuthOption(auth);
    if (authOption) {
      curlCommand += ` \\
  ${authOption}`;
    }
    
    // 添加请求体
    const bodyOption = this.buildBodyOption(body);
    if (bodyOption) {
      curlCommand += ` \\
  ${bodyOption}`;
    }
    
    // 添加其他选项
    const additionalOptions = this.buildAdditionalOptions(request.settings);
    if (additionalOptions) {
      curlCommand += ` \\
  ${additionalOptions}`;
    }
    
    // 添加详细输出选项
    if (config?.verbose !== false) {
      curlCommand += ` \\
  -v`;
    }
    
    return curlCommand;
  }
  
  getFileExtension(): string {
    return 'sh';
  }
  
  getLanguageName(): string {
    return 'cURL';
  }
  
  /**
   * 获取所有请求头（包括认证头和Content-Type）
   */
  private getAllHeaders(userHeaders: any[], auth: any, body: any): Array<{key: string, value: string}> {
    const headers: Array<{key: string, value: string}> = [];
    
    // 用户自定义头部
    userHeaders.forEach(header => {
      headers.push({ key: header.key, value: header.value });
    });
    
    // 认证头部
    const authHeaders = this.buildAuthHeaders(auth);
    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.push({ key, value });
    });
    
    // Content-Type头部
    const contentType = this.getContentType(body.type);
    if (contentType && !headers.some(h => h.key.toLowerCase() === 'content-type')) {
      headers.push({ key: 'Content-Type', value: contentType });
    }
    
    return headers;
  }
  
  /**
   * 构建认证头部
   */
  private buildAuthHeaders(auth: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    switch (auth.type) {
      case AuthType.BEARER:
        if (auth.bearer?.token) {
          headers['Authorization'] = `Bearer ${auth.bearer.token}`;
        }
        break;
        
      case AuthType.API_KEY:
        if (auth.apiKey?.key && auth.apiKey?.value && auth.apiKey.addTo === 'header') {
          headers[auth.apiKey.key] = auth.apiKey.value;
        }
        break;
        
      case AuthType.OAUTH2:
        if (auth.oauth2?.accessToken) {
          const tokenType = auth.oauth2.tokenType || 'Bearer';
          headers['Authorization'] = `${tokenType} ${auth.oauth2.accessToken}`;
        }
        break;
    }
    
    return headers;
  }
  
  /**
   * 构建认证选项
   */
  private buildAuthOption(auth: any): string | null {
    switch (auth.type) {
      case AuthType.BASIC:
        if (auth.basic?.username && auth.basic?.password) {
          return `-u '${this.escapeShellString(auth.basic.username)}:${this.escapeShellString(auth.basic.password)}'`;
        }
        break;
    }
    
    return null;
  }
  
  /**
   * 构建请求体选项
   */
  private buildBodyOption(body: any): string | null {
    switch (body.type) {
      case RequestBodyType.JSON:
        if (body.raw) {
          try {
            // 验证并格式化JSON
            const parsed = JSON.parse(body.raw);
            const jsonString = JSON.stringify(parsed);
            return `-d '${this.escapeShellString(jsonString)}'`;
          } catch {
            return `-d '${this.escapeShellString(body.raw)}'`;
          }
        }
        return null;
        
      case RequestBodyType.RAW:
      case RequestBodyType.XML:
        if (body.raw) {
          return `-d '${this.escapeShellString(body.raw)}'`;
        }
        return null;
        
      case RequestBodyType.FORM_DATA:
        return this.buildFormDataOption(body.formData || []);
        
      case RequestBodyType.X_WWW_FORM_URLENCODED:
        return this.buildUrlEncodedOption(body.urlEncoded || []);
        
      case RequestBodyType.GRAPHQL:
        if (body.graphql?.query) {
          const graphqlData: any = { query: body.graphql.query };
          if (body.graphql.variables) {
            try {
              graphqlData.variables = JSON.parse(body.graphql.variables);
            } catch {
              // 忽略无效的variables
            }
          }
          const jsonString = JSON.stringify(graphqlData);
          return `-d '${this.escapeShellString(jsonString)}'`;
        }
        return null;
        
      case RequestBodyType.BINARY:
        if (body.binary?.filename) {
          return `--data-binary '@${this.escapeShellString(body.binary.filename)}'`;
        }
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * 构建FormData选项
   */
  private buildFormDataOption(formData: any[]): string | null {
    const enabledItems = formData.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      return null;
    }
    
    const formOptions: string[] = [];
    
    enabledItems.forEach(item => {
      if (item.type === 'file' && item.file) {
        formOptions.push(`-F '${this.escapeShellString(item.key)}=@${this.escapeShellString(item.file.name)}'`);
      } else {
        formOptions.push(`-F '${this.escapeShellString(item.key)}=${this.escapeShellString(item.value)}'`);
      }
    });
    
    return formOptions.join(` \\
      \n`);
  }
  
  /**
   * 构建URL编码选项
   */
  private buildUrlEncodedOption(urlEncoded: any[]): string | null {
    const enabledItems = urlEncoded.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      return null;
    }
    
    const params = enabledItems.map(item => 
      `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`
    ).join('&');
    
    return `-d '${this.escapeShellString(params)}'`;
  }
  
  /**
   * 构建额外选项
   */
  private buildAdditionalOptions(settings: any): string | null {
    const options: string[] = [];
    
    // 超时设置
    if (settings.timeout && settings.timeout !== 30000) {
      options.push(`--max-time ${Math.ceil(settings.timeout / 1000)}`);
    }
    
    // SSL验证设置
    if (!settings.validateSSL) {
      options.push('-k');
    }
    
    // 跟随重定向
    if (settings.followRedirects) {
      options.push('-L');
    }
    
    // 显示响应头
    options.push('-i');
    
    // 静默模式（不显示进度条）
    options.push('-s');
    
    return options.length > 0 ? options.join(' ') : null;
  }
  
  /**
   * 获取Content-Type
   */
  private getContentType(bodyType: RequestBodyType): string | null {
    switch (bodyType) {
      case RequestBodyType.JSON:
      case RequestBodyType.GRAPHQL:
        return 'application/json';
      case RequestBodyType.XML:
        return 'application/xml';
      case RequestBodyType.X_WWW_FORM_URLENCODED:
        return 'application/x-www-form-urlencoded';
      case RequestBodyType.RAW:
        return 'text/plain';
      default:
        return null;
    }
  }
  
  /**
   * 转义Shell字符串
   */
  private escapeShellString(str: string): string {
    // 转义单引号和反斜杠
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\"'\"'");
  }
}

/**
 * Windows批处理文件版本的cURL生成器
 */
export class CurlBatchGenerator extends CurlGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const curlCommand = super.generate(request, config);
    
    // 将Unix风格的行继续符替换为Windows批处理风格
    const windowsCommand = curlCommand
      .replace(/\\\\/g, '^')
      .replace(/'/g, '"');
    
    return `@echo off\n${windowsCommand}\npause`;
  }
  
  getFileExtension(): string {
    return 'bat';
  }
  
  getLanguageName(): string {
    return 'cURL (Windows Batch)';
  }
}

/**
 * PowerShell版本的cURL生成器
 */
export class CurlPowerShellGenerator extends CurlGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const curlCommand = super.generate(request, config);
    
    // 将Unix风格的命令转换为PowerShell风格
    const powershellCommand = curlCommand
      .replace(/\\\\/g, '`')
      .replace(/'/g, '"');
    
    return `# PowerShell cURL command\n${powershellCommand}`;
  }
  
  getFileExtension(): string {
    return 'ps1';
  }
  
  getLanguageName(): string {
    return 'cURL (PowerShell)';
  }
}