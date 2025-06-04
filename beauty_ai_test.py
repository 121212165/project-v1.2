import os
from openai import OpenAI
import json

# 从环境变量获取API密钥和基础URL
API_KEY = os.environ.get("OPENAI_API_KEY", "8e28ff44-9e3e-4e88-911c-7e0485cf90d3")
BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

# 初始化OpenAI客户端
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

# 测试函数：文本分析
def test_text_analysis(text):
    print("\n----- 测试文本分析 -----")
    try:
        completion = client.chat.completions.create(
            model="deepseek-r1-250528",
            messages=[
                {"role": "system", "content": "你是一个专业的美妆内容分析助手，请分析以下内容是否符合美妆行业规范，检查是否有夸大效果、虚假宣传等问题。返回JSON格式，包含analysis(分析结果)和issues(发现的问题列表)字段。"},
                {"role": "user", "content": text},
            ],
        )
        print("响应内容:")
        print(completion.choices[0].message.content)
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

# 测试函数：图文分析（模拟，实际需要图片处理）
def test_image_text_analysis(image_description, text):
    print("\n----- 测试图文分析 -----")
    try:
        completion = client.chat.completions.create(
            model="deepseek-r1-250528",
            messages=[
                {"role": "system", "content": "你是一个专业的美妆内容分析助手，请分析以下图片描述和文本内容是否符合美妆行业规范，检查是否有夸大效果、虚假宣传等问题。返回JSON格式，包含analysis(分析结果)和issues(发现的问题列表)字段。"},
                {"role": "user", "content": f"图片描述: {image_description}\n\n文本内容: {text}"},
            ],
        )
        print("响应内容:")
        print(completion.choices[0].message.content)
        return True
    except Exception as e:
        print(f"错误: {e}")
        return False

# 测试函数：健康检查
def test_health_check():
    print("\n----- API健康检查 -----")
    try:
        completion = client.chat.completions.create(
            model="deepseek-r1-250528",
            messages=[
                {"role": "system", "content": "你是一个系统健康检查助手"},
                {"role": "user", "content": "请回复'API连接正常'来确认系统工作正常"},
            ],
        )
        response = completion.choices[0].message.content
        print(f"健康检查响应: {response}")
        return "API连接正常" in response
    except Exception as e:
        print(f"健康检查失败: {e}")
        return False

# 运行测试
def run_tests():
    print("开始美妆AI助手API测试...\n")
    
    # 测试1: API健康检查
    health_status = test_health_check()
    print(f"健康检查状态: {'✅ 通过' if health_status else '❌ 失败'}")
    
    # 测试2: 文本分析
    text_sample = "这款面霜使用一周，皱纹立刻减少80%，肌肤回到18岁状态，所有斑点都消失了！"
    text_status = test_text_analysis(text_sample)
    print(f"文本分析测试: {'✅ 通过' if text_status else '❌ 失败'}")
    
    # 测试3: 图文分析
    image_desc = "产品展示图，显示一款白色包装的面霜，标签上写着'神奇焕颜霜'"
    text_with_image = "这款神奇焕颜霜蕴含纳米黄金颗粒，能够渗透肌肤底层，激活细胞再生，一周内让你重返青春容颜！"
    image_text_status = test_image_text_analysis(image_desc, text_with_image)
    print(f"图文分析测试: {'✅ 通过' if image_text_status else '❌ 失败'}")
    
    # 总结
    print("\n测试总结:")
    print(f"API健康检查: {'✅ 通过' if health_status else '❌ 失败'}")
    print(f"文本分析功能: {'✅ 通过' if text_status else '❌ 失败'}")
    print(f"图文分析功能: {'✅ 通过' if image_text_status else '❌ 失败'}")
    
    if health_status and text_status and image_text_status:
        print("\n✅ 所有测试通过! DeepSeek API连接正常，可以继续进行项目重建。")
    else:
        print("\n❌ 部分测试失败，请检查API配置和连接。")

# 执行测试
if __name__ == "__main__":
    run_tests()