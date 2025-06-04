// API测试脚本
// 用于验证美妆AI助手后端API的基本功能

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// 测试配置
const tests = [
  {
    name: '基本API连接测试',
    method: 'GET',
    url: `${API_BASE_URL}`,
    expected: 200
  },
  {
    name: '文本分析API测试',
    method: 'POST',
    url: `${API_BASE_URL}/analyze/text`,
    data: {
      text: '这是一个测试文本，用于验证美妆内容分析功能。'
    },
    expected: 200
  },
  {
    name: '用户注册API测试',
    method: 'POST',
    url: `${API_BASE_URL}/auth/register`,
    data: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123'
    },
    expected: [200, 400] // 可能已存在用户
  }
];

// 执行测试
async function runTests() {
  console.log('🚀 开始API测试...\n');
  
  for (const test of tests) {
    try {
      console.log(`📋 测试: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        timeout: 10000
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = {
          'Content-Type': 'application/json'
        };
      }
      
      const response = await axios(config);
      
      const expectedCodes = Array.isArray(test.expected) ? test.expected : [test.expected];
      
      if (expectedCodes.includes(response.status)) {
        console.log(`✅ 成功: ${response.status} - ${response.statusText}`);
        if (response.data) {
          console.log(`📄 响应数据:`, JSON.stringify(response.data, null, 2));
        }
      } else {
        console.log(`❌ 失败: 期望状态码 ${test.expected}, 实际 ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ 错误: ${error.message}`);
      if (error.response) {
        console.log(`📄 错误响应:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }
  
  console.log('🏁 API测试完成');
}

// 运行测试
runTests().catch(console.error);