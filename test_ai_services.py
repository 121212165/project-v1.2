#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI服务连接验证脚本
用于测试OpenRouter API和DeepSeek API的连接状态
"""

import os
import requests
import json
from typing import Dict, Any
from datetime import datetime

# 从.env文件读取配置
OPENROUTER_API_KEY = "8e28ff44-9e3e-4e88-911c-7e0485cf90d3"
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "8e28ff44-9e3e-4e88-911c-7e0485cf90d3")

def print_test_header(title: str):
    """打印测试标题"""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")

def print_result(test_name: str, success: bool, details: str = ""):
    """打印测试结果"""
    status = "✅ 通过" if success else "❌ 失败"
    print(f"{test_name}: {status}")
    if details:
        print(f"  详情: {details}")

def test_openrouter_api():
    """测试OpenRouter API连接"""
    print_test_header("OpenRouter API 测试")
    
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_openrouter_api_key_here":
        print_result("API密钥配置", False, "OpenRouter API密钥未配置")
        return False
    
    print_result("API密钥配置", True, f"密钥长度: {len(OPENROUTER_API_KEY)}")
    
    # 测试模型列表API
    try:
        response = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            models = response.json()
            model_count = len(models.get('data', []))
            print_result("模型列表获取", True, f"可用模型数量: {model_count}")
        else:
            print_result("模型列表获取", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result("模型列表获取", False, f"请求异常: {str(e)}")
        return False
    
    # 测试文本分析API
    try:
        test_payload = {
            "model": "deepseek/deepseek-r1",
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, please introduce yourself briefly."
                }
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://beauty-ai-assistant.com",
                "X-Title": "Beauty AI Assistant"
            },
            json=test_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            print_result("文本分析接口", True, f"响应内容: {content[:50]}...")
            return True
        else:
            print_result("文本分析接口", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result("文本分析接口", False, f"请求异常: {str(e)}")
        return False

def test_deepseek_api():
    """测试DeepSeek API连接"""
    print_test_header("DeepSeek API 测试")
    
    if not DEEPSEEK_API_KEY or DEEPSEEK_API_KEY == "your_deepseek_api_key_here":
        print_result("API密钥配置", False, "DeepSeek API密钥未配置")
        print("  提示: 请在.env文件中配置DEEPSEEK_API_KEY")
        print("  获取地址: https://platform.deepseek.com/api_keys")
        return False
    
    print_result("API密钥配置", True, f"密钥长度: {len(DEEPSEEK_API_KEY)}")
    
    # 测试DeepSeek聊天API
    try:
        test_payload = {
            "model": "deepseek-r1",
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, please introduce yourself briefly."
                }
            ],
            "max_tokens": 100,
            "temperature": 0.7
        }
        
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json"
            },
            json=test_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            print_result("对话功能测试", True, f"响应内容: {content[:50]}...")
            
            # 检查响应格式
            required_fields = ['id', 'object', 'created', 'model', 'choices']
            missing_fields = [field for field in required_fields if field not in result]
            
            if not missing_fields:
                print_result("响应格式检查", True, "符合OpenAI标准格式")
            else:
                print_result("响应格式检查", False, f"缺少字段: {missing_fields}")
            
            return True
        else:
            print_result("对话功能测试", False, f"HTTP {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_result("对话功能测试", False, f"请求异常: {str(e)}")
        return False

def test_api_limits():
    """测试API调用限制和计费信息"""
    print_test_header("API限制和计费检查")
    
    # 检查OpenRouter账户信息
    try:
        response = requests.get(
            "https://openrouter.ai/api/v1/auth/key",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            key_info = response.json()
            print_result("OpenRouter账户信息", True, f"密钥有效")
            
            # 显示账户详情
            if 'data' in key_info:
                data = key_info['data']
                if 'label' in data:
                    print(f"  密钥标签: {data['label']}")
                if 'usage' in data:
                    print(f"  使用情况: {data['usage']}")
                if 'limit' in data:
                    print(f"  限制: {data['limit']}")
        else:
            print_result("OpenRouter账户信息", False, f"HTTP {response.status_code}")
            
    except Exception as e:
        print_result("OpenRouter账户信息", False, f"请求异常: {str(e)}")
    
    # 提示计费信息
    print("\n💡 计费提醒:")
    print("  - OpenRouter按token使用量计费")
    print("  - DeepSeek有免费额度，超出后按使用量计费")
    print("  - 建议在生产环境中设置使用限制")

def main():
    """主函数"""
    print(f"AI服务连接验证 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 测试结果统计
    results = {
        'openrouter': False,
        'deepseek': False
    }
    
    # 执行测试
    results['openrouter'] = test_openrouter_api()
    results['deepseek'] = test_deepseek_api()
    test_api_limits()
    
    # 总结报告
    print_test_header("测试总结")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print(f"总测试项: {total_tests}")
    print(f"通过测试: {passed_tests}")
    print(f"失败测试: {total_tests - passed_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 所有AI服务连接正常！")
        print("✅ 可以继续进行项目开发")
    elif passed_tests > 0:
        print("\n⚠️  部分AI服务可用")
        print("🔧 请检查失败的服务配置")
    else:
        print("\n❌ 所有AI服务连接失败")
        print("🔧 请检查网络连接和API密钥配置")
    
    # 下一步建议
    print("\n📋 下一步建议:")
    if not results['openrouter']:
        print("  1. 检查OpenRouter API密钥是否有效")
        print("  2. 确认网络可以访问openrouter.ai")
    if not results['deepseek']:
        print("  3. 配置DeepSeek API密钥")
        print("  4. 测试DeepSeek API连接")
    if all(results.values()):
        print("  1. 开始集成AI服务到后端API")
        print("  2. 测试文本分析和图像识别功能")
        print("  3. 配置API调用限制和错误处理")

if __name__ == "__main__":
    main()