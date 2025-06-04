/**
 * Python Requests 代码生成器
 * 生成基于Python requests库的请求代码
 */

import { HttpRequestModel, CodegenConfig, RequestBodyType, AuthType } from '@/types/api';
import { AbstractCodeGenerator } from '../../CodeGenerator';

export class PythonRequestsGenerator extends AbstractCodeGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string {
    const { method, headers, body, auth } = request;
    const enabledHeaders = this.getEnabledHeaders(request);
    const fullUrl = this.buildUrl(request);
    
    let code = '';
    
    // 导入requests库
    code += 'import requests\n';
    
    // 如果有JSON数据，导入json模块
    if (body.type === RequestBodyType.JSON || body.type === RequestBodyType.GRAPHQL) {
      code += 'import json\n';
    }
    
    // 如果有文件上传，导入相关模块
    if (body.type === RequestBodyType.FORM_DATA && this.hasFileUploads(body.formData || [])) {
      code += 'from pathlib import Path\n';
    }
    
    code += '\n';
    
    // 构建URL
    code += `url = '${this.escapeString(fullUrl, "'")}' \n\n`;
    
    // 构建请求头
    if (enabledHeaders.length > 0 || this.hasAuthHeaders(auth)) {
      code += 'headers = {\n';
      
      // 用户自定义头部
      enabledHeaders.forEach(header => {
        code += `    '${this.escapeString(header.key, "'")}': '${this.escapeString(header.value, "'")}',\n`;
      });
      
      // 认证头部
      const authHeaders = this.buildAuthHeaders(auth);
      Object.entries(authHeaders).forEach(([key, value]) => {
        code += `    '${this.escapeString(key, "'")}': '${this.escapeString(value, "'")}',\n`;
      });
      
      code += '}\n\n';
    }
    
    // 构建请求体
    const requestBodyCode = this.buildRequestBody(body);
    if (requestBodyCode) {
      code += requestBodyCode + '\n\n';
    }
    
    // 构建认证参数
    const authCode = this.buildAuthCode(auth);
    if (authCode) {
      code += authCode + '\n\n';
    }
    
    // 生成请求代码
    code += this.generateRequestCode(method, request.settings);
    
