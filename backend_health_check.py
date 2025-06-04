import requests
import json
import time
from datetime import datetime

# 后端服务配置
BASE_URL = "http://localhost:3000"

# API端点列表
API_ENDPOINTS = {
    "health": "/api/analyze/health",
    "text_analysis": "/api/analyze/text",
    "image_text_analysis": "/api/analyze/image-text",
    "login": "/api/auth/login",
    "register": "/api/auth/register",
    "history": "/api/history"
}

def check_endpoint(endpoint_name, path, method="GET", data=None, headers=None):
    """检查单个API端点"""
    url = f"{BASE_URL}{path}"
    print(f"\n检查 {endpoint_name}: {method} {url}")
    
    try:
        start_time = time.time()
        
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        end_time = time.time()
        response_time = round((end_time - start_time) * 1000, 2)  # 毫秒
        
        print(f"状态码: {response.status_code}")
        print(f"响应时间: {response_time}ms")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                print(f"响应内容: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"响应内容: {response.text[:200]}...")
            return True, response_time
        else:
            print(f"错误响应: {response.text[:200]}...")
            return False, response_time
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败 - 服务器可能未启动")
        return False, 0
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
        return False, 0
    except Exception as e:
        print(f"❌ 请求异常: {e}")
        return False, 0

def check_backend_health():
    """检查后端服务健康状态"""
    print(f"开始后端健康检查 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"目标服务器: {BASE_URL}")
    print("=" * 60)
    
    results = {}
    total_response_time = 0
    successful_checks = 0
    
    # 1. 健康检查端点
    success, response_time = check_endpoint("健康检查", API_ENDPOINTS["health"])
    results["health"] = {"success": success, "response_time": response_time}
    if success:
        successful_checks += 1
        total_response_time += response_time
    
    # 2. 文本分析端点
    text_data = {
        "text": "这是一个测试文本，用于验证API功能",
        "scenario": "beauty_content",
        "useCache": True
    }
    success, response_time = check_endpoint(
        "文本分析", 
        API_ENDPOINTS["text_analysis"], 
        "POST", 
        text_data
    )
    results["text_analysis"] = {"success": success, "response_time": response_time}
    if success:
        successful_checks += 1
        total_response_time += response_time
    
    # 3. 用户注册端点（测试数据）
    register_data = {
        "username": "test_user",
        "email": "test@example.com",
        "password": "test123456"
    }
    success, response_time = check_endpoint(
        "用户注册", 
        API_ENDPOINTS["register"], 
        "POST", 
        register_data
    )
    results["register"] = {"success": success, "response_time": response_time}
    if success:
        successful_checks += 1
        total_response_time += response_time
    
    # 4. 用户登录端点（测试数据）
    login_data = {
        "email": "test@example.com",
        "password": "test123456"
    }
    success, response_time = check_endpoint(
        "用户登录", 
        API_ENDPOINTS["login"], 
        "POST", 
        login_data
    )
    results["login"] = {"success": success, "response_time": response_time}
    if success:
        successful_checks += 1
        total_response_time += response_time
    
    # 5. 历史记录端点
    success, response_time = check_endpoint("历史记录", API_ENDPOINTS["history"])
    results["history"] = {"success": success, "response_time": response_time}
    if success:
        successful_checks += 1
        total_response_time += response_time
    
    # 生成报告
    print("\n" + "=" * 60)
    print("健康检查报告")
    print("=" * 60)
    
    for endpoint, result in results.items():
        status = "✅ 正常" if result["success"] else "❌ 异常"
        response_time = f"{result['response_time']}ms" if result["response_time"] > 0 else "N/A"
        print(f"{endpoint:20} {status:10} {response_time:>10}")
    
    print("\n总体状态:")
    print(f"成功检查: {successful_checks}/{len(results)}")
    if successful_checks > 0:
        avg_response_time = round(total_response_time / successful_checks, 2)
        print(f"平均响应时间: {avg_response_time}ms")
    
    if successful_checks == len(results):
        print("\n✅ 后端服务完全正常，所有API端点都可访问！")
    elif successful_checks > 0:
        print(f"\n⚠️ 后端服务部分正常，{len(results) - successful_checks}个端点存在问题")
    else:
        print("\n❌ 后端服务异常，请检查服务器状态")
    
    return results

def check_all_services_status():
    """检查所有服务状态（通过API）"""
    print("\n" + "=" * 60)
    print("系统服务状态检查")
    print("=" * 60)
    
    # 通过健康检查API获取所有服务状态
    try:
        response = requests.get(f"{BASE_URL}/api/analyze/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            # 检查返回的数据结构
            if "data" in health_data and "services" in health_data["data"]:
                services = health_data["data"]["services"]
                overall_status = health_data["data"].get("status", "unknown")
                
                print(f"整体状态: {get_status_emoji(overall_status)} {overall_status.upper()}")
                print(f"系统运行时间: {health_data['data'].get('uptime', 'N/A')}秒")
                print(f"检查时间: {health_data['data'].get('timestamp', 'N/A')}")
                print("\n各服务详细状态:")
                
                for service_name, service_info in services.items():
                    status = service_info.get("status", "unknown")
                    response_time = service_info.get("responseTime", "N/A")
                    last_check = service_info.get("lastCheck", "N/A")
                    error = service_info.get("error")
                    
                    print(f"\n{service_name.upper()}:")
                    print(f"  状态: {get_status_emoji(status)} {status}")
                    print(f"  响应时间: {response_time}ms")
                    print(f"  最后检查: {last_check}")
                    
                    if error:
                        print(f"  ❌ 错误: {error}")
                    
                    if "details" in service_info:
                        details = service_info["details"]
                        print(f"  详细信息: {details}")
                        
            else:
                print("⚠️ 健康检查API返回数据格式异常")
                print(f"返回数据: {json.dumps(health_data, indent=2, ensure_ascii=False)}")
        else:
            print("❌ 无法获取服务状态")
    except Exception as e:
        print(f"❌ 服务状态检查失败: {e}")

def get_status_emoji(status):
    """根据状态返回对应的emoji"""
    status_map = {
        "healthy": "✅",
        "degraded": "⚠️",
        "unhealthy": "❌",
        "unknown": "❓"
    }
    return status_map.get(status, "❓")

# 主函数
if __name__ == "__main__":
    # 执行后端健康检查
    results = check_backend_health()
    
    # 执行所有服务状态检查
    check_all_services_status()
    
    print("\n" + "=" * 60)
    print("检查完成")
    print("=" * 60)