const axios = require('axios');

async function testRegister() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('注册成功:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('注册失败:', error.response.status, error.response.data);
    } else {
      console.log('请求错误:', error.message);
    }
  }
}

testRegister();