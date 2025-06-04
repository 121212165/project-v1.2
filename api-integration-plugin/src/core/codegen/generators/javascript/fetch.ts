/**
 * JavaScript Fetch API 代码生成器
 * 生成基于原生fetch API的请求代码
 */

import { HttpRequestModel, CodegenConfig, RequestBodyType, AuthType } from '@/types/api';
import { AbstractCodeGenerator } from '../../CodeGenerator';

export class JavaScriptFetchGenerator extends AbstractCodeGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const { method, headers, body, auth } = request;
    const enabledHeaders = this.getEnabledHeaders(request);
    const fullUrl = this.buildUrl(request);
    
    let code = '';
    
    // 构建fetch选项
    code += 'const options = {\n';
    code += `  method: '${method.toUpperCase()}',\n`;
    
    // 添加请求头
    if (enabledHeaders.length > 0 || this.hasAuthHeaders(auth)) {
      code += '  headers: {\n';
      
      // 用户自定义头部
      enabledHeaders.forEach(header => {
        code += `    '${this.escapeString(header.key)}': '${this.escapeString(header.value)}',\n`;
      });
      
      // 认证头部
      const authHeaders = this.buildAuthHeaders(auth);
      Object.entries(authHeaders).forEach(([key, value]) => {
        code += `    '${this.escapeString(key)}': '${this.escapeString(value)}',\n`;
      });
      
      code += '  },\n';
    }
    
    // 添加请求体
    if (body.type !== RequestBodyType.NONE && method !== 'GET') {
      const requestBody = this.buildRequestBody(body);
      if (requestBody) {
        code += `  body: ${requestBody},\n`;
      }
    }
    
    code += '};\n\n';
    
    // 生成请求代码
    if (config?.useAsyncAwait !== false) {
      code += this.generateAsyncAwaitCode(fullUrl);
    } else {
      code += this.generatePromiseCode(fullUrl);
    }
    
    return code;
  }
  
  getFileExtension(): string {
    return 'js';
  }
  
  getLanguageName(): string {
    return 'JavaScript (Fetch)';
  }
  
  /**
   * 检查是否有认证头部
   */
  private hasAuthHeaders(auth: any): boolean {
    return auth.type !== AuthType.NONE && auth.type !== AuthType.API_KEY;
  }
  
  /**
   * 构建认证头部
   */
  private buildAuthHeaders(auth: any): Record<string, string> {
    const headers: Record<string, string> = {};
    
    switch (auth.type) {
      case AuthType.BASIC:
        if (auth.basic?.username && auth.basic?.password) {
          const credentials = btoa(`${auth.basic.username}:${auth.basic.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
        
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
   * 构建请求体
   */
  private buildRequestBody(body: any): string | null {
    switch (body.type) {
      case RequestBodyType.JSON:
        if (body.raw) {
          try {
            // 验证JSON格式并格式化
            const parsed = JSON.parse(body.raw);
            return `JSON.stringify(${JSON.stringify(parsed, null, 2)})`;
          } catch {
            return `'${this.escapeString(body.raw)}'`;
          }
        }
        return null;
        
      case RequestBodyType.RAW:
      case RequestBodyType.XML:
        return body.raw ? `'${this.escapeString(body.raw)}'` : null;
        
      case RequestBodyType.FORM_DATA:
        return this.buildFormDataCode(body.formData || []);
        
      case RequestBodyType.X_WWW_FORM_URLENCODED:
        return this.buildUrlEncodedCode(body.urlEncoded || []);
        
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
          return `JSON.stringify(${JSON.stringify(graphqlData, null, 2)})`;
        }
        return null;
        
      default:
        return null;
    }
  }
  
  /**
   * 构建FormData代码
   */
  private buildFormDataCode(formData: any[]): string {
    const enabledItems = formData.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      return 'new FormData()';
    }
    
    let code = '(() => {\n';
    code += '  const formData = new FormData();\n';
    
    enabledItems.forEach(item => {
      if (item.type === 'file' && item.file) {
        code += `  // Note: You need to replace this with actual file object\n`;
        code += `  // const file = document.getElementById('fileInput').files[0];\n`;
        code += `  // formData.append('${this.escapeString(item.key)}', file);\n`;
      } else {
        code += `  formData.append('${this.escapeString(item.key)}', '${this.escapeString(item.value)}');\n`;
      }
    });
    
    code += '  return formData;\n';
    code += '})()';
    
    return code;
  }
  
  /**
   * 构建URL编码数据代码
   */
  private buildUrlEncodedCode(urlEncoded: any[]): string {
    const enabledItems = urlEncoded.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      return 'new URLSearchParams().toString()';
    }
    
    let code = 'new URLSearchParams({\n';
    enabledItems.forEach(item => {
      code += `  '${this.escapeString(item.key)}': '${this.escapeString(item.value)}',\n`;
    });
    code += '}).toString()';
    
    return code;
  }
  
  /**
   * 生成async/await风格的代码
   */
  private generateAsyncAwaitCode(url: string): string {
    let code = '';
    code += 'async function makeRequest() {\n';
    code += '  try {\n';
    code += `    const response = await fetch('${this.escapeString(url)}', options);\n\n`;
    code += '    // 检查响应状态\n';
    code += '    if (!response.ok) {\n';
    code += '      throw new Error(`HTTP error! status: ${response.status}`);\n';
    code += '    }\n\n';
    code += '    // 获取响应头信息\n';
    code += '    console.log(\'Status:\', response.status);\n';
    code += '    console.log(\'Status Text:\', response.statusText);\n';
    code += '    console.log(\'Headers:\', Object.fromEntries(response.headers.entries()));\n\n';
    code += '    // 根据Content-Type解析响应体\n';
    code += '    const contentType = response.headers.get(\'content-type\');\n';
    code += '    let data;\n\n';
    code += '    if (contentType && contentType.includes(\'application/json\')) {\n';
    code += '      data = await response.json();\n';
    code += '    } else if (contentType && contentType.includes(\'text/\')) {\n';
    code += '      data = await response.text();\n';
    code += '    } else {\n';
    code += '      data = await response.blob();\n';
    code += '    }\n\n';
    code += '    console.log(\'Data:\', data);\n';
    code += '    return data;\n\n';
    code += '  } catch (error) {\n';
    code += '    console.error(\'Error:\', error);\n';
    code += '    throw error;\n';
    code += '  }\n';
    code += '}\n\n';
    code += '// 调用函数\n';
    code += 'makeRequest();';
    
    return code;
  }
  
  /**
   * 生成Promise风格的代码
   */
  private generatePromiseCode(url: string): string {
    let code = '';
    code += `fetch('${this.escapeString(url)}', options)\n`;
    code += '  .then(response => {\n';
    code += '    // 检查响应状态\n';
    code += '    if (!response.ok) {\n';
    code += '      throw new Error(`HTTP error! status: ${response.status}`);\n';
    code += '    }\n\n';
    code += '    // 获取响应头信息\n';
    code += '    console.log(\'Status:\', response.status);\n';
    code += '    console.log(\'Status Text:\', response.statusText);\n';
    code += '    console.log(\'Headers:\', Object.fromEntries(response.headers.entries()));\n\n';
    code += '    // 根据Content-Type解析响应体\n';
    code += '    const contentType = response.headers.get(\'content-type\');\n\n';
    code += '    if (contentType && contentType.includes(\'application/json\')) {\n';
    code += '      return response.json();\n';
    code += '    } else if (contentType && contentType.includes(\'text/\')) {\n';
    code += '      return response.text();\n';
    code += '    } else {\n';
    code += '      return response.blob();\n';
    code += '    }\n';
    code += '  })\n';
    code += '  .then(data => {\n';
    code += '    console.log(\'Data:\', data);\n';
    code += '    return data;\n';
    code += '  })\n';
    code += '  .catch(error => {\n';
    code += '    console.error(\'Error:\', error);\n';
    code += '    throw error;\n';
    code += '  });';
    
    return code;
  }
}