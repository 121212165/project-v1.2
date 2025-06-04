/**
 * 代码生成器 - 核心代码生成模块
 * 基于API Dash项目的代码生成逻辑，支持多种编程语言
 */

import { HttpRequestModel, CodegenLanguage, CodegenConfig } from '@/types/api';
import { generateId } from '@/utils/helpers';

// 导入各语言的代码生成器
import { JavaScriptAxiosGenerator } from './generators/javascript/axios';
import { JavaScriptFetchGenerator } from './generators/javascript/fetch';
import { PythonRequestsGenerator } from './generators/python/requests';
import { CurlGenerator } from './generators/curl/curl';
// 其他语言生成器待实现
// import { JavaOkHttpGenerator } from './generators/java/okhttp';
// import { CSharpHttpClientGenerator } from './generators/csharp/httpclient';
// import { GoHttpGenerator } from './generators/go/http';
// import { RubyNetHttpGenerator } from './generators/ruby/nethttp';
// import { PHPCurlGenerator } from './generators/php/curl';
// import { SwiftURLSessionGenerator } from './generators/swift/urlsession';
// import { KotlinOkHttpGenerator } from './generators/kotlin/okhttp';
// import { RustReqwestGenerator } from './generators/rust/reqwest';

export interface CodeGeneratorResult {
  id: string;
  language: CodegenLanguage;
  code: string;
  filename: string;
  timestamp: string;
  requestId: string;
}

export interface BaseCodeGenerator {
  generate(request: HttpRequestModel, config?: CodegenConfig): string;
  getFileExtension(): string;
  getLanguageName(): string;
}

export class CodeGenerator {
  private generators: Map<CodegenLanguage, BaseCodeGenerator> = new Map();

  constructor() {
    this.initializeGenerators();
  }

  /**
   * 初始化所有代码生成器
   */
  private initializeGenerators(): void {
    // JavaScript
    this.generators.set(CodegenLanguage.JAVASCRIPT_AXIOS, new JavaScriptAxiosGenerator());
    this.generators.set(CodegenLanguage.JAVASCRIPT_FETCH, new JavaScriptFetchGenerator());
    
    // Python
    this.generators.set(CodegenLanguage.PYTHON_REQUESTS, new PythonRequestsGenerator());
    
    // cURL
    this.generators.set(CodegenLanguage.CURL, new CurlGenerator());
    
    // 其他语言生成器待实现
    // Java
    // this.generators.set(CodegenLanguage.JAVA_OKHTTP, new JavaOkHttpGenerator());
    
    // C#
    // this.generators.set(CodegenLanguage.CSHARP_HTTPCLIENT, new CSharpHttpClientGenerator());
    
    // Go
    // this.generators.set(CodegenLanguage.GO_HTTP, new GoHttpGenerator());
    
    // Ruby
    // this.generators.set(CodegenLanguage.RUBY_NETHTTP, new RubyNetHttpGenerator());
    
    // PHP
    // this.generators.set(CodegenLanguage.PHP_CURL, new PHPCurlGenerator());
    
    // Swift
    // this.generators.set(CodegenLanguage.SWIFT_URLSESSION, new SwiftURLSessionGenerator());
    
    // Kotlin
    // this.generators.set(CodegenLanguage.KOTLIN_OKHTTP, new KotlinOkHttpGenerator());
    
    // Rust
    // this.generators.set(CodegenLanguage.RUST_REQWEST, new RustReqwestGenerator());
  }

  /**
   * 生成指定语言的代码
   */
  generateCode(
    request: HttpRequestModel,
    language: CodegenLanguage,
    config?: CodegenConfig
  ): CodeGeneratorResult {
    const generator = this.generators.get(language);
    
    if (!generator) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const code = generator.generate(request, config);
    const filename = this.generateFilename(request.name, generator.getFileExtension());

    return {
      id: generateId(),
      language,
      code,
      filename,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  }

  /**
   * 批量生成多种语言的代码
   */
  generateMultipleLanguages(
    request: HttpRequestModel,
    languages: CodegenLanguage[],
    config?: CodegenConfig
  ): CodeGeneratorResult[] {
    return languages.map(language => 
      this.generateCode(request, language, config)
    );
  }

  /**
   * 获取所有支持的语言
   */
  getSupportedLanguages(): CodegenLanguage[] {
    return Array.from(this.generators.keys());
  }

  /**
   * 获取语言的显示名称
   */
  getLanguageDisplayName(language: CodegenLanguage): string {
    const generator = this.generators.get(language);
    return generator ? generator.getLanguageName() : language;
  }

  /**
   * 检查是否支持指定语言
   */
  isLanguageSupported(language: CodegenLanguage): boolean {
    return this.generators.has(language);
  }

  /**
   * 生成文件名
   */
  private generateFilename(requestName: string, extension: string): string {
    const sanitizedName = requestName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    
    return `${sanitizedName || 'request'}.${extension}`;
  }

  /**
   * 注册自定义代码生成器
   */
  registerGenerator(language: CodegenLanguage, generator: BaseCodeGenerator): void {
    this.generators.set(language, generator);
  }

  /**
   * 移除代码生成器
   */
  unregisterGenerator(language: CodegenLanguage): boolean {
    return this.generators.delete(language);
  }
}

/**
 * 抽象基类，所有代码生成器都应该继承此类
 */
export abstract class AbstractCodeGenerator implements BaseCodeGenerator {
  abstract generate(request: HttpRequestModel, config?: CodegenConfig): string;
  abstract getFileExtension(): string;
  abstract getLanguageName(): string;

  /**
   * 构建URL（包含查询参数）
   */
  protected buildUrl(request: HttpRequestModel): string {
    const enabledParams = request.queryParams.filter(param => param.enabled);
    if (enabledParams.length === 0) {
      return request.url;
    }

    const url = new URL(request.url);
    enabledParams.forEach(param => {
      url.searchParams.append(param.key, param.value);
    });

    return url.toString();
  }

  /**
   * 获取启用的请求头
   */
  protected getEnabledHeaders(request: HttpRequestModel): Array<{key: string, value: string}> {
    return request.headers.filter(header => header.enabled && header.key);
  }

  /**
   * 转义字符串
   */
  protected escapeString(str: string, quote: string = '"'): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(new RegExp(quote, 'g'), `\\${quote}`)
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * 格式化JSON字符串
   */
  protected formatJson(jsonString: string, indent: number = 2): string {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, indent);
    } catch {
      return jsonString;
    }
  }

  /**
   * 生成缩进
   */
  protected indent(level: number, char: string = '  '): string {
    return char.repeat(level);
  }

  /**
   * 将字符串转换为驼峰命名
   */
  protected toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  /**
   * 将字符串转换为帕斯卡命名
   */
  protected toPascalCase(str: string): string {
    const camelCase = this.toCamelCase(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * 将字符串转换为蛇形命名
   */
  protected toSnakeCase(str: string): string {
    return str
      .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}

export default CodeGenerator;