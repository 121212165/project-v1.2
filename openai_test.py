import os
from openai import OpenAI

# 从环境变量获取API密钥和基础URL
API_KEY = os.environ.get("OPENAI_API_KEY", "8e28ff44-9e3e-4e88-911c-7e0485cf90d3")
BASE_URL = "https://ark.cn-beijing.volces.com/api/v3"

# 初始化OpenAI客户端
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

# Non-streaming:
print("----- standard request -----")
completion = client.chat.completions.create(
    model="deepseek-r1-250528",  # your model endpoint ID
    messages=[
        {"role": "system", "content": "你是人工智能助手"},
        {"role": "user", "content": "常见的十字花科植物有哪些？"},
    ],
)
print(completion.choices[0].message.content)

# Streaming:
print("----- streaming request -----")
stream = client.chat.completions.create(
    model="deepseek-r1-250528",  # 添加了缺失的逗号
    messages=[
        {"role": "system", "content": "你是人工智能助手"},
        {"role": "user", "content": "常见的十字花科植物有哪些？"},
    ],
    stream=True
)

for chunk in stream:
    if not chunk.choices:
        continue
    print(chunk.choices[0].delta.content, end="")
print()