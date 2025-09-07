<template>
  <div class="login-container">
    <h2>{{ isLoginMode ? '登录' : '注册' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="username">用户名</label>
        <input
          type="text"
          id="username"
          v-model="username"
          placeholder="请输入用户名"
          required
        />
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input
          type="password"
          id="password"
          v-model="password"
          placeholder="请输入密码"
          required
        />
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '处理中...' : (isLoginMode ? '登录' : '注册') }}
      </button>
      <button type="button" @click="toggleMode">
        {{ isLoginMode ? '注册账户' : '返回登录' }}
      </button>
    </form>
    <div v-if="message" :class="messageType">{{ message }}</div>
  </div>
</template>

<script>
export default {
  name: "Login",
  data() {
    return {
      username: '',
      password: '',
      isLoginMode: true,
      isLoading: false,
      message: '',
      messageType: ''
    };
  },
  methods: {
    async handleSubmit() {
      if (this.isLoginMode) {
        await this.handleLogin();
      } else {
        await this.handleRegister();
      }
    },
    
    async handleLogin() {
      this.isLoading = true;
      this.message = '';
      
      try {
        const response = await fetch('http://localhost:3000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.username,  // 添加这一行
            password: this.password
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // 保存token到localStorage
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          this.message = '登录成功！';
          this.messageType = 'success';
          
          // 跳转到对话入口
          setTimeout(() => {
            this.$router.push({ name: 'Dialog' });
          }, 1000);
        } else {
          this.message = data.message;
          this.messageType = 'error';
        }
      } catch (error) {
        this.message = '网络错误，请稍后重试';
        this.messageType = 'error';
        console.error('登录错误:', error);
      }
      
      this.isLoading = false;
    },
    
    async handleRegister() {
      this.isLoading = true;
      this.message = '';
      
      try {
        const response = await fetch('http://localhost:3000/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          this.message = '注册成功！请登录';
          this.messageType = 'success';
          this.isLoginMode = true;
          this.username = '';
          this.password = '';
        } else {
          this.message = data.message;
          this.messageType = 'error';
        }
      } catch (error) {
        this.message = '网络错误，请稍后重试';
        this.messageType = 'error';
        console.error('注册错误:', error);
      }
      
      this.isLoading = false;
    },
    
    toggleMode() {
      this.isLoginMode = !this.isLoginMode;
      this.message = '';
      this.username = '';
      this.password = '';
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

h2 {
  text-align: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  background-color: #3a9b72;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.success {
  color: #4caf50;
  text-align: center;
  margin-top: 10px;
  padding: 8px;
  background-color: #e8f5e8;
  border-radius: 4px;
}

.error {
  color: #f44336;
  text-align: center;
  margin-top: 10px;
  padding: 8px;
  background-color: #ffeaea;
  border-radius: 4px;
}
</style>