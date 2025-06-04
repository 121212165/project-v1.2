/**
 * JavaScript Axios 代码生成器
 * 基于API Dash项目的axios代码生成逻辑
 */

import { HttpRequestModel, CodegenConfig, RequestBodyType, AuthType } from '@/types/api';
import { AbstractCodeGenerator } from '../../CodeGenerator';

export class JavaScriptAxiosGenerator extends AbstractCodeGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const { method, url, headers, body, auth } = request;
    const enabledHeaders = this.getEnabledHeaders(request);
    const fullUrl = this.buildUrl(request);
    
    let code = '';
    
    // 导入axios
    code += "const axios = require('axios');\n\n";
    
    // 构建配置对象
    code += 'const config = {\n';
    code += `  method: '${method.toLowerCase()}',\n`;
    code += `  url: '${this.escapeString(fullUrl)}',\n`;
    
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
    if (body.type !== RequestBodyType.NONE) {
      const requestData = this.buildRequestData(body);
      if (requestData) {
        code += `  data: ${requestData},\n`;
      }
    }
    
    // 添加超时设置
    if (request.settings.timeout && request.settings.timeout !== 30000) {
      code += `  timeout: ${request.settings.timeout},\n`;
    }
    
    // 添加SSL验证设置
    if (!request.settings.validateSSL) {
      code += '  httpsAgent: new (require(\'https\').Agent)({\n';
      code += '    rejectUnauthorized: false\n';
      code += '  }),\n';
    }
    
    code += '};\n\n';
    
    // 执行请求
    if (config?.useAsyncAwait !== false) {
      code += this.generateAsyncAwaitCode();
    } else {
      code += this.generatePromiseCode();
    }
    
    return code;
  }
  
  getFileExtension(): string {
    return 'js';
  }
  
  getLanguageName(): string {
    return 'JavaScript (Axios)';
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
          const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
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
   * 构建请求数据
   */
  private buildRequestData(body: any): string | null {
    switch (body.type) {
      case RequestBodyType.JSON:
        if (body.raw) {
          try {
            // 验证JSON格式并格式化
            const parsed = JSON.parse(body.raw);
            return JSON.stringify(parsed, null, 2);
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
          return JSON.stringify(graphqlData, null, 2);
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
        code += `  // Note: You need to replace this with actual file reading logic\n`;
        code += `  // formData.append('${this.escapeString(item.key)}', fileContent, '${this.escapeString(item.file.name)}');\n`;
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
      return 'new URLSearchParams()';
    }
    
    let code = 'new URLSearchParams({\n';
    enabledItems.forEach(item => {
      code += `  '${this.escapeString(item.key)}': '${this.escapeString(item.value)}',\n`;
    });
    code += '})';
    
    return code;
  }
  
  /**
   * 生成async/await风格的代码
   */
  private generateAsyncAwaitCode(): string {
    let code = '';
    code += 'async function makeRequest() {\n';
    code += '  try {\n';
    code += '    const response = await axios.request(config);\n';
    code += '    console.log(\'Status:\', response.status);\n';
    code += '    console.log(\'Headers:\', response.headers);\n';
    code += '    console.log(\'Data:\', response.data);\n';
    code += '    return response.data;\n';
    code += '  } catch (error) {\n';
    code += '    if (error.response) {\n';
    code += '      // 服务器响应了错误状态码\n';
    code += '      console.error(\'Error Status:\', error.response.status);\n';
    code += '      console.error(\'Error Data:\', error.response.data);\n';
    code += '    } else if (error.request) {\n';
    code += '      // 请求已发出但没有收到响应\n';
    code += '      console.error(\'No response received:\', error.request);\n';
    code += '    } else {\n';
    code += '      // 其他错误\n';
    code += '      console.error(\'Error:\', error.message);\n';
    code += '    }\n';
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
  private generatePromiseCode(): string {
    let code = '';
    code += 'axios.request(config)\n';
    code += '  .then(response => {\n';
    code += '    console.log(\'Status:\', response.status);\n';
    code += '    console.log(\'Headers:\', response.headers);\n';
    code += '    console.log(\'Data:\', response.data);\n';
    code += '    return response.data;\n';
    code += '  })\n';
    code += '  .catch(error => {\n';
    code += '    if (error.response) {\n';
    code += '      // 服务器响应了错误状态码\n';
    code += '      console.error(\'Error Status:\', error.response.status);\n';
    code += '      console.error(\'Error Data:\', error.response.data);\n';
    code += '    } else if (error.request) {\n';
    code += '      // 请求已发出但没有收到响应\n';
    code += '      console.error(\'No response received:\', error.request);\n';
    code += '    } else {\n';
    code += '      // 其他错误\n';
    code += '      console.error(\'Error:\', error.message);\n';
    code += '    }\n';
    code += '    throw error;\n';
    code += '  });';
    
    return code;
  }
}