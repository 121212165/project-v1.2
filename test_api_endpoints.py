#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
核心API端点测试脚本
用于验证阶段一任务完成情况
"""

import requests
import json
import time
from typing import Dict, Any

# API基础配置
BASE_URL = "http://localhost:3000"
API_ENDPOINTS = {
    "health": "/api/analyze/health",
    "text_analysis": "/api/analyze/text",
    "image_text_analysis": "/api/analyze/image-text",
    "user_register": "/api/auth/register",
    "user_login": "/api/auth/login",
    "history": "/api/history"
}

def test_endpoint(endpoint_name: str, url: str, method: str = "GET", data: Dict[str, Any] = None, headers: Dict[str, str] = None) -> Dict[str, Any]:
    """
    测试单个API端点
    """
    full_url = f"{BASE_URL}{url}"
    
    try:
        start_time = time.time()
        
        if method.upper() == "GET":
            response = requests.get(full_url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(full_url, json=data, headers=headers, timeout=10)
        else:
            return {"error": f"不支持的HTTP方法: {method}"}
        
        response_time = round((time.time() - start_time) * 1000, 2)
        
        result = {
            "endpoint": endpoint_name,
            "url": full_url,
            "method": method,
            "status_code": response.status_code,
            "response_time_ms": response_time,
            "success": 200 <= response.status_code < 300
        }
        
        # 尝试解析JSON响应
        try:
            result["response_data"] = response.json()
        except:
            result["response_text"] = response.text[:200] + "..." if len(response.text) > 200 else response.text
        
        return result
        
    except requests.exceptions.RequestException as e:
        return {
            "endpoint": endpoint_name,
            "url": full_url,
            "method": method,
            "error": str(e),
            "success": False
        }

def test_core_apis():
    """
    测试核心API端点
    """
    print("\n" + "="*60)
    print("🔍 核心API端点测试开始")
    print("="*60)
    
    results = []
    auth_token = None
    
    # 1. 健康检查
    print("\n📊 测试健康检查端点...")
    health_result = test_endpoint("健康检查", API_ENDPOINTS["health"], "GET")
    results.append(health_result)
    print_result(health_result)
    
    # 2. 用户注册（测试数据）
    print("\n👤 测试用户注册端点...")
    register_data = {
        "username": f"testuser{int(time.time())}",
        "email": f"test{int(time.time())}@example.com",
        "password": "test123456"
    }
    register_result = test_endpoint("用户注册", API_ENDPOINTS["user_register"], "POST", register_data)
    results.append(register_result)
    print_result(register_result)
    
    # 3. 用户登录
    print("\n🔐 测试用户登录端点...")
    login_data = {
        "email": register_data["email"],
        "password": register_data["password"]
    }
    login_result = test_endpoint("用户登录", API_ENDPOINTS["user_login"], "POST", login_data)
    results.append(login_result)
    print_result(login_result)
    
    # 获取认证token
    if login_result.get("success") and "response_data" in login_result:
        response_data = login_result["response_data"]
        if "data" in response_data and "token" in response_data["data"]:
            auth_token = response_data["data"]["token"]
            print(f"    🔑 获取到认证token: {auth_token[:20]}...")
        elif "token" in response_data:
            auth_token = response_data["token"]
            print(f"    🔑 获取到认证token: {auth_token[:20]}...")
    
    # 4. 文本分析（需要认证）
    print("\n📝 测试文本分析端点...")
    text_data = {
        "text": "这是一个测试文本，用于验证美妆AI助手的文本分析功能。",
        "scenario": "beauty_content",
        "useCache": True
    }
    auth_headers = {"Authorization": f"Bearer {auth_token}"} if auth_token else {}
    text_result = test_endpoint("文本分析", API_ENDPOINTS["text_analysis"], "POST", text_data, auth_headers)
    results.append(text_result)
    print_result(text_result)
    
    # 5. 历史记录（需要认证）
    print("\n📚 测试历史记录端点...")
    history_result = test_endpoint("历史记录", API_ENDPOINTS["history"], "GET", headers=auth_headers)
    results.append(history_result)
    print_result(history_result)
    
    # 生成测试报告
    generate_report(results)
    
    return results

def print_result(result: Dict[str, Any]):
    """
    打印单个测试结果
    """
    status_icon = "✅" if result.get("success") else "❌"
    endpoint_name = result.get("endpoint", "未知")
    
    if "error" in result:
        print(f"  {status_icon} {endpoint_name}: 错误 - {result['error']}")
    else:
        status_code = result.get("status_code", "N/A")
        response_time = result.get("response_time_ms", "N/A")
        print(f"  {status_icon} {endpoint_name}: {status_code} - {response_time}ms")
        
        # 显示响应数据摘要
        if "response_data" in result:
            data = result["response_data"]
            if isinstance(data, dict):
                if "status" in data:
                    print(f"    状态: {data['status']}")
                if "message" in data:
                    print(f"    消息: {data['message']}")
                if "error" in data:
                    print(f"    错误详情: {data['error']}")
        elif "response_text" in result:
            print(f"    响应内容: {result['response_text']}")
        
        # 如果状态码不是2xx，显示为失败
        if not result.get("success"):
            print(f"    ⚠️  HTTP状态码 {status_code} 表示请求失败")

def generate_report(results: list):
    """
    生成测试报告
    """
    print("\n" + "="*60)
    print("📋 阶段一任务完成情况报告")
    print("="*60)
    
    successful_tests = [r for r in results if r.get("success")]
    total_tests = len(results)
    success_rate = (len(successful_tests) / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n📊 总体统计:")
    print(f"  测试总数: {total_tests}")
    print(f"  成功数量: {len(successful_tests)}")
    print(f"  成功率: {success_rate:.1f}%")
    
    print(f"\n📝 详细结果:")
    for result in results:
        status_icon = "✅" if result.get("success") else "❌"
        endpoint_name = result.get("endpoint", "未知")
        
        if "error" in result:
            print(f"  {status_icon} {endpoint_name}: 失败 - {result['error']}")
        else:
            status_code = result.get("status_code", "N/A")
            response_time = result.get("response_time_ms", "N/A")
            print(f"  {status_icon} {endpoint_name}: HTTP {status_code} ({response_time}ms)")
    
    # 阶段一任务检查清单
    print(f"\n✅ 阶段一任务完成情况:")
    
    # 1.1 后端API健康检查
    health_success = any(r.get("endpoint") == "健康检查" and r.get("success") for r in results)
    print(f"  {'✅' if health_success else '❌'} 1.1 后端API健康检查")
    print(f"    {'✅' if health_success else '❌'} 验证后端服务状态")
    print(f"    {'✅' if health_success else '❌'} 检查健康检查端点")
    
    # 1.2 核心API端点测试
    text_analysis_success = any(r.get("endpoint") == "文本分析" and r.get("success") for r in results)
    auth_success = any(r.get("endpoint") in ["用户注册", "用户登录"] and r.get("success") for r in results)
    history_success = any(r.get("endpoint") == "历史记录" and r.get("success") for r in results)
    
    print(f"  {'✅' if text_analysis_success else '❌'} 核心API端点测试")
    print(f"    {'✅' if text_analysis_success else '❌'} POST /api/analyze/text - 文本分析")
    print(f"    ⚠️  POST /api/analyze/image-text - 图文分析 (需要文件上传测试)")
    print(f"    {'✅' if auth_success else '❌'} POST /api/auth/* - 用户认证")
    print(f"    {'✅' if history_success else '❌'} GET /api/history - 历史记录")
    
    # 总结
    if success_rate >= 80:
        print(f"\n🎉 阶段一任务基本完成！API调用基础验证通过。")
    elif success_rate >= 60:
        print(f"\n⚠️  阶段一任务部分完成，还有一些问题需要解决。")
    else:
        print(f"\n❌ 阶段一任务需要更多工作，多个API端点存在问题。")

if __name__ == "__main__":
    test_core_apis()