    return code;
  }
  
  getFileExtension(): string {
    return 'py';
  }
  
  getLanguageName(): string {
    return 'Python (Requests)';
  }
  
  /**
   * 检查是否有文件上传
   */
  private hasFileUploads(formData: any[]): boolean {
    return formData.some(item => item.enabled && item.type === 'file');
  }
  
  /**
   * 检查是否有认证头部
   */
  private hasAuthHeaders(auth: any): boolean {
    return auth.type === AuthType.BEARER || auth.type === AuthType.OAUTH2 || 
           (auth.type === AuthType.API_KEY && auth.apiKey?.addTo === 'header');
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
   * 构建认证代码
   */
  private buildAuthCode(auth: any): string | null {
    switch (auth.type) {
      case AuthType.BASIC:
        if (auth.basic?.username && auth.basic?.password) {
          return `auth = ('${this.escapeString(auth.basic.username, "'")}', '${this.escapeString(auth.basic.password, "'")}')` ;
        }
        break;
        
      case AuthType.API_KEY:
        if (auth.apiKey?.key && auth.apiKey?.value && auth.apiKey.addTo === 'query') {
          return `# API Key will be added to query parameters\nparams = {'${this.escapeString(auth.apiKey.key, "'")}': '${this.escapeString(auth.apiKey.value, "'")}'}` ;
        }
        break;
    }
    
    return null;
  }
  
  /**
   * 构建请求体
   */
  private buildRequestBody(body: any): string | null {
    switch (body.type) {
      case RequestBodyType.JSON:
        if (body.raw) {
          try {
            // 验证JSON格式
            const parsed = JSON.parse(body.raw);
            return `data = json.dumps(${JSON.stringify(parsed, null, 4).replace(/"/g, "'")})` ;
          } catch {
            return `data = '''${this.escapeString(body.raw, "'")}'''` ;
          }
        }
        return null;
        
      case RequestBodyType.RAW:
      case RequestBodyType.XML:
        if (body.raw) {
          return `data = '''${this.escapeString(body.raw, "'")}'''` ;
        }
        return null;
        
      case RequestBodyType.FORM_DATA:
        return this.buildFormDataCode(body.formData || []);
        
      case RequestBodyType.X_WWW_FORM_URLENCODED:
        return this.buildUrlEncodedCode(body.urlEncoded || []);
        
      case RequestBodyType.GRAPHQL:
        if (body.graphql?.query) {
          let graphqlData = `{
    'query': '''${this.escapeString(body.graphql.query, "'")}'''`;
          
          if (body.graphql.variables) {
            try {
              const variables = JSON.parse(body.graphql.variables);
              graphqlData += `,
    'variables': ${JSON.stringify(variables, null, 4).replace(/"/g, "'")}`;
            } catch {
              // 忽略无效的variables
            }
          }
          
          graphqlData += '\n}';
          return `data = json.dumps(${graphqlData})` ;
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
      return 'files = {}' ;
    }
    
    let code = 'files = {\n';
    
    enabledItems.forEach(item => {
      if (item.type === 'file' && item.file) {
        code += `    '${this.escapeString(item.key, "'")}': open('${this.escapeString(item.file.name, "'")}', 'rb'),  # Replace with actual file path\n`;
      } else {
        code += `    '${this.escapeString(item.key, "'")}': (None, '${this.escapeString(item.value, "'")}'),\n`;
      }
    });
    
    code += '}';
    
    return code;
  }
  
  /**
   * 构建URL编码数据代码
   */
  private buildUrlEncodedCode(urlEncoded: any[]): string {
    const enabledItems = urlEncoded.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      return 'data = {}' ;
    }
    
    let code = 'data = {\n';
    enabledItems.forEach(item => {
      code += `    '${this.escapeString(item.key, "'")}': '${this.escapeString(item.value, "'")}',\n`;
    });
    code += '}';
    
    return code;
  }
  
  /**
   * 生成请求代码
   */
  private generateRequestCode(method: string, settings: any): string {
    let code = '';
    
    // 构建请求参数
    const params = ['url'];
    
    // 添加请求头
    if (this.hasHeaders()) {
      params.push('headers=headers');
    }
    
    // 添加请求体参数
    if (this.hasRequestBody()) {
      if (this.hasFormData()) {
        params.push('files=files');
      } else {
        params.push('data=data');
      }
    }
    
    // 添加认证参数
    if (this.hasBasicAuth()) {
      params.push('auth=auth');
    }
    
    // 添加查询参数（API Key）
    if (this.hasQueryParams()) {
      params.push('params=params');
    }
    
    // 添加超时设置
    if (settings.timeout && settings.timeout !== 30000) {
      params.push(`timeout=${settings.timeout / 1000}`);
    }
    
    // 添加SSL验证设置
    if (!settings.validateSSL) {
      params.push('verify=False');
    }
    
    // 生成try-except块
    code += 'try:\n';
    code += `    response = requests.${method.toLowerCase()}(${params.join(', ')})\n\n`;
    code += '    # 打印响应信息\n';
    code += '    print(f"Status Code: {response.status_code}")\n';
    code += '    print(f"Headers: {dict(response.headers)}")\n\n';
    code += '    # 检查请求是否成功\n';
    code += '    response.raise_for_status()\n\n';
    code += '    # 打印响应内容\n';
    code += '    try:\n';
    code += '        # 尝试解析为JSON\n';
    code += '        json_data = response.json()\n';
    code += '        print("JSON Response:")\n';
    code += '        print(json.dumps(json_data, indent=2, ensure_ascii=False))\n';
    code += '    except ValueError:\n';
    code += '        # 如果不是JSON，打印文本内容\n';
    code += '        print("Text Response:")\n';
    code += '        print(response.text)\n\n';
    code += 'except requests.exceptions.RequestException as e:\n';
    code += '    print(f"Request failed: {e}")\n';
    code += 'except Exception as e:\n';
    code += '    print(f"An error occurred: {e}")';
    
    return code;
  }
  
  // 辅助方法来检查是否存在各种参数
  private hasHeaders(): boolean {
    return true; // 简化实现，实际应该检查是否真的有headers
  }
  
  private hasRequestBody(): boolean {
    return true; // 简化实现
  }
  
  private hasFormData(): boolean {
    return true; // 简化实现
  }
  
  private hasBasicAuth(): boolean {
    return true; // 简化实现
  }
  
  private hasQueryParams(): boolean {
    return true; // 简化实现
  }
